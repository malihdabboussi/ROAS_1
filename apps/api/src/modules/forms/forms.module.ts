import { Module } from '@nestjs/common'
import { VercelIntegration } from '../domains/integrations/vercel.integration'
import { LeadsModule } from '../leads/leads.module'
import { SpacesModule } from '../spaces/spaces.module'
import { FormsController } from './controllers/forms.controller'
import { PublicFormsController } from './controllers/public-forms.controller'
import { FormResponsesRepository } from './repositories/form-responses.repository'
import { FormsRuntimeRepository } from './repositories/forms-runtime.repository'
import { FormsRepository } from './repositories/forms.repository'
import { FormContactAnswerService } from './services/form-contact-answer.service'
import { FormsService } from './services/forms.service'

@Module({
  imports: [SpacesModule, LeadsModule],
  controllers: [FormsController, PublicFormsController],
  providers: [
    FormsService,
    FormContactAnswerService,
    FormsRepository,
    FormsRuntimeRepository,
    FormResponsesRepository,
    VercelIntegration,
  ],
  exports: [FormsService, FormsRepository, FormsRuntimeRepository, FormResponsesRepository],
})
export class FormsModule {}
