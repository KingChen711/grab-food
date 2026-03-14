import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Kafka, type Producer } from 'kafkajs'

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name)
  private readonly producer: Producer
  public connected = false

  constructor(private readonly config: ConfigService) {
    const kafka = new Kafka({
      clientId: 'restaurant-service',
      brokers: [this.config.get<string>('KAFKA_BROKER', 'localhost:9092')],
      retry: { retries: 5 },
    })
    this.producer = kafka.producer()
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.producer.connect()
      this.connected = true
      this.logger.log('Kafka producer connected')
    } catch (err) {
      // Non-fatal in dev — Kafka may not be running
      this.logger.warn(`Kafka producer failed to connect (non-fatal): ${String(err)}`)
    }
  }

  public async onModuleDestroy(): Promise<void> {
    if (this.connected) await this.producer.disconnect().catch(() => {})
  }

  public async publish(topic: string, message: object): Promise<void> {
    if (!this.connected) {
      this.logger.warn(`Kafka not connected, skipping publish to ${topic}`)
      return
    }

    try {
      await this.producer.send({
        topic,
        messages: [{ value: JSON.stringify(message) }],
      })
    } catch (err) {
      this.logger.error(`Failed to publish to ${topic}: ${String(err)}`)
    }
  }
}
