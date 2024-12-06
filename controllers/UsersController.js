const crypto = require('crypto');
const dbClient = require('../utils/db'); // Import the existing dbClient instance

class UsersController {
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

      return res.status(201).json({ id: result.insertedId, email });
    } catch (err) {
      console.error('Error creating user:', err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = UsersController;

