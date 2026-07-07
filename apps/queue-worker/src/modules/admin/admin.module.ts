import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import { BullModule, InjectQueue } from '@nestjs/bullmq'
import { Module, OnModuleInit } from '@nestjs/common'
import type { Queue } from 'bullmq'
import { BROADCAST_EMAILS_QUEUE } from '../broadcast-emails/types'
import { CRM_SYNC_QUEUE } from '../crm-sync/types/crm-sync.types'
import { SINGLE_EMAILS_QUEUE } from '../single-emails/types'
import { SOCIAL_POSTS_QUEUE } from '../social-posts/types'

@Module({
  imports: [
    BullModule.registerQueue({ name: SINGLE_EMAILS_QUEUE }),
    BullModule.registerQueue({ name: BROADCAST_EMAILS_QUEUE }),
    BullModule.registerQueue({ name: SOCIAL_POSTS_QUEUE }),
    BullModule.registerQueue({ name: CRM_SYNC_QUEUE }),
  ],
})
export class AdminModule implements OnModuleInit {
  private readonly serverAdapter = new ExpressAdapter()

  constructor(
    @InjectQueue(SINGLE_EMAILS_QUEUE) private readonly singleQueue: Queue,
    @InjectQueue(BROADCAST_EMAILS_QUEUE) private readonly broadcastQueue: Queue,
    @InjectQueue(SOCIAL_POSTS_QUEUE) private readonly socialPostsQueue: Queue,
    @InjectQueue(CRM_SYNC_QUEUE) private readonly crmSyncQueue: Queue,
  ) {
    this.serverAdapter.setBasePath('/admin/queues')
  }

  onModuleInit() {
    createBullBoard({
      queues: [
        new BullMQAdapter(this.singleQueue),
        new BullMQAdapter(this.broadcastQueue),
        new BullMQAdapter(this.socialPostsQueue),
        new BullMQAdapter(this.crmSyncQueue),
      ],
      serverAdapter: this.serverAdapter,
    })
  }

  getServerAdapter(): ExpressAdapter {
    return this.serverAdapter
  }
}
