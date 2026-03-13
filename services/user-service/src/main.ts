import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { MicroserviceOptions } from '@nestjs/microservices'
import { Transport } from '@nestjs/microservices'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  })

  // Graceful shutdown hooks (SIGTERM, SIGINT)
  app.enableShutdownHooks()

  // TCP Microservice transport
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: { host: '0.0.0.0', port: 5001 },
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  const swaggerConfig = new DocumentBuilder()
    .setTitle('User Service')
    .setDescription('Authentication, profiles and address management')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('api/docs', app, document)

  await app.startAllMicroservices()

  const port = process.env.PORT ?? 3001
  await app.listen(port)

  Logger.log(`User service running on HTTP :${port} / TCP :5001`, 'Bootstrap')
}

void bootstrap()
