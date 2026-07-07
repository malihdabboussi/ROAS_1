import { BadRequestException, Injectable } from '@nestjs/common'

interface AcRequestOptions {
  apiUrl: string
  apiKey: string
}

@Injectable()
export class ActiveCampaignIntegration {
  private normalizeBase(apiUrl: string): string {
    return apiUrl.replace(/\/+$/, '')
  }

  private async request<T>(
    opts: AcRequestOptions,
    method: string,
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ): Promise<T> {
    const base = this.normalizeBase(opts.apiUrl)
    const url = new URL(`${base}/api/3${path}`)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== '') url.searchParams.set(k, v)
      }
    }

    const res = await fetch(url.toString(), {
      method,
      headers: {
        'Api-Token': opts.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new BadRequestException(`ActiveCampaign API ${method} ${path}: ${res.status} ${text}`)
    }

    if (res.status === 204) return {} as T
    return (await res.json()) as T
  }

  private get<T>(opts: AcRequestOptions, path: string, query?: Record<string, string>) {
    return this.request<T>(opts, 'GET', path, undefined, query)
  }

  private post<T>(opts: AcRequestOptions, path: string, body?: Record<string, unknown>) {
    return this.request<T>(opts, 'POST', path, body)
  }

  private put<T>(opts: AcRequestOptions, path: string, body?: Record<string, unknown>) {
    return this.request<T>(opts, 'PUT', path, body)
  }

  private patch<T>(opts: AcRequestOptions, path: string, body?: Record<string, unknown>) {
    return this.request<T>(opts, 'PATCH', path, body)
  }

  private del<T>(opts: AcRequestOptions, path: string) {
    return this.request<T>(opts, 'DELETE', path)
  }

  private wrapBody(key: string, body: Record<string, unknown>): Record<string, unknown> {
    const keys = Object.keys(body)
    if (keys.length === 1 && keys[0] === key) return body
    return { [key]: body }
  }

  // ── Contacts ──
  listContacts(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/contacts', query)
  }
  getContact(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/contacts/${id}`)
  }
  createContact(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/contacts', this.wrapBody('contact', body))
  }
  updateContact(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/contacts/${id}`, this.wrapBody('contact', body))
  }
  deleteContact(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/contacts/${id}`)
  }
  syncContact(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/contact/sync', this.wrapBody('contact', body))
  }
  getContactFieldValues(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/contacts/${id}/fieldValues`)
  }
  getContactAutomations(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/contacts/${id}/contactAutomations`)
  }
  getContactDeals(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/contacts/${id}/deals`)
  }
  getContactScore(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/contacts/${id}/scoreValues`)
  }

  // ── Contact Tags ──
  addContactTag(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/contactTags', this.wrapBody('contactTag', body))
  }
  removeContactTag(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/contactTags/${id}`)
  }

  // ── Contact Lists ──
  updateListStatus(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/contactLists', this.wrapBody('contactList', body))
  }

  // ── Notes ──
  listNotes(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/notes', query)
  }
  getNote(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/notes/${id}`)
  }
  createNote(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/notes', this.wrapBody('note', body))
  }
  updateNote(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/notes/${id}`, this.wrapBody('note', body))
  }
  deleteNote(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/notes/${id}`)
  }

  // ── Tags ──
  listTags(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/tags', query)
  }
  getTag(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/tags/${id}`)
  }
  createTag(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/tags', this.wrapBody('tag', body))
  }
  updateTag(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/tags/${id}`, this.wrapBody('tag', body))
  }
  deleteTag(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/tags/${id}`)
  }

  // ── Lists ──
  listLists(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/lists', query)
  }
  getList(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/lists/${id}`)
  }
  createList(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/lists', this.wrapBody('list', body))
  }
  updateList(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/lists/${id}`, this.wrapBody('list', body))
  }
  deleteList(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/lists/${id}`)
  }

  // ── Deals ──
  listDeals(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/deals', query)
  }
  getDeal(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/deals/${id}`)
  }
  createDeal(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/deals', this.wrapBody('deal', body))
  }
  updateDeal(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/deals/${id}`, this.wrapBody('deal', body))
  }
  deleteDeal(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/deals/${id}`)
  }
  listDealActivities(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/dealActivities', query)
  }

  // ── Deal Notes ──
  createDealNote(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/dealNotes', this.wrapBody('note', body))
  }
  updateDealNote(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/dealNotes/${id}`, this.wrapBody('note', body))
  }
  deleteDealNote(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/dealNotes/${id}`)
  }

  // ── Deal Pipelines (dealGroups) ──
  listPipelines(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/dealGroups', query)
  }
  getPipeline(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/dealGroups/${id}`)
  }
  createPipeline(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/dealGroups', this.wrapBody('dealGroup', body))
  }
  deletePipeline(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/dealGroups/${id}`)
  }

  // ── Deal Stages ──
  listStages(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/dealStages', query)
  }
  getStage(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/dealStages/${id}`)
  }
  createStage(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/dealStages', this.wrapBody('dealStage', body))
  }
  updateStage(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/dealStages/${id}`, this.wrapBody('dealStage', body))
  }
  deleteStage(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/dealStages/${id}`)
  }

  // ── Deal Custom Fields ──
  listDealCustomFields(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/dealCustomFieldMeta', query)
  }
  getDealCustomField(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/dealCustomFieldMeta/${id}`)
  }
  createDealCustomField(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/dealCustomFieldMeta', this.wrapBody('dealCustomFieldMetum', body))
  }
  updateDealCustomField(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/dealCustomFieldMeta/${id}`, this.wrapBody('dealCustomFieldMetum', body))
  }
  deleteDealCustomField(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/dealCustomFieldMeta/${id}`)
  }

  // ── Accounts ──
  listAccounts(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/accounts', query)
  }
  getAccount(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/accounts/${id}`)
  }
  createAccount(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/accounts', this.wrapBody('account', body))
  }
  updateAccount(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/accounts/${id}`, this.wrapBody('account', body))
  }
  deleteAccount(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/accounts/${id}`)
  }
  createAccountNote(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/accountNotes', this.wrapBody('note', body))
  }

  // ── Automations ──
  listAutomations(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/automations', query)
  }
  addContactToAutomation(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/contactAutomations', this.wrapBody('contactAutomation', body))
  }
  removeContactFromAutomation(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/contactAutomations/${id}`)
  }

  // ── Campaigns ──
  listCampaigns(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/campaigns', query)
  }
  getCampaign(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/campaigns/${id}`)
  }
  createCampaign(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/campaign', this.wrapBody('campaign', body))
  }
  updateCampaign(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/campaigns/${id}/edit`, this.wrapBody('campaign', body))
  }
  getCampaignLinks(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/campaigns/${id}/links`)
  }

  // ── Messages ──
  listMessages(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/messages', query)
  }
  getMessage(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/messages/${id}`)
  }
  createMessage(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/messages', this.wrapBody('message', body))
  }
  updateMessage(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/messages/${id}`, this.wrapBody('message', body))
  }
  deleteMessage(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/messages/${id}`)
  }

  // ── Custom Fields (contact-level) ──
  listCustomFields(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/fields', query)
  }
  getCustomField(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/fields/${id}`)
  }
  createCustomField(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/fields', this.wrapBody('field', body))
  }
  updateCustomField(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/fields/${id}`, this.wrapBody('field', body))
  }

  // ── Webhooks ──
  listWebhooks(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/webhooks', query)
  }
  getWebhook(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/webhooks/${id}`)
  }
  createWebhook(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/webhooks', this.wrapBody('webhook', body))
  }
  updateWebhook(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/webhooks/${id}`, this.wrapBody('webhook', body))
  }
  deleteWebhook(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/webhooks/${id}`)
  }

  // ── Tasks (deal tasks) ──
  listTasks(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/dealTasks', query)
  }
  getTask(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/dealTasks/${id}`)
  }
  createTask(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/dealTasks', this.wrapBody('dealTask', body))
  }
  updateTask(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/dealTasks/${id}`, this.wrapBody('dealTask', body))
  }

  // ── Users ──
  listUsers(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/users', query)
  }
  getUser(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/users/${id}`)
  }
  getCurrentUser(opts: AcRequestOptions) {
    return this.get(opts, '/users/me')
  }

  // ── Forms ──
  listForms(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/forms', query)
  }
  getForm(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/forms/${id}`)
  }

  // ── Segments ──
  listSegments(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/segments', query)
  }
  getSegment(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/segments/${id}`)
  }

  // ── Scores ──
  listScores(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/scores', query)
  }
  getScore(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/scores/${id}`)
  }

  // ── Saved Responses ──
  listSavedResponses(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/savedResponses', query)
  }
  getSavedResponse(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/savedResponses/${id}`)
  }
  createSavedResponse(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/savedResponses', this.wrapBody('savedResponse', body))
  }
  updateSavedResponse(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/savedResponses/${id}`, this.wrapBody('savedResponse', body))
  }
  deleteSavedResponse(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/savedResponses/${id}`)
  }

  // ── Tracking Events ──
  trackEvent(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/tracking/log', this.wrapBody('event', body))
  }

  // ── E-Commerce ──
  listOrders(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/ecomOrders', query)
  }
  getOrder(opts: AcRequestOptions, id: string) {
    return this.get(opts, `/ecomOrders/${id}`)
  }
  createOrder(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/ecomOrders', this.wrapBody('ecomOrder', body))
  }
  updateOrder(opts: AcRequestOptions, id: string, body: Record<string, unknown>) {
    return this.put(opts, `/ecomOrders/${id}`, this.wrapBody('ecomOrder', body))
  }
  deleteOrder(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/ecomOrders/${id}`)
  }
  listEcomCustomers(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/ecomCustomers', query)
  }

  // ── Addresses ──
  listAddresses(opts: AcRequestOptions, query?: Record<string, string>) {
    return this.get(opts, '/addresses', query)
  }
  createAddress(opts: AcRequestOptions, body: Record<string, unknown>) {
    return this.post(opts, '/addresses', this.wrapBody('address', body))
  }
  deleteAddress(opts: AcRequestOptions, id: string) {
    return this.del(opts, `/addresses/${id}`)
  }
}
