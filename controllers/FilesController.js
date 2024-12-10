import { v4 as uuidv4 } from "uuid";
import { promises as fs } from "fs";
import path from "path";
import { ObjectId } from "mongodb";
import dbClient from "../utils/db";
import redisClient from "../utils/redis";

const Bull = require('bull');
const fileQueue = new Bull('fileQueue');

class FilesController {
  static async getFile(req, res) {
    const token = req.header("X-Token");
    const fileId = req.params.id;

    // Validate fileId format
    let objectId;
    try {
      objectId = ObjectId(fileId);
    } catch (err) {
      return res.status(400).json({ error: "Invalid file ID" });
    }

    const file = await dbClient.db
      .collection("files")
      .findOne({ _id: objectId });
    if (!file) {
      return res.status(404).json({ error: "Not found" });
    }

    // Check if file is a folder
    if (file.type === "folder") {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    // Check file accessibility
    const userId = token ? await redisClient.get(`auth_${token}`) : null;

    console.log("User ID:", userId);
    console.log("file userId:", file.userId);

    if (!file.isPublic && (!userId || file.userId !== userId)) {
      return res.status(404).json({ error: "Not found" });
    }

    // Check if the file exists locally
    try {
      const fileContent = await fs.readFile(file.localPath);
      const mimeType = mime.lookup(file.name) || "application/octet-stream";
      res.setHeader("Content-Type", mimeType);
      return res.status(200).send(fileContent);
    } catch (err) {
      return res.status(404).json({ error: "Not found" });
    }
  }
  static async putPublish(req, res) {
    await FilesController.updatePublicStatus(req, res, true);
  }

  static async putUnpublish(req, res) {
    await FilesController.updatePublicStatus(req, res, false);
  }

  static async updatePublicStatus(req, res, isPublic) {
    const token = req.header("X-Token");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.log("File ID:", req.params.id);
    console.log("User ID:", userId);

    const fileId = req.params.id;
    const file = await dbClient.db.collection("files").findOne({
      _id: ObjectId(fileId),
      userId: ObjectId(userId),
    });

    if (!file) {
      return res.status(404).json({ error: "Not found" });
    }

    await dbClient.db
      .collection("files")
      .updateOne({ _id: ObjectId(fileId) }, { $set: { isPublic } });

    const updatedFile = await dbClient.db
      .collection("files")
      .findOne({ _id: ObjectId(fileId) });

    return res.status(200).json({
      id: updatedFile._id,
      userId: updatedFile.userId,
      name: updatedFile.name,
      type: updatedFile.type,
      isPublic: updatedFile.isPublic,
      parentId: updatedFile.parentId,
    });
  }

  static async postUpload(req, res) {
    const token = req.headers["x-token"];
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Missing name" });
    }
    if (!type || !["folder", "file", "image"].includes(type)) {
      return res.status(400).json({ error: "Missing type" });
    }
    if (type !== "folder" && !data) {
      return res.status(400).json({ error: "Missing data" });
    }

    let parentFile = null;
    if (parentId !== 0) {
      parentFile = await dbClient.db
        .collection("files")
        .findOne({ _id: ObjectId(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: "Parent not found" });
      }
      if (parentFile.type !== "folder") {
        return res.status(400).json({ error: "Parent is not a folder" });
      }
    }

    const fileData = {
      userId: ObjectId(userId),
      name,
      type,
      parentId,
      isPublic,
      createdAt: new Date(),
    };

    const FOLDER_PATH = process.env.FOLDER_PATH || "/tmp/files_manager";

    if (type === "folder") {
      const newFile = await dbClient.db.collection("files").insertOne(fileData);
      return res.status(201).json({ id: newFile.insertedId, ...fileData });
    }

    const filePath = path.join(FOLDER_PATH, uuidv4());
    await fs.mkdir(FOLDER_PATH, { recursive: true });

    const buffer = Buffer.from(data, "base64");
    await fs.writeFile(filePath, buffer);

    fileData.localPath = filePath;

    const newFile = await dbClient.db.collection("files").insertOne(fileData);

    // If the uploaded file is an image, add a job to generate thumbnails
    if (file.type === 'image') {
      await fileQueue.add({
        userId: file.userId,
        fileId: file._id.toString(),
      });
    }

    return res.status(201).json({
      id: newFile.insertedId,
      ...fileData,
    });
  }

  static async getShow(req, res) {
    const token = req.header("X-Token");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Not found" });
    }
    const file = await dbClient.db.collection("files").findOne({
      _id: ObjectId(id),
      userId: ObjectId(userId),
    });

    if (!file) {
      return res.status(404).json({ error: "Not found" });
    }

    const response = {
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId || 0,
    };

    if (file.type === "file" || file.type === "image") {
      response.localPath = file.localPath;
    }

    return res.status(200).json(response);
  }

  static async getIndex(req, res) {
    const token = req.header("X-Token");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parentId = req.query.parentId || 0;
    const page = parseInt(req.query.page, 10) || 0;
    const files = await dbClient.db
      .collection("files")
      .aggregate([
        {
          $match: {
            userId: ObjectId(userId),
            parentId: parentId === 0 ? 0 : ObjectId(parentId),
          },
        },
        { $skip: page * 20 },
        { $limit: 20 },
      ])
      .toArray();

    const response = files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId || 0,
    }));

    return res.status(200).json(response);
  }
}

export default FilesController;
