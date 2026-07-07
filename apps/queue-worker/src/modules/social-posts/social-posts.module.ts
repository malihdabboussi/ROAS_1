import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import { SocialPostProcessor } from './processors/social-post.processor'
import { SocialPostScheduler } from './services/social-post.scheduler'
import { SocialPostService } from './services/social-post.service'
import { SOCIAL_POSTS_QUEUE } from './types'

@Module({
  imports: [
    BullModule.registerQueue({
      name: SOCIAL_POSTS_QUEUE,
    }),
  ],
  providers: [SocialPostProcessor, SocialPostService, SocialPostScheduler],
})
export class SocialPostsModule {}
