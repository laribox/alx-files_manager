// controllers/AppController.js
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class AppController {
  /**
   * GET /status
   * Returns the status of Redis and MongoDB
   */
  static async getStatus(req, res) {
    const status = {
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    };
    return res.status(200).json(status);
  }

  /**
   * GET /stats
   * Returns the number of users and files in the database
   */
  static async getStats(req, res) {
    const stats = {
      users: await dbClient.nbUsers(),
      files: await dbClient.nbFiles(),
    };
    return res.status(200).json(stats);
  }
}

module.exports = AppController;

