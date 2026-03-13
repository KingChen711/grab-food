import { Module } from '@nestjs/common'

import { SearchModule } from '../search/search.module'
import { IndexingService } from './indexing.service'
import { KafkaConsumerService } from './kafka-consumer.service'

@Module({
  imports: [SearchModule],
  providers: [IndexingService, KafkaConsumerService],
})
export class IndexingModule {}
