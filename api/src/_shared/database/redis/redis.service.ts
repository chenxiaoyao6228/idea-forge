import { Global, Injectable } from "@nestjs/common";
import type { RedisClientType } from "redis";
import { createClient } from "redis";

@Global()
@Injectable()
export class RedisService {
  private redisClient: RedisClientType;

  async onModuleInit() {
    this.redisClient = createClient({
      socket: {
        host: process.env.REDIS_HOST,
        port: Number.parseInt(process.env.REDIS_PORT || "6379"),
      },
    });
    await this.redisClient.connect();
  }

  async onModuleDestroy() {
    await this.redisClient.disconnect();
  }

  getClient(): RedisClientType {
    return this.redisClient;
  }

  // 设置键值对，可选过期时间（秒）
  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await this.redisClient.set(key, value, { EX: ttl });
    } else {
      await this.redisClient.set(key, value);
    }
  }

  // 设置键值对和过期时间
  async setex(key: string, ttl: number, value: string) {
    await this.redisClient.setEx(key, ttl, value);
  }

  // 获取值
  async get(key: string) {
    return await this.redisClient.get(key);
  }

  // 删除键
  async del(key: string) {
    await this.redisClient.del(key);
  }

  // 检查键是否存在
  async exists(key: string) {
    return await this.redisClient.exists(key);
  }

  // 设置过期时间
  async expire(key: string, ttl: number) {
    await this.redisClient.expire(key, ttl);
  }
}
