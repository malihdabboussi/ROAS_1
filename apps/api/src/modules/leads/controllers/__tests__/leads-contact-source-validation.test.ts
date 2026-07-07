import { BadRequestException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'
import { LeadContactImportsController } from '../lead-contact-imports.controller'
import { LeadContactsController } from '../lead-contacts.controller'

const user = { id: 'user-1' }
const scope = { orgId: 'org-1' } as never

function createController() {
  const leadsService = {
    importContactsBatch: vi.fn().mockResolvedValue({ imported: 1, skipped: 0, contact_ids: [] }),
    createUserContact: vi.fn().mockResolvedValue({ id: 'contact-1' }),
    updateContact: vi.fn().mockResolvedValue({ id: 'contact-1' }),
  }
  const importsController = new LeadContactImportsController(leadsService as never)
  const contactsController = new LeadContactsController(leadsService as never)
  return { contactsController, importsController, leadsService }
}

describe('LeadsController contact_source enum validation', () => {
  it('rejects import-batch rows with a legacy contact_source value', async () => {
    const { importsController } = createController()

    await expect(
      importsController.importContactsBatch({} as never, user, scope, {
        contacts: [{ email: 'a@x.com', contact_source: 'CSV Import' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('accepts import-batch rows with a canonical channel + detail', async () => {
    const { importsController, leadsService } = createController()

    await importsController.importContactsBatch({} as never, user, scope, {
      contacts: [{ email: 'a@x.com', contact_source: 'import', contact_source_detail: 'csv' }],
    })

    expect(leadsService.importContactsBatch).toHaveBeenCalledWith(
      expect.anything(),
      'user-1',
      [
        expect.objectContaining({
          email: 'a@x.com',
          contact_source: 'import',
          contact_source_detail: 'csv',
        }),
      ],
      'org-1',
    )
  })

  it('rejects a contact update with a non-enum contact_source', async () => {
    const { contactsController } = createController()

    await expect(
      contactsController.updateContact({} as never, user, scope, 'contact-1', {
        contact_source: 'CSV Import',
      }),
    ).rejects.toBeInstanceOf(BadRequestException)
  })

  it('accepts a contact update with a canonical contact_source', async () => {
    const { contactsController, leadsService } = createController()

    await contactsController.updateContact({} as never, user, scope, 'contact-1', {
      contact_source: 'import',
    })

    expect(leadsService.updateContact).toHaveBeenCalledWith(
      expect.anything(),
      'contact-1',
      expect.objectContaining({ contact_source: 'import' }),
      'org-1',
      'user-1',
    )
  })
})
