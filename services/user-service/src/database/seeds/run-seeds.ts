import 'reflect-metadata'

import { AppDataSource } from '../data-source'
import { seedUsers } from './users.seed'

async function run(): Promise<void> {
  await AppDataSource.initialize()

  try {
    await seedUsers(AppDataSource)
    console.log('✅ User service seeding completed')
  } catch (error) {
    console.error('❌ User service seeding failed', error)
    process.exitCode = 1
  } finally {
    await AppDataSource.destroy()
  }
}

void run()
