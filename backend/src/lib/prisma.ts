import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'

const URL_BD = process.env.DATABASE_URL

if (!URL_BD) {
  throw new Error('DATABASE_URL manquant dans .env')
}

const enDev = process.env.NODE_ENV !== 'production'

const adapter = new PrismaPg({ connectionString: URL_BD })

export const prisma = new PrismaClient({
  adapter,
  log: enDev ? ['warn', 'error'] : ['error'],
})

process.on('beforeExit', async () => {
  await prisma.$disconnect()
})
