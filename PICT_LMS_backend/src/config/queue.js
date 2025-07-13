const Queue = require("bull");
const dotenv = require("dotenv");

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Create queues
const bookQueue = new Queue("book-queue", {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const paymentQueue = new Queue("payment-queue", {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const notificationQueue = new Queue("notification-queue", {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Queue event handlers
const setupQueueEvents = (queue, name) => {
  queue.on("ready", () => {
    console.log(`${name} queue is ready`);
  });

  queue.on("error", (error) => {
    console.error(`${name} queue error:`, error);
  });

  queue.on("stalled", (job) => {
    console.warn(`${name} job stalled:`, job.id);
  });

  queue.on("failed", (job, err) => {
    console.error(`${name} job failed:`, job.id, err);
  });

  queue.on("completed", (job) => {
    console.log(`${name} job completed:`, job.id);
  });
};

// Setup event handlers for all queues
setupQueueEvents(bookQueue, "Book");
setupQueueEvents(paymentQueue, "Payment");
setupQueueEvents(notificationQueue, "Notification");

// Process queues
bookQueue.process(async (job) => {
  try {
    console.log("Processing book job:", job.data);
    // Add your book processing logic here
  } catch (error) {
    console.error("Error processing book job:", error);
    throw error;
  }
});

paymentQueue.process(async (job) => {
  try {
    console.log("Processing payment job:", job.data);
    // Add your payment processing logic here
  } catch (error) {
    console.error("Error processing payment job:", error);
    throw error;
  }
});

notificationQueue.process(async (job) => {
  try {
    console.log("Processing notification job:", job.data);
    // Add your notification processing logic here
  } catch (error) {
    console.error("Error processing notification job:", error);
    throw error;
  }
});

// Graceful shutdown
const cleanup = async () => {
  console.log("Cleaning up queues...");
  await Promise.all([
    bookQueue.close(),
    paymentQueue.close(),
    notificationQueue.close(),
  ]);
  console.log("Queues cleaned up");
};

process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);

module.exports = {
  bookQueue,
  paymentQueue,
  notificationQueue,
};
