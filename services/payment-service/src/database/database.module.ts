import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'

import { Invoice } from '../invoices/entities/invoice.entity'
import { Payment } from '../payments/entities/payment.entity'
import { SavedPaymentMethod } from '../payments/entities/payment-method.entity'
import { Refund } from '../payments/entities/refund.entity'
import { Payout } from '../payouts/entities/payout.entity'
import { Wallet } from '../wallet/entities/wallet.entity'
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        entities: [Invoice, SavedPaymentMethod, Payment, Refund, Payout, Wallet, WalletTransaction],
        synchronize: false,
        migrationsRun: true,
        migrations: [__dirname + '/migrations/*.{ts,js}'],
        logging: process.env.NODE_ENV === 'development',
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      }),
    }),
  ],
})
export class DatabaseModule {}
