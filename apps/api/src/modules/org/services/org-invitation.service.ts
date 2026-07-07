import { randomBytes } from 'crypto'
import { Inject, Injectable, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  LoggerService,
  resolveMachineProfileColumns,
  resolveMachineProfileRow,
  SupabaseServiceClient,
} from '@vibey/api-shared'
import { SendGridIntegration } from '../../email/integrations/sendgrid.integration'
import { MachinesService } from '../../machines/services/machines.service'
import { MissionAgentGatewayService } from '../../missions/services/gateways/mission-agent-gateway.service'
import type { InvitableRole } from '../dto'
import { OrgInvitationDeliveryRepository } from '../repositories/org-invitation-delivery.repository'
import { OrgRepository } from '../repositories/org.repository'

@Injectable()
export class OrgInvitationService {
  private readonly machineColumns = resolveMachineProfileColumns(process.env)

  constructor(
    private readonly repo: OrgRepository,
    private readonly logger: LoggerService,
    private readonly sendgrid: SendGridIntegration,
    private readonly configService: ConfigService,
    private readonly svc: SupabaseServiceClient,
    private readonly machinesService: MachinesService,
    @Optional()
    @Inject(MissionAgentGatewayService)
    private readonly gatewayService?: MissionAgentGatewayService,
    private readonly deliveryRepository: OrgInvitationDeliveryRepository = new OrgInvitationDeliveryRepository(),
  ) {}

  async inviteMember(
    supabase: SupabaseClient,
    orgId: string,
    email: string,
    role: InvitableRole,
    invitedBy: string,
  ) {
    const existingMember = await this.findExistingMemberByEmail(supabase, orgId, email)
    if (existingMember) {
      throw new Error('User is already a member of this organization')
    }

    const pendingInvitation = await this.repo.findPendingInvitationByEmail(supabase, orgId, email)
    if (pendingInvitation) {
      throw new Error('Pending invitation already exists for this email')
    }

    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    let invitation: Awaited<ReturnType<OrgRepository['createInvitation']>>
    try {
      invitation = await this.repo.createInvitation(
        supabase,
        orgId,
        email,
        role,
        invitedBy,
        token,
        expiresAt,
      )
    } catch (error) {
      if (this.isPendingInvitationUniqueViolation(error)) {
        throw new Error('Pending invitation already exists for this email')
      }

      await this.logger.logError({
        severity: 'error',
        feature: 'org/invite',
        error_code: 'DB_ERROR',
        message: 'Failed to create invitation',
        context: { error: error instanceof Error ? error.message : 'Unknown', orgId, email },
      })
      throw new Error('Failed to create invitation')
    }

    await this.sendInvitationEmail(orgId, email, role, token, invitedBy)

    void this.sendInAppNotification(orgId, email, role, token, invitedBy).catch(() => {})

    return invitation
  }

  async acceptInvitation(
    supabase: SupabaseClient,
    token: string,
    userId: string,
    userEmail: string,
  ) {
    const serviceClient = this.svc.client

    const invitation = await this.repo.findInvitationByToken(serviceClient, token)
    if (!invitation) throw new Error('Invitation not found or expired')

    if (new Date(invitation.expires_at) < new Date()) {
      await this.repo.updateInvitationStatus(serviceClient, invitation.id, 'expired')
      throw new Error('Invitation has expired')
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('Invitation email does not match your account')
    }

    const existingMember = await this.repo.findMember(serviceClient, invitation.org_id, userId)
    if (existingMember?.status === 'active') {
      throw new Error('You are already a member of this organization')
    }

    try {
      await this.repo.addMember(
        serviceClient,
        invitation.org_id,
        userId,
        invitation.role,
        invitation.invited_by,
      )
      await this.repo.updateInvitationStatus(serviceClient, invitation.id, 'accepted')

      this.gatewayService?.triggerFullSync(userId).catch(() => {})

      return { org_id: invitation.org_id, role: invitation.role }
    } catch (error) {
      await this.logger.logError({
        severity: 'error',
        feature: 'org/accept-invitation',
        error_code: 'DB_ERROR',
        message: 'Failed to accept invitation',
        context: { error: error instanceof Error ? error.message : 'Unknown', token, userId },
      })
      throw new Error('Failed to accept invitation')
    }
  }

  async acceptInvitationAndBootstrap(
    supabase: SupabaseClient,
    token: string,
    userId: string,
    userEmail: string,
  ) {
    const serviceClient = this.svc.client

    const invitation = await this.repo.findInvitationByToken(serviceClient, token)
    if (!invitation) throw new Error('Invitation not found or expired')

    if (new Date(invitation.expires_at) < new Date()) {
      await this.repo.updateInvitationStatus(serviceClient, invitation.id, 'expired')
      throw new Error('Invitation has expired')
    }

    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new Error('Invitation email does not match your account')
    }

    const existingMember = await this.repo.findMember(serviceClient, invitation.org_id, userId)
    if (existingMember?.status === 'active') {
      throw new Error('You are already a member of this organization')
    }

    try {
      const [profile, subscription] = await Promise.all([
        this.repo.findProfileBootstrapState(serviceClient, userId, this.machineColumns.machineId),
        this.repo.findActiveSubscription(serviceClient, userId),
      ])
      const machine = resolveMachineProfileRow(profile, this.machineColumns)
      const hasMachine =
        typeof machine.machineId === 'string' && machine.machineId.trim().length > 0
      const shouldMarkOrgOnly =
        profile?.onboarding_completed !== true && !hasMachine && !subscription

      await this.repo.addMember(
        serviceClient,
        invitation.org_id,
        userId,
        invitation.role,
        invitation.invited_by,
      )

      if (shouldMarkOrgOnly) {
        await this.repo.markProfileOrgOnly(serviceClient, userId, invitation.org_id)
      }

      await this.repo.ensureDefaultBrain(serviceClient, userId)

      await this.repo.updateInvitationStatus(serviceClient, invitation.id, 'accepted')

      this.gatewayService?.triggerFullSync(userId).catch(() => {})
      const requiresMachineSetup = invitation.role !== 'viewer'
      if (requiresMachineSetup) {
        void this.machinesService.provision(supabase, userId).catch((error) => {
          void this.logger.logError({
            severity: 'error',
            feature: 'org/accept-and-bootstrap',
            error_code: 'MACHINE_PROVISION_FAILED',
            message: 'Failed to provision machine after org invitation bootstrap',
            context: {
              error: error instanceof Error ? error.message : 'Unknown',
              token,
              userId,
              orgId: invitation.org_id,
            },
          })
        })
      }

      return {
        org_id: invitation.org_id,
        role: invitation.role,
        requires_machine_setup: requiresMachineSetup,
      }
    } catch (error) {
      await this.logger.logError({
        severity: 'error',
        feature: 'org/accept-and-bootstrap',
        error_code: 'DB_ERROR',
        message: 'Failed to accept invitation and bootstrap org-only user',
        context: { error: error instanceof Error ? error.message : 'Unknown', token, userId },
      })
      throw new Error('Failed to accept invitation')
    }
  }

  async revokeInvitation(supabase: SupabaseClient, invitationId: string) {
    await this.repo.updateInvitationStatus(supabase, invitationId, 'revoked')
  }

  async listInvitations(supabase: SupabaseClient, orgId: string) {
    return this.repo.listInvitations(supabase, orgId)
  }

  async getInvitationByToken(supabase: SupabaseClient, token: string) {
    return this.repo.findInvitationByToken(supabase, token)
  }

  async getInvitationByTokenFromServiceClient(token: string) {
    return this.repo.findInvitationByToken(this.svc.client, token)
  }

  async isOrgOnboarded(orgId: string): Promise<boolean> {
    return this.repo.hasVibeyCeoAgent(this.svc.client, orgId)
  }

  private async findExistingMemberByEmail(supabase: SupabaseClient, orgId: string, email: string) {
    const profile = await this.repo.findUserByEmail(supabase, email)
    if (!profile) return null
    return this.repo.findMember(supabase, orgId, profile.id)
  }

  private async sendInAppNotification(
    orgId: string,
    email: string,
    role: string,
    token: string,
    invitedBy: string,
  ) {
    try {
      const serviceClient = this.svc.client

      const profile = await this.repo.findUserByEmail(serviceClient, email)
      if (!profile) return

      const orgName =
        (await this.deliveryRepository.findOrgName(serviceClient, orgId)) ?? 'an organization'
      const inviterName =
        (await this.deliveryRepository.findInviterName(serviceClient, invitedBy)) ??
        'A team member'
      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)

      await this.deliveryRepository.insertInvitationNotification(serviceClient, {
        userId: profile.id,
        token,
        orgName,
        inviterName,
        roleLabel,
      })
    } catch (err) {
      void this.logger.logError({
        severity: 'warn',
        feature: 'org/invite-notification',
        error_code: 'NOTIFICATION_FAILED',
        message: 'Failed to send in-app org invitation notification',
        context: { orgId, email, error: err instanceof Error ? err.message : String(err) },
      })
    }
  }

  private isPendingInvitationUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false
    const record = error as { code?: unknown; message?: unknown }
    return (
      record.code === '23505' &&
      typeof record.message === 'string' &&
      record.message.includes('idx_org_invitations_pending_org_email_unique')
    )
  }

  private async sendInvitationEmail(
    orgId: string,
    email: string,
    role: string,
    token: string,
    invitedBy: string,
  ) {
    try {
      const serviceClient = this.svc.client

      const cfg = await this.deliveryRepository.findPlatformEmailConfig(serviceClient)

      if (!cfg?.sender_email || !cfg.sender_verified) {
        void this.logger.logError({
          severity: 'warn',
          feature: 'org/invite-email',
          error_code: 'EMAIL_NOT_CONFIGURED',
          message: 'Platform email not configured — invitation email not sent',
          context: { orgId, email },
        })
        return
      }

      const orgName =
        (await this.deliveryRepository.findOrgName(serviceClient, orgId)) ?? 'an organization'
      const inviterName =
        (await this.deliveryRepository.findInviterName(serviceClient, invitedBy)) ??
        'A team member'

      const appUrl = this.configService.get<string>('APP_URL') || ''
      const inviteUrl = appUrl ? `${appUrl.replace(/\/+$/, '')}/invite/${token}` : ''

      const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)
      const subject = `You've been invited to join ${orgName} on Vibey`
      const text = [
        `${inviterName} has invited you to join ${orgName} on Vibey as ${roleLabel}.`,
        '',
        inviteUrl
          ? `Accept your invitation: ${inviteUrl}`
          : 'Open the app to accept your invitation.',
        '',
        'This invitation expires in 7 days.',
        '',
        '— Vibey',
      ].join('\n')

      const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f4;padding:40px 0;">
<tr><td align="center">
<table role="presentation" width="560" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;">

<tr><td style="background-color:#059669;padding:36px 40px;text-align:center;">
  <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">You're Invited!</h1>
</td></tr>

<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#1f2937;">Hey there,</p>
  <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#1f2937;"><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Vibey as <strong>${roleLabel}</strong>.</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
    <tr><td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#059669;text-transform:uppercase;letter-spacing:0.5px;">Your Role</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:#1f2937;letter-spacing:1px;">${roleLabel}</p>
    </td></tr>
  </table>${
    inviteUrl
      ? `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
    <tr><td style="background-color:#059669;border-radius:8px;">
      <a href="${inviteUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Accept Invitation</a>
    </td></tr>
  </table>
  <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">If the button does not work, copy and paste this link into your browser:<br>
  <a href="${inviteUrl}" style="color:#059669;word-break:break-all;">${inviteUrl}</a></p>`
      : `
  <p style="margin:0;font-size:15px;line-height:1.6;color:#6b7280;">Open the app to accept your invitation.</p>`
  }
</td></tr>

<tr><td style="padding:0 40px 36px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr><td style="border-top:1px solid #e5e7eb;padding-top:24px;">
      <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#6b7280;">This invitation expires in 7 days.</p>
      <p style="margin:0;font-size:14px;color:#059669;font-weight:600;">Vibey</p>
    </td></tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

      await this.sendgrid.sendEmail({
        to: { email },
        from: { email: String(cfg.sender_email), name: String(cfg.sender_name || 'Vibey') },
        replyTo: cfg.reply_to_email
          ? { email: String(cfg.reply_to_email) }
          : { email: String(cfg.sender_email) },
        subject,
        text,
        html,
      })
    } catch (err) {
      void this.logger.logError({
        severity: 'warn',
        feature: 'org/invite-email',
        error_code: 'EMAIL_SEND_FAILED',
        message: 'Failed to send org invitation email — invitation still created',
        context: { orgId, email, error: err instanceof Error ? err.message : String(err) },
      })
    }
  }
}
