const Bull = require("bull");
const imageThumbnail = require("image-thumbnail");
const fs = require("fs").promises;
const path = require("path");
const dbClient = require("./utils/db");

import { ObjectId } from "mongodb";

const fileQueue = new Bull("fileQueue");

fileQueue.process(async (job) => {
  const { userId, fileId } = job.data;

  // Validate job data
  if (!fileId) throw new Error("Missing fileId");
  if (!userId) throw new Error("Missing userId");

  // Fetch file from DB
  const file = await dbClient.db.collection("files").findOne({
    _id: new ObjectId(fileId),
    userId,
  });

  if (!file) throw new Error("File not found");

  // Generate thumbnails
  const sizes = [500, 250, 100];
  for (const size of sizes) {
    const thumbnail = await imageThumbnail(file.localPath, { width: size });
    const thumbnailPath = `${file.localPath}_${size}`;
    await fs.writeFile(thumbnailPath, thumbnail);
  }
});

// Create a queue for processing users
const userQueue = new Bull("userQueue");

// Process the userQueue
userQueue.process(async (job) => {
  const { userId } = job.data;

  if (!userId) {
    throw new Error("Missing userId");
  }

  try {
    // Fetch the user from the database
    const user = await dbClient.db
      .collection("users")
      .findOne({ _id: ObjectId(userId) });

    if (!user) {
      throw new Error("User not found");
    }

    // Simulate sending a welcome email
    console.log(`Welcome ${user.email}!`);
  } catch (error) {
    console.error(`Error processing user job: ${error.message}`);
  }
});

console.log("Worker is running...");
