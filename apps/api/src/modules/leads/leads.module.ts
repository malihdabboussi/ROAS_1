import { forwardRef, Module } from '@nestjs/common'
import { EmailModule } from '../email/email.module'
import { SpacesModule } from '../spaces/spaces.module'
import { LeadContactActionsController } from './controllers/lead-contact-actions.controller'
import { LeadContactImportsController } from './controllers/lead-contact-imports.controller'
import { LeadContactTimelineController } from './controllers/lead-contact-timeline.controller'
import { LeadContactsController } from './controllers/lead-contacts.controller'
import { InternalContactsController } from './controllers/internal-contacts.controller'
import { LeadsCrmController } from './controllers/leads-crm.controller'
import { LeadsController } from './controllers/leads.controller'
import { ContactIdentifierRepository } from './repositories/contact-identifier.repository'
import { LeadEmailRepository } from './repositories/lead-email.repository'
import { LeadIngestionRepository } from './repositories/lead-ingestion.repository'
import { LeadsRuntimeRepository } from './repositories/leads-runtime.repository'
import { LeadsRepository } from './repositories/leads.repository'
import { ContactIdentifierService } from './services/contact-identifier.service'
import { LeadContactAutomationService } from './services/lead-contact-automation.service'
import { LeadEmailService } from './services/lead-email.service'
import { LeadIngestionService } from './services/lead-ingestion.service'
import { LeadsService } from './services/leads.service'

@Module({
  imports: [EmailModule, forwardRef(() => SpacesModule)],
  controllers: [
    LeadsCrmController,
    LeadContactImportsController,
    LeadContactsController,
    LeadContactTimelineController,
    LeadContactActionsController,
    LeadsController,
    InternalContactsController,
  ],
  providers: [
    LeadsService,
    LeadsRepository,
    ContactIdentifierRepository,
    LeadEmailRepository,
    LeadIngestionRepository,
    LeadsRuntimeRepository,
    ContactIdentifierService,
    LeadContactAutomationService,
    LeadEmailService,
    LeadIngestionService,
  ],
  exports: [
    LeadsService,
    LeadsRepository,
    ContactIdentifierRepository,
    LeadEmailRepository,
    LeadIngestionRepository,
    LeadsRuntimeRepository,
    ContactIdentifierService,
    LeadContactAutomationService,
    LeadEmailService,
    LeadIngestionService,
  ],
})
export class LeadsModule {}
