import 'reflect-metadata'

import { AppDataSource } from '../data-source'
import { seedRestaurants } from './restaurants.seed'

async function run(): Promise<void> {
  await AppDataSource.initialize()

  try {
    await seedRestaurants(AppDataSource)

    console.log('✅ Restaurant service seeding completed')
  } catch (error) {
    console.error('❌ Restaurant service seeding failed', error)
    process.exitCode = 1
  } finally {
    await AppDataSource.destroy()
  }
}

void run()
