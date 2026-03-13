import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { type Consumer, Kafka } from 'kafkajs'

import { IndexingService, type MenuItemDocument, type RestaurantDocument } from './indexing.service'

/** Topics produced by restaurant-service that we index */
const TOPICS = ['restaurant.events', 'search.indexing']

/** Event types we handle */
type SearchEvent =
  | {
      type: 'restaurant.created' | 'restaurant.updated' | 'restaurant.approved'
      payload: RestaurantDocument
    }
  | { type: 'restaurant.deleted'; payload: { id: string } }
  | { type: 'menu_item.created' | 'menu_item.updated'; payload: MenuItemDocument }
  | { type: 'menu_item.deleted'; payload: { id: string } }

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaConsumerService.name)
  private readonly consumer: Consumer

  constructor(
    private readonly config: ConfigService,
    private readonly indexing: IndexingService,
  ) {
    const kafka = new Kafka({
      clientId: 'search-service',
      brokers: [config.get<string>('KAFKA_BROKER', 'localhost:9092')],
      retry: { retries: 5 },
    })
    this.consumer = kafka.consumer({ groupId: 'search-service-indexer' })
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.consumer.connect()
      await this.consumer.subscribe({ topics: TOPICS, fromBeginning: false })
      await this.consumer.run({ eachMessage: ({ message }) => this.handleMessage(message) })
      this.logger.log(`Kafka consumer connected, subscribed to: ${TOPICS.join(', ')}`)
    } catch (err) {
      // Non-fatal in dev — Kafka may not be running
      this.logger.warn(`Kafka consumer failed to start: ${String(err)}`)
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.consumer.disconnect().catch(() => {})
  }

  private async handleMessage(message: { value: Buffer | null }): Promise<void> {
    if (!message.value) return

    let event: SearchEvent
    try {
      event = JSON.parse(message.value.toString()) as SearchEvent
    } catch {
      this.logger.warn('Failed to parse Kafka message')
      return
    }

    try {
      switch (event.type) {
        case 'restaurant.created':
        case 'restaurant.updated':
        case 'restaurant.approved':
          await this.indexing.upsertRestaurant(event.payload as RestaurantDocument)
          break

        case 'restaurant.deleted':
          await this.indexing.deleteRestaurant((event.payload as { id: string }).id)
          await this.indexing.deleteMenuItemsByRestaurant((event.payload as { id: string }).id)
          break

        case 'menu_item.created':
        case 'menu_item.updated':
          await this.indexing.upsertMenuItem(event.payload as MenuItemDocument)
          break

        case 'menu_item.deleted':
          await this.indexing.deleteMenuItem((event.payload as { id: string }).id)
          break

        default:
          // Unknown event type — ignore
          break
      }
    } catch (err) {
      this.logger.error(`Failed to index event ${event.type}: ${String(err)}`)
      // Don't rethrow — let Kafka continue processing; failed events won't be retried
      // In production, send to a dead-letter topic instead
    }
  }
}
