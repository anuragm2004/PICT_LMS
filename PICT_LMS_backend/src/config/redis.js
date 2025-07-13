const Redis = require("redis");
const dotenv = require("dotenv");

dotenv.config();

const redisClient = Redis.createClient({
  url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Max reconnection attempts reached");
        return new Error("Max reconnection attempts reached");
      }
      return Math.min(retries * 100, 3000);
    },
  },
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("connect", () => console.log("Connected to Redis"));
redisClient.on("reconnecting", () => console.log("Reconnecting to Redis..."));
redisClient.on("ready", () => console.log("Redis client is ready"));
redisClient.on("end", () => console.log("Redis connection ended"));

// Connect to Redis
const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
  }
};

connectRedis();

module.exports = redisClient;
