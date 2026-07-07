import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { IntegrationConnectionsRepository } from '../../repositories/integration-connections.repository'
import { VaultService } from '../../../vault/services/vault.service'
import { ActiveCampaignIntegration } from '../integrations/activecampaign.integration'

const PROVIDER = 'active_campaign'
const LABEL_API_URL = 'api_url'
const LABEL_API_KEY = 'api_key'

@Injectable()
export class ActiveCampaignApiService {
  private readonly logger = new Logger(ActiveCampaignApiService.name)

  constructor(
    private readonly ac: ActiveCampaignIntegration,
    private readonly vault: VaultService,
    private readonly connections: IntegrationConnectionsRepository,
  ) {}

  private async getCreds(userId: string) {
    const [apiUrl, apiKey] = await Promise.all([
      this.vault.getSecret(userId, PROVIDER, LABEL_API_URL),
      this.vault.getSecret(userId, PROVIDER, LABEL_API_KEY),
    ])
    if (!apiUrl || !apiKey) throw new BadRequestException('ActiveCampaign is not connected')
    return { apiUrl, apiKey }
  }

  async connect(userId: string, apiUrl: string, apiKey: string) {
    const user = await this.ac.getCurrentUser({ apiUrl, apiKey })

    await Promise.all([
      this.vault.storeSecret(userId, PROVIDER, LABEL_API_URL, apiUrl, 'custom', {}),
      this.vault.storeSecret(userId, PROVIDER, LABEL_API_KEY, apiKey, 'api_key', {}),
    ])

    const now = new Date().toISOString()
    const rowData = {
      user_id: userId,
      integration_id: PROVIDER,
      provider: PROVIDER,
      status: 'connected',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_at: now,
      error_message: null,
      metadata: {},
      updated_at: now,
    }

    await this.connections.upsertConnection(PROVIDER, userId, rowData)

    return { user }
  }

  async disconnect(userId: string) {
    await Promise.all([
      this.vault.deleteSecret(userId, PROVIDER, LABEL_API_URL),
      this.vault.deleteSecret(userId, PROVIDER, LABEL_API_KEY),
    ])

    await this.connections.markPersonalDisconnected(PROVIDER, userId)
  }

  async getStatus(userId: string) {
    const hasUrl = await this.vault.hasSecret(userId, PROVIDER, LABEL_API_URL)
    const hasKey = await this.vault.hasSecret(userId, PROVIDER, LABEL_API_KEY)
    if (!hasUrl || !hasKey) return { connected: false, status: null }

    const data = await this.connections.getSimpleStatus(PROVIDER, userId)

    return {
      connected: data?.status === 'connected',
      status: (data?.status as string) ?? null,
      connectedAt: (data?.connected_at as string) ?? null,
    }
  }

  /**
   * Paginated contacts for CRM / Studio import UI (limit-offset; never loads whole account in one response).
   */
  async listContactsForStudio(
    userId: string,
    opts: { limit?: string; offset?: string; search?: string },
  ): Promise<{
    contacts: Array<{
      id: string
      email: string
      firstName: string
      lastName: string
      phone: string
    }>
    total: number
    limit: number
    offset: number
  }> {
    const creds = await this.getCreds(userId)
    const limit = Math.min(Math.max(parseInt(opts.limit || '100', 10) || 100, 1), 100)
    const offset = Math.max(parseInt(opts.offset || '0', 10) || 0, 0)
    const q: Record<string, string> = {
      limit: String(limit),
      offset: String(offset),
    }
    const s = opts.search?.trim()
    if (s) q.search = s

    const data = (await this.ac.listContacts(creds, q)) as {
      contacts?: Array<Record<string, unknown>>
      meta?: { total?: string | number }
    }
    const raw = data.contacts ?? []
    const metaTotal = data.meta?.total
    const total =
      typeof metaTotal === 'number'
        ? metaTotal
        : parseInt(String(metaTotal ?? ''), 10) || offset + raw.length

    const contacts = raw
      .map((c) => ({
        id: String(c.id ?? ''),
        email: typeof c.email === 'string' ? c.email : '',
        firstName: typeof c.firstName === 'string' ? c.firstName : '',
        lastName: typeof c.lastName === 'string' ? c.lastName : '',
        phone: typeof c.phone === 'string' ? c.phone : '',
      }))
      .filter((c) => c.id.length > 0)

    return { contacts, total, limit, offset }
  }

  // ── Contacts ──
  listContacts(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listContacts(c, query))
  }
  getContact(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getContact(c, id))
  }
  createContact(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createContact(c, body))
  }
  updateContact(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateContact(c, id, body))
  }
  deleteContact(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteContact(c, id))
  }
  syncContact(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.syncContact(c, body))
  }
  getContactFieldValues(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getContactFieldValues(c, id))
  }
  getContactAutomations(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getContactAutomations(c, id))
  }
  getContactDeals(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getContactDeals(c, id))
  }
  getContactScore(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getContactScore(c, id))
  }

  // ── Contact Tags ──
  addContactTag(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.addContactTag(c, body))
  }
  removeContactTag(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.removeContactTag(c, id))
  }

  // ── Contact Lists ──
  updateListStatus(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateListStatus(c, body))
  }

  // ── Notes ──
  listNotes(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listNotes(c, query))
  }
  getNote(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getNote(c, id))
  }
  createNote(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createNote(c, body))
  }
  updateNote(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateNote(c, id, body))
  }
  deleteNote(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteNote(c, id))
  }

  // ── Tags ──
  listTags(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listTags(c, query))
  }
  getTag(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getTag(c, id))
  }
  createTag(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createTag(c, body))
  }
  updateTag(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateTag(c, id, body))
  }
  deleteTag(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteTag(c, id))
  }

  // ── Lists ──
  listLists(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listLists(c, query))
  }
  getList(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getList(c, id))
  }
  createList(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createList(c, body))
  }
  updateList(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateList(c, id, body))
  }
  deleteList(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteList(c, id))
  }

  // ── Deals ──
  listDeals(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listDeals(c, query))
  }
  getDeal(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getDeal(c, id))
  }
  createDeal(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createDeal(c, body))
  }
  updateDeal(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateDeal(c, id, body))
  }
  deleteDeal(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteDeal(c, id))
  }
  listDealActivities(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listDealActivities(c, query))
  }

  // ── Deal Notes ──
  createDealNote(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createDealNote(c, body))
  }
  updateDealNote(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateDealNote(c, id, body))
  }
  deleteDealNote(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteDealNote(c, id))
  }

  // ── Deal Pipelines ──
  listPipelines(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listPipelines(c, query))
  }
  getPipeline(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getPipeline(c, id))
  }
  createPipeline(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createPipeline(c, body))
  }
  deletePipeline(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deletePipeline(c, id))
  }

  // ── Deal Stages ──
  listStages(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listStages(c, query))
  }
  getStage(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getStage(c, id))
  }
  createStage(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createStage(c, body))
  }
  updateStage(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateStage(c, id, body))
  }
  deleteStage(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteStage(c, id))
  }

  // ── Deal Custom Fields ──
  listDealCustomFields(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listDealCustomFields(c, query))
  }
  getDealCustomField(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getDealCustomField(c, id))
  }
  createDealCustomField(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createDealCustomField(c, body))
  }
  updateDealCustomField(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateDealCustomField(c, id, body))
  }
  deleteDealCustomField(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteDealCustomField(c, id))
  }

  // ── Accounts ──
  listAccounts(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listAccounts(c, query))
  }
  getAccount(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getAccount(c, id))
  }
  createAccount(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createAccount(c, body))
  }
  updateAccount(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateAccount(c, id, body))
  }
  deleteAccount(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteAccount(c, id))
  }
  createAccountNote(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createAccountNote(c, body))
  }

  // ── Automations ──
  listAutomations(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listAutomations(c, query))
  }
  addContactToAutomation(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.addContactToAutomation(c, body))
  }
  removeContactFromAutomation(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.removeContactFromAutomation(c, id))
  }

  // ── Campaigns ──
  listCampaigns(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listCampaigns(c, query))
  }
  getCampaign(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getCampaign(c, id))
  }
  createCampaign(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createCampaign(c, body))
  }
  updateCampaign(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateCampaign(c, id, body))
  }
  getCampaignLinks(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getCampaignLinks(c, id))
  }

  // ── Messages ──
  listMessages(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listMessages(c, query))
  }
  getMessage(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getMessage(c, id))
  }
  createMessage(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createMessage(c, body))
  }
  updateMessage(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateMessage(c, id, body))
  }
  deleteMessage(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteMessage(c, id))
  }

  // ── Custom Fields ──
  listCustomFields(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listCustomFields(c, query))
  }
  getCustomField(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getCustomField(c, id))
  }
  createCustomField(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createCustomField(c, body))
  }
  updateCustomField(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateCustomField(c, id, body))
  }

  // ── Webhooks ──
  listWebhooks(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listWebhooks(c, query))
  }
  getWebhook(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getWebhook(c, id))
  }
  createWebhook(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createWebhook(c, body))
  }
  updateWebhook(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateWebhook(c, id, body))
  }
  deleteWebhook(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteWebhook(c, id))
  }

  // ── Tasks ──
  listTasks(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listTasks(c, query))
  }
  getTask(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getTask(c, id))
  }
  createTask(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createTask(c, body))
  }
  updateTask(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateTask(c, id, body))
  }

  // ── Users ──
  listUsers(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listUsers(c, query))
  }
  getUser(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getUser(c, id))
  }

  // ── Forms ──
  listForms(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listForms(c, query))
  }
  getForm(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getForm(c, id))
  }

  // ── Segments ──
  listSegments(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listSegments(c, query))
  }
  getSegment(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getSegment(c, id))
  }

  // ── Scores ──
  listScores(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listScores(c, query))
  }
  getScore(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getScore(c, id))
  }

  // ── Saved Responses ──
  listSavedResponses(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listSavedResponses(c, query))
  }
  getSavedResponse(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getSavedResponse(c, id))
  }
  createSavedResponse(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createSavedResponse(c, body))
  }
  updateSavedResponse(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateSavedResponse(c, id, body))
  }
  deleteSavedResponse(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteSavedResponse(c, id))
  }

  // ── Tracking Events ──
  trackEvent(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.trackEvent(c, body))
  }

  // ── E-Commerce ──
  listOrders(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listOrders(c, query))
  }
  getOrder(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.getOrder(c, id))
  }
  createOrder(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createOrder(c, body))
  }
  updateOrder(userId: string, id: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.updateOrder(c, id, body))
  }
  deleteOrder(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteOrder(c, id))
  }
  listEcomCustomers(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listEcomCustomers(c, query))
  }

  // ── Addresses ──
  listAddresses(userId: string, query?: Record<string, string>) {
    return this.getCreds(userId).then((c) => this.ac.listAddresses(c, query))
  }
  createAddress(userId: string, body: Record<string, unknown>) {
    return this.getCreds(userId).then((c) => this.ac.createAddress(c, body))
  }
  deleteAddress(userId: string, id: string) {
    return this.getCreds(userId).then((c) => this.ac.deleteAddress(c, id))
  }
}
