import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;

let redis: Redis | null = null;

if (redisUrl) {
  redis = new Redis(redisUrl);
} else {
  console.warn("REDIS_URL is not set. Rate limiting and caching will be disabled.");
}

export { redis };

export default redis;
