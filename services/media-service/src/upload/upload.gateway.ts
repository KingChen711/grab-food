import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import Redis from 'ioredis'
import type { Server, Socket } from 'socket.io'

@WebSocketGateway({ namespace: '/uploads', cors: { origin: '*' } })
export class UploadGateway
  implements OnModuleInit, OnModuleDestroy, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(UploadGateway.name)
  private readonly subscriber: Redis

  @WebSocketServer()
  private readonly server: Server

  constructor(private readonly config: ConfigService) {
    this.subscriber = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT') ?? 6379,
      lazyConnect: true,
    })
  }

  public async onModuleInit(): Promise<void> {
    try {
      await this.subscriber.connect()
      await this.subscriber.psubscribe('upload:*')
      this.subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
        try {
          const event = JSON.parse(message) as object
          this.server.to(channel).emit('progress', event)
        } catch {
          this.logger.warn(`Failed to parse progress message on channel ${channel}`)
        }
      })
      this.logger.log('Upload gateway ready — subscribed to upload:* Redis channels')
    } catch (err) {
      // Non-fatal in dev — Redis may not be running
      this.logger.warn(`Upload gateway Redis subscribe failed (non-fatal): ${String(err)}`)
    }
  }

  public async onModuleDestroy(): Promise<void> {
    await this.subscriber.quit().catch(() => {})
  }

  public handleConnection(client: Socket): void {
    this.logger.debug(`Client connected: ${client.id}`)
  }

  public handleDisconnect(client: Socket): void {
    this.logger.debug(`Client disconnected: ${client.id}`)
  }

  /** Client sends 'join' with uploadId to subscribe to that upload's progress events */
  @SubscribeMessage('join')
  public handleJoin(@MessageBody() uploadId: string, @ConnectedSocket() client: Socket): void {
    void client.join(`upload:${uploadId}`)
    this.logger.debug(`Client ${client.id} joined room upload:${uploadId}`)
  }
}
