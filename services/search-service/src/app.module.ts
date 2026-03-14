import { HttpExceptionFilter, TransformInterceptor } from '@grab/nestjs-common'
import { ClassSerializerInterceptor, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { TerminusModule } from '@nestjs/terminus'

import { AppController } from './app.controller'
import { AppService } from './app.service'
import { elasticsearchConfig } from './config/elasticsearch.config'
import { IndexingModule } from './indexing/indexing.module'
import { SearchModule } from './search/search.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [elasticsearchConfig],
    }),
    TerminusModule,
    SearchModule,
    IndexingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor },
  ],
})
export class AppModule {}
