import * as crypto from 'crypto'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { AdminPlatformEmailBase } from './admin-service-platform-email.base'

export abstract class AdminInvitesBase extends AdminPlatformEmailBase {
  async getWaitlist() {
    const [entries, invites] = await Promise.all([
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('waitlist_entries')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to),
      ),
      this.adminFetchAllByRange(async (from, to) =>
        this.repository
          .serviceTable('waitlist_invites')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to),
      ),
    ])

    const mergedLatest = new Map<
      string,
      { sent_at: string | null; redeemed_at: string | null; redeemed_user_id: string | null }
    >()
    const byEntry = new Map<string, typeof invites>()
    for (const inv of invites ?? []) {
      const eid = (inv as { waitlist_entry_id: string }).waitlist_entry_id
      const list = byEntry.get(eid) ?? []
      list.push(inv)
      byEntry.set(eid, list)
    }
    for (const [eid, list] of byEntry) {
      const newest = list.reduce((a, b) =>
        String((a as { created_at: string }).created_at) >
        String((b as { created_at: string }).created_at)
          ? a
          : b,
      )
      mergedLatest.set(eid, {
        sent_at: (newest as { sent_at: string | null }).sent_at ?? null,
        redeemed_at: (newest as { redeemed_at: string | null }).redeemed_at ?? null,
        redeemed_user_id: (newest as { redeemed_user_id: string | null }).redeemed_user_id ?? null,
      })
    }

    const { count: machineCount, error: mcErr } = await this.repository
      .serviceTable('profiles')
      .select('id', { count: 'exact', head: true })
      .not(this.machineColumns.machineId, 'is', null)
    if (mcErr) throw mcErr

    const list = (entries ?? []).map((row: Record<string, unknown>) => {
      const id = String(row.id)
      const latest = mergedLatest.get(id)
      return {
        id,
        email: String(row.email),
        name: (row.name as string) ?? null,
        status: row.status as string,
        heard_from: (row.heard_from as string) ?? null,
        use_case: (row.use_case as string) ?? null,
        created_at: String(row.created_at),
        invited_at: (row.invited_at as string) ?? null,
        invite_sent_at: latest?.sent_at ?? null,
        invite_redeemed_at: latest?.redeemed_at ?? null,
        invite_redeemed_user_id: latest?.redeemed_user_id ?? null,
      }
    })

    const pending = list.filter((r) => r.status === 'pending').length
    const invited = list.filter((r) => r.status === 'invited').length
    const registered = list.filter((r) => r.status === 'registered').length

    return {
      metrics: {
        total: list.length,
        pending,
        invited,
        registered,
        provisionedMachines: machineCount ?? 0,
        machineCapacity: 500,
      },
      entries: list,
    }
  }

  async sendWaitlistInvite(entryId: string, adminUserId: string) {
    const secret = this.configService.get<string>('INVITE_CODE_SECRET')
    if (!secret) throw new BadRequestException('INVITE_CODE_SECRET is not configured')

    const { data: cfg } = await this.repository
      .serviceTable('platform_email_config')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (cfg?.sendgrid_sender_id && !cfg.sender_verified) {
      try {
        const sg = await this.sendgrid.getSenderIdentity(
          typeof cfg.sendgrid_sender_id === 'string'
            ? parseInt(cfg.sendgrid_sender_id, 10)
            : Number(cfg.sendgrid_sender_id),
        )
        if (sg.verified?.status) {
          await this.repository
            .serviceTable('platform_email_config')
            .update({ sender_verified: true })
            .eq('id', cfg.id)
          cfg.sender_verified = true
        }
      } catch {
        /* keep sender_verified false */
      }
    }

    if (!cfg?.sender_email || !cfg.sender_verified) {
      throw new BadRequestException(
        'Platform email sender not configured. Go to Email Settings in the admin dashboard to set up.',
      )
    }

    const { data: entry, error: entErr } = await this.repository
      .serviceTable('waitlist_entries')
      .select('*')
      .eq('id', entryId)
      .maybeSingle()
    if (entErr) throw entErr
    if (!entry) throw new NotFoundException('Waitlist entry not found')
    if (entry.status === 'declined') {
      throw new BadRequestException('Cannot invite a declined entry')
    }
    if (entry.status !== 'pending') {
      throw new BadRequestException('Invite can only be sent for pending entries')
    }

    const plainCode = crypto.randomBytes(16).toString('hex')
    const codeHash = crypto.createHmac('sha256', secret).update(plainCode).digest('hex')
    const emailNorm = String(entry.email).trim().toLowerCase()

    const { data: inserted, error: insErr } = await this.repository
      .serviceTable('waitlist_invites')
      .insert({
        waitlist_entry_id: entryId,
        email_normalized: emailNorm,
        code_hash: codeHash,
        sent_by: adminUserId,
      })
      .select('id')
      .single()
    if (insErr) throw insErr

    const appUrl = this.configService.get<string>('APP_URL') || ''
    const inviteUrl = appUrl
      ? `${appUrl.replace(/\/+$/, '')}/invite?${new URLSearchParams({ code: plainCode, email: emailNorm }).toString()}`
      : ''

    const recipientName = entry.name ? String(entry.name) : ''
    const greeting = recipientName ? `Hey ${recipientName},` : 'Hey there,'

    const subject = "You're in! Your Vibey invite code"
    const text = [
      greeting,
      '',
      "Great news — you've been approved to join Vibey!",
      '',
      `Your invite code: ${plainCode}`,
      '',
      inviteUrl
        ? `Click the link below to create your account and get started:\n${inviteUrl}`
        : 'Open the app and go to the invite page to create your account.',
      '',
      'P.S. Once you are in, I will take care of the rest. Looking forward to working with you.',
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
  <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">You're In!</h1>
</td></tr>

<tr><td style="padding:36px 40px;">
  <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#1f2937;">${greeting}</p>
  <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#1f2937;">Great news — you've been approved to join <strong>Vibey</strong>! Use the invite code below to create your account.</p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
    <tr><td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center;">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#059669;text-transform:uppercase;letter-spacing:0.5px;">Your Invite Code</p>
      <p style="margin:0;font-size:22px;font-weight:700;color:#1f2937;font-family:'Courier New',Courier,monospace;letter-spacing:1px;">${plainCode}</p>
    </td></tr>
  </table>${
    inviteUrl
      ? `
  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
    <tr><td style="background-color:#059669;border-radius:8px;">
      <a href="${inviteUrl}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Create Your Account</a>
    </td></tr>
  </table>
  <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#6b7280;">If the button does not work, copy and paste this link into your browser:<br>
  <a href="${inviteUrl}" style="color:#059669;word-break:break-all;">${inviteUrl}</a></p>`
      : `
  <p style="margin:0;font-size:15px;line-height:1.6;color:#6b7280;">Open the app and go to the invite page to create your account.</p>`
  }
</td></tr>

<tr><td style="padding:0 40px 36px;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr><td style="border-top:1px solid #e5e7eb;padding-top:24px;">
      <p style="margin:0 0 4px;font-size:14px;line-height:1.5;color:#6b7280;"><strong>P.S.</strong> Once you are in, I will take care of the rest. Looking forward to working with you.</p>
      <p style="margin:0;font-size:14px;color:#059669;font-weight:600;">Vibey</p>
    </td></tr>
  </table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

    try {
      await this.sendgrid.sendEmail({
        to: { email: emailNorm, name: entry.name ? String(entry.name) : undefined },
        from: { email: String(cfg.sender_email), name: String(cfg.sender_name || 'Vibey') },
        replyTo: cfg.reply_to_email
          ? { email: String(cfg.reply_to_email) }
          : { email: String(cfg.sender_email) },
        subject,
        text,
        html,
      })
    } catch (err) {
      await this.repository.serviceTable('waitlist_invites').delete().eq('id', inserted.id)
      const raw = err instanceof Error ? err.message : String(err)
      const m = raw.replace(/^SendGrid error:\s*/i, '').trim()
      throw new BadRequestException(m || raw)
    }

    const now = new Date().toISOString()
    await this.repository
      .serviceTable('waitlist_invites')
      .update({ sent_at: now })
      .eq('id', inserted.id)

    await this.repository
      .serviceTable('waitlist_entries')
      .update({ status: 'invited', invited_at: now })
      .eq('id', entryId)

    return { success: true as const, inviteId: inserted.id as string }
  }

  async listInviteCodes() {
    const { data, error } = await this.repository
      .serviceTable('direct_invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  async revokeInviteCode(id: string) {
    const { error } = await this.repository
      .serviceTable('direct_invite_codes')
      .update({ is_active: false })
      .eq('id', id)
    if (error) throw new BadRequestException(`Failed to revoke: ${error.message}`)
    return { success: true as const }
  }

  async deleteInviteCode(id: string) {
    const { error } = await this.repository
      .serviceTable('direct_invite_codes')
      .delete()
      .eq('id', id)
    if (error) throw new BadRequestException(`Failed to delete: ${error.message}`)
    return { success: true as const }
  }

  async createInviteCode(
    adminUserId: string,
    opts?: { label?: string; maxUses?: number; expiresInDays?: number },
  ): Promise<{ code: string; inviteUrl: string; expiresAt: string | null }> {
    const code = crypto.randomBytes(12).toString('base64url')
    const expiresAt = opts?.expiresInDays
      ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { error } = await this.repository.serviceTable('direct_invite_codes').insert({
      code,
      label: opts?.label?.trim() || null,
      created_by: adminUserId,
      max_uses: opts?.maxUses ?? null,
      expires_at: expiresAt,
    })
    if (error) throw new BadRequestException(`Failed to create invite code: ${error.message}`)

    const appUrl = this.configService.get<string>('APP_URL') || ''
    const inviteUrl = appUrl
      ? `${appUrl.replace(/\/+$/, '')}/join?code=${encodeURIComponent(code)}`
      : ''

    return { code, inviteUrl, expiresAt }
  }

  async getEnterpriseApplications() {
    const entries = await this.adminFetchAllByRange(async (from, to) =>
      this.repository
        .serviceTable('enterprise_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to),
    )

    const list = (entries ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      user_id: (row.user_id as string) ?? null,
      email: String(row.email),
      name: (row.name as string) ?? null,
      company_name: String(row.company_name),
      company_size: String(row.company_size),
      role_title: (row.role_title as string) ?? null,
      use_case: (row.use_case as string) ?? null,
      team_size: (row.team_size as string) ?? null,
      phone: (row.phone as string) ?? null,
      website: (row.website as string) ?? null,
      source: String(row.source),
      status: String(row.status),
      notes: (row.notes as string) ?? null,
      created_at: String(row.created_at),
    }))

    const pending = list.filter((r) => r.status === 'pending').length
    const contacted = list.filter((r) => r.status === 'contacted').length
    const approved = list.filter((r) => r.status === 'approved').length
    const declined = list.filter((r) => r.status === 'declined').length
    const fromApp = list.filter((r) => r.source === 'app').length
    const fromWebsite = list.filter((r) => r.source === 'website').length

    return {
      metrics: { total: list.length, pending, contacted, approved, declined, fromApp, fromWebsite },
      entries: list,
    }
  }

  async updateEnterpriseApplication(id: string, updates: { status?: string; notes?: string }) {
    const patch: Record<string, unknown> = {}
    if (updates.status) {
      const valid = ['pending', 'contacted', 'approved', 'declined']
      if (!valid.includes(updates.status)) throw new BadRequestException('Invalid status')
      patch.status = updates.status
    }
    if (updates.notes !== undefined) patch.notes = updates.notes

    if (Object.keys(patch).length === 0) throw new BadRequestException('No fields to update')

    const { error } = await this.repository
      .serviceTable('enterprise_applications')
      .update(patch)
      .eq('id', id)
    if (error) throw error

    return { success: true as const }
  }


}
