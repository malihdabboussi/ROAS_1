import { RequestMethod } from '@nestjs/common'
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants'
import { describe, expect, it } from 'vitest'
import { ActiveCampaignModule } from '../../activecampaign.module'

type ControllerType = { name: string; prototype: Record<string, unknown> }

const METHOD_NAMES: Record<number, string> = {
  [RequestMethod.GET]: 'GET',
  [RequestMethod.POST]: 'POST',
  [RequestMethod.PUT]: 'PUT',
  [RequestMethod.DELETE]: 'DELETE',
  [RequestMethod.PATCH]: 'PATCH',
}

const EXPECTED_ACTIVE_CAMPAIGN_ROUTES = [
  'GET integrations/active-campaign/status -> status',
  'POST integrations/active-campaign/connect -> connect',
  'POST integrations/active-campaign/disconnect -> disconnect',
  'GET integrations/active-campaign/crm-import-contacts -> crmImportContacts',
  'GET integrations/active-campaign/contacts -> listContacts',
  'GET integrations/active-campaign/contacts/:id -> getContact',
  'POST integrations/active-campaign/contacts -> createContact',
  'PUT integrations/active-campaign/contacts/:id -> updateContact',
  'DELETE integrations/active-campaign/contacts/:id -> deleteContact',
  'POST integrations/active-campaign/contacts/sync -> syncContact',
  'GET integrations/active-campaign/contacts/:id/field-values -> getContactFieldValues',
  'GET integrations/active-campaign/contacts/:id/automations -> getContactAutomations',
  'GET integrations/active-campaign/contacts/:id/deals -> getContactDeals',
  'GET integrations/active-campaign/contacts/:id/score -> getContactScore',
  'POST integrations/active-campaign/contact-tags -> addContactTag',
  'DELETE integrations/active-campaign/contact-tags/:id -> removeContactTag',
  'POST integrations/active-campaign/contact-lists -> updateListStatus',
  'GET integrations/active-campaign/notes -> listNotes',
  'GET integrations/active-campaign/notes/:id -> getNote',
  'POST integrations/active-campaign/notes -> createNote',
  'PUT integrations/active-campaign/notes/:id -> updateNote',
  'DELETE integrations/active-campaign/notes/:id -> deleteNote',
  'GET integrations/active-campaign/tags -> listTags',
  'GET integrations/active-campaign/tags/:id -> getTag',
  'POST integrations/active-campaign/tags -> createTag',
  'PUT integrations/active-campaign/tags/:id -> updateTag',
  'DELETE integrations/active-campaign/tags/:id -> deleteTag',
  'GET integrations/active-campaign/lists -> listLists',
  'GET integrations/active-campaign/lists/:id -> getList',
  'POST integrations/active-campaign/lists -> createList',
  'PUT integrations/active-campaign/lists/:id -> updateList',
  'DELETE integrations/active-campaign/lists/:id -> deleteList',
  'GET integrations/active-campaign/deals -> listDeals',
  'GET integrations/active-campaign/deal-activities -> listDealActivities',
  'GET integrations/active-campaign/deals/:id -> getDeal',
  'POST integrations/active-campaign/deals -> createDeal',
  'PUT integrations/active-campaign/deals/:id -> updateDeal',
  'DELETE integrations/active-campaign/deals/:id -> deleteDeal',
  'POST integrations/active-campaign/deal-notes -> createDealNote',
  'PUT integrations/active-campaign/deal-notes/:id -> updateDealNote',
  'DELETE integrations/active-campaign/deal-notes/:id -> deleteDealNote',
  'GET integrations/active-campaign/pipelines -> listPipelines',
  'GET integrations/active-campaign/pipelines/:id -> getPipeline',
  'POST integrations/active-campaign/pipelines -> createPipeline',
  'DELETE integrations/active-campaign/pipelines/:id -> deletePipeline',
  'GET integrations/active-campaign/stages -> listStages',
  'GET integrations/active-campaign/stages/:id -> getStage',
  'POST integrations/active-campaign/stages -> createStage',
  'PUT integrations/active-campaign/stages/:id -> updateStage',
  'DELETE integrations/active-campaign/stages/:id -> deleteStage',
  'GET integrations/active-campaign/deal-custom-fields -> listDealCustomFields',
  'GET integrations/active-campaign/deal-custom-fields/:id -> getDealCustomField',
  'POST integrations/active-campaign/deal-custom-fields -> createDealCustomField',
  'PUT integrations/active-campaign/deal-custom-fields/:id -> updateDealCustomField',
  'DELETE integrations/active-campaign/deal-custom-fields/:id -> deleteDealCustomField',
  'GET integrations/active-campaign/accounts -> listAccounts',
  'GET integrations/active-campaign/accounts/:id -> getAccount',
  'POST integrations/active-campaign/accounts -> createAccount',
  'PUT integrations/active-campaign/accounts/:id -> updateAccount',
  'DELETE integrations/active-campaign/accounts/:id -> deleteAccount',
  'POST integrations/active-campaign/account-notes -> createAccountNote',
  'GET integrations/active-campaign/automations -> listAutomations',
  'POST integrations/active-campaign/contact-automations -> addContactToAutomation',
  'DELETE integrations/active-campaign/contact-automations/:id -> removeContactFromAutomation',
  'GET integrations/active-campaign/campaigns -> listCampaigns',
  'GET integrations/active-campaign/campaigns/:id -> getCampaign',
  'POST integrations/active-campaign/campaigns -> createCampaign',
  'PUT integrations/active-campaign/campaigns/:id -> updateCampaign',
  'GET integrations/active-campaign/campaigns/:id/links -> getCampaignLinks',
  'GET integrations/active-campaign/messages -> listMessages',
  'GET integrations/active-campaign/messages/:id -> getMessage',
  'POST integrations/active-campaign/messages -> createMessage',
  'PUT integrations/active-campaign/messages/:id -> updateMessage',
  'DELETE integrations/active-campaign/messages/:id -> deleteMessage',
  'GET integrations/active-campaign/fields -> listCustomFields',
  'GET integrations/active-campaign/fields/:id -> getCustomField',
  'POST integrations/active-campaign/fields -> createCustomField',
  'PUT integrations/active-campaign/fields/:id -> updateCustomField',
  'GET integrations/active-campaign/webhooks -> listWebhooks',
  'GET integrations/active-campaign/webhooks/:id -> getWebhook',
  'POST integrations/active-campaign/webhooks -> createWebhook',
  'PUT integrations/active-campaign/webhooks/:id -> updateWebhook',
  'DELETE integrations/active-campaign/webhooks/:id -> deleteWebhook',
  'GET integrations/active-campaign/tasks -> listTasks',
  'GET integrations/active-campaign/tasks/:id -> getTask',
  'POST integrations/active-campaign/tasks -> createTask',
  'PUT integrations/active-campaign/tasks/:id -> updateTask',
  'GET integrations/active-campaign/users -> listUsers',
  'GET integrations/active-campaign/users/:id -> getUser',
  'GET integrations/active-campaign/forms -> listForms',
  'GET integrations/active-campaign/forms/:id -> getForm',
  'GET integrations/active-campaign/segments -> listSegments',
  'GET integrations/active-campaign/segments/:id -> getSegment',
  'GET integrations/active-campaign/scores -> listScores',
  'GET integrations/active-campaign/scores/:id -> getScore',
  'GET integrations/active-campaign/saved-responses -> listSavedResponses',
  'GET integrations/active-campaign/saved-responses/:id -> getSavedResponse',
  'POST integrations/active-campaign/saved-responses -> createSavedResponse',
  'PUT integrations/active-campaign/saved-responses/:id -> updateSavedResponse',
  'DELETE integrations/active-campaign/saved-responses/:id -> deleteSavedResponse',
  'POST integrations/active-campaign/tracking/events -> trackEvent',
  'GET integrations/active-campaign/ecom-orders -> listOrders',
  'GET integrations/active-campaign/ecom-orders/:id -> getOrder',
  'POST integrations/active-campaign/ecom-orders -> createOrder',
  'PUT integrations/active-campaign/ecom-orders/:id -> updateOrder',
  'DELETE integrations/active-campaign/ecom-orders/:id -> deleteOrder',
  'GET integrations/active-campaign/ecom-customers -> listEcomCustomers',
  'GET integrations/active-campaign/addresses -> listAddresses',
  'POST integrations/active-campaign/addresses -> createAddress',
  'DELETE integrations/active-campaign/addresses/:id -> deleteAddress',
]

function asPath(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return null
}

function joinRoute(controllerPath: string, methodPath: string): string {
  return [controllerPath, methodPath]
    .map((part) => part.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/')
}

function collectRoutes(controllers: ControllerType[]): string[] {
  const expectedPaths = new Set(
    EXPECTED_ACTIVE_CAMPAIGN_ROUTES.map((route) => route.slice(0, route.indexOf(' -> '))),
  )

  return controllers.flatMap((controller) => {
    const controllerPath = asPath(Reflect.getMetadata(PATH_METADATA, controller))
    if (controllerPath === null) return []

    return Object.getOwnPropertyNames(controller.prototype)
      .filter((methodName) => methodName !== 'constructor')
      .map((methodName) => {
        const handler = controller.prototype[methodName]
        if (typeof handler !== 'function') return null

        const methodPath = asPath(Reflect.getMetadata(PATH_METADATA, handler))
        const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler)
        if (methodPath === null || requestMethod === undefined) return null

        const route = `${METHOD_NAMES[requestMethod]} ${joinRoute(controllerPath, methodPath)}`
        if (!expectedPaths.has(route)) return null
        return `${route} -> ${methodName}`
      })
      .filter((route): route is string => route !== null)
  })
}

describe('ActiveCampaign controller route order', () => {
  it('keeps the existing ActiveCampaign route inventory and order', () => {
    const controllers = Reflect.getMetadata('controllers', ActiveCampaignModule) as ControllerType[]

    expect(collectRoutes(controllers)).toEqual(EXPECTED_ACTIVE_CAMPAIGN_ROUTES)
  })
})
