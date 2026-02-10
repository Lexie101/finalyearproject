import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || process.env.REDIS_URL;

if (!redisUrl) {
  console.warn("REDIS_URL is not set. Redis features will be disabled.");
}

export const redis = new Redis(redisUrl);

export default redis;
