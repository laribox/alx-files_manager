const redisClient = require('../utils/redis');
import {
  expect, use, should, request,
} from 'chai';

describe('Redis Client', () => {
  it('should connect to Redis server', () => {
    // Check if the Redis client is alive
    expect(redisClient.isAlive()).to.equal(true);
  });
  it('should store and retrieve a value', async () => {
    await redisClient.set('key', 'value', 10);
    const value = await redisClient.get('key');
    expect(value).to.equal('value');
  });

  it('should delete a value', async () => {
    await redisClient.set('key', 'value', 10);
    await redisClient.del('key');
    const value = await redisClient.get('key');
    expect(value).to.equal(null);
  });
});

