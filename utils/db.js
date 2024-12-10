// utils/db.js
const { MongoClient } = require('mongodb');

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';
    const url = `mongodb://${host}:${port}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.dbName = database;

    // Connect to MongoDB
    this.client.connect()
      .then(() => {
        this.db = this.client.db(this.dbName);
        console.log('Connected to MongoDB');
      })
      .catch((err) => {
        console.error('MongoDB Connection Error:', err);
      });
  }

  /**
   * Checks if the MongoDB client is alive
   * @returns {boolean} - True if the client is connected, false otherwise
   */
  isAlive() {
    return this.client && this.client.topology && this.client.topology.isConnected();
  }

  /**
   * Get the number of documents in the users collection
   * @returns {Promise<number>} - The number of users
   */
  async nbUsers() {
    try {
      const usersCollection = this.db.collection('users');
      return await usersCollection.countDocuments();
    } catch (err) {
      console.error('Error fetching user count:', err);
      return 0;
    }
  }

  /**
   * Get the number of documents in the files collection
   * @returns {Promise<number>} - The number of files
   */
  async nbFiles() {
    try {
      const filesCollection = this.db.collection('files');
      return await filesCollection.countDocuments();
    } catch (err) {
      console.error('Error fetching file count:', err);
      return 0;
    }
  }
}

// Create and export an instance of DBClient
const dbClient = new DBClient();
module.exports = dbClient;
