import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Channel, ChannelModel } from 'amqplib'
import amqplib from 'amqplib'

import { SAGA_QUEUES } from './saga.constants'

const ALL_QUEUES = [...Object.values(SAGA_QUEUES.COMMANDS), SAGA_QUEUES.REPLIES, SAGA_QUEUES.DLQ]

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name)
  private connection!: ChannelModel
  private channel!: Channel

  constructor(private readonly config: ConfigService) {}

  public async onModuleInit(): Promise<void> {
    const url = this.config.getOrThrow<string>('rabbitmq.url')
    this.connection = await amqplib.connect(url)
    this.channel = await this.connection.createChannel()

    // Prefetch 1 — process one saga reply at a time to avoid race conditions
    await this.channel.prefetch(1)

    // Assert all queues as durable so messages survive broker restarts
    for (const queue of ALL_QUEUES) {
      await this.channel.assertQueue(queue, {
        durable: true,
        // Route unprocessable messages to the DLQ automatically
        arguments:
          queue !== SAGA_QUEUES.DLQ
            ? { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': SAGA_QUEUES.DLQ }
            : undefined,
      })
    }

    this.logger.log('RabbitMQ connected and all saga queues asserted')
  }

  public async onModuleDestroy(): Promise<void> {
    try {
      await this.channel?.close()
      await this.connection?.close()
    } catch {
      // ignore close errors on shutdown
    }
  }

  // ─── Publishing ───────────────────────────────────────────────────────────

  public publish(queue: string, message: unknown): void {
    const buffer = Buffer.from(JSON.stringify(message))
    const sent = this.channel.sendToQueue(queue, buffer, {
      persistent: true,
      contentType: 'application/json',
    })
    if (!sent) {
      this.logger.warn(`sendToQueue returned false for queue "${queue}" — channel buffer full`)
    }
  }

  // ─── Consuming ────────────────────────────────────────────────────────────

  public async consume(queue: string, handler: (message: unknown) => Promise<void>): Promise<void> {
    await this.channel.consume(queue, async (msg) => {
      if (!msg) return // consumer cancelled by broker
      try {
        const content = JSON.parse(msg.content.toString()) as unknown
        await handler(content)
        this.channel.ack(msg)
      } catch (err) {
        this.logger.error(`Error processing message from "${queue}": ${String(err)}`)
        // nack without requeue — message goes to DLQ via dead-letter config
        this.channel.nack(msg, false, false)
      }
    })
  }
}
