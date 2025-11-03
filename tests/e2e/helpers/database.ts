let prisma: any;
let redis: any;

export async function getPrismaClient() {
  if (!prisma) {
    // Lazy load Prisma client from the API directory
    const { PrismaClient } = require('../../../apps/api/node_modules/@prisma/client');
    
    // Use the same database URL as the API
    const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:123456@localhost:5432/ideaforge';
    
    console.log('Initializing Prisma client with URL:', databaseUrl);
    
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: ['query', 'info', 'warn', 'error'], // Enable all logging for debugging
    });
    
    await prisma.$connect();
    console.log('Prisma client connected successfully');
  }
  return prisma;
}

export async function getRedisClient() {
  if (!redis) {
    // Lazy load Redis client
    const Redis = require('ioredis');
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }
  return redis;
}

export async function setupDatabase() {
  const prismaClient = await getPrismaClient();
  const redisClient = await getRedisClient();
  return { prisma: prismaClient, redis: redisClient };
}

export async function cleanupDatabase() {
  if (prisma) {
    try {
      // Clear all tables except migrations
      const tableNames = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
      `;
      const tables = tableNames
        .map((t) => `"${t.tablename}"`)
        .filter((t) => t !== '"_prisma_migrations"')
        .join(', ');
      
      if (tables) {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
      }
    } catch (error) {
      console.warn('Error cleaning up database:', error);
    } finally {
      await prisma.$disconnect();
      prisma = null;
    }
  }

  if (redis) {
    try {
      await redis.quit();
    } catch (error) {
      console.warn('Error disconnecting Redis:', error);
    } finally {
      redis = null;
    }
  }
}

export async function getPrisma() {
  return await getPrismaClient();
}

export async function getRedis() {
  return await getRedisClient();
}
