const crypto = require('crypto');
const dbClient = require('../utils/db');
const redisClient = require('../utils/redis');
const { ObjectId } = require('mongodb');
import Bull from 'bull';

const userQueue = new Bull('userQueue');


class UsersController {

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(200).json({ id: user._id.toString(), email: user.email });
  }

  static async postNew(req, res) {
    const { email, password } = req.body;

    // Check for missing fields
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    try {
      // Ensure the database connection is established
      if (!dbClient.isAlive()) {
        return res.status(500).json({ error: 'Database connection error' });
      }

      const db = dbClient.db; // Access the database instance from dbClient
      const usersCollection = db.collection('users');

      // Check if user already exists
      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) return res.status(400).json({ error: 'Already exist' });

      // Hash the password using SHA1
      const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');

      // Insert new user
      const result = await usersCollection.insertOne({ email, password: hashedPassword });

      // Add job to the userQueue
      userQueue.add({ userId: result.insertedId });

      return res.status(201).json({ id: result.insertedId, email });
    } catch (err) {
      console.error('Error creating user:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = UsersController;
