import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { WordpressMediaController } from './controllers/wordpress-media.controller'
import { WordpressPagesController } from './controllers/wordpress-pages.controller'
import { WordpressPostsController } from './controllers/wordpress-posts.controller'
import { WordpressTaxonomiesController } from './controllers/wordpress-taxonomies.controller'
import { WordpressController } from './controllers/wordpress.controller'
import { WordpressIntegration } from './integrations/wordpress.integration'
import { WordpressRepository } from './repositories/wordpress.repository'
import { WordpressService } from './services/wordpress.service'

@Module({
  imports: [ConfigModule],
  controllers: [
    WordpressController,
    WordpressPostsController,
    WordpressPagesController,
    WordpressMediaController,
    WordpressTaxonomiesController,
  ],
  providers: [WordpressIntegration, WordpressRepository, WordpressService],
  exports: [WordpressIntegration, WordpressRepository, WordpressService],
})
export class WordpressModule {}
