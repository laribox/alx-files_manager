// utils/redis.js
const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = redis.createClient();

    // Handle error events
    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
  }

  /**
   * Checks if the Redis client is alive
   * @returns {boolean} - True if the client is connected, false otherwise
   */
  isAlive() {
    return this.client.connected;
  }

  /**
   * Get a value from Redis by key
   * @param {string} key - The key to fetch
   * @returns {Promise<string | null>} - The value stored in Redis or null if not found
   */
  async get(key) {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, value) => {
        if (err) {
          reject(err);
        } else {
          resolve(value);
        }
      });
    });
  }

  /**
   * Set a value in Redis with an expiration
   * @param {string} key - The key to store
   * @param {string} value - The value to store
   * @param {number} duration - The expiration duration in seconds
   */
  async set(key, value, duration) {
    return new Promise((resolve, reject) => {
      this.client.set(key, value, 'EX', duration, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Delete a value in Redis by key
   * @param {string} key - The key to delete
   */
  async del(key) {
    return new Promise((resolve, reject) => {
      this.client.del(key, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Create and export an instance of RedisClient
const redisClient = new RedisClient();
module.exports = redisClient;
