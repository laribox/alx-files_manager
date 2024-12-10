import { expect, use, should, request } from "chai";
import chaiHttp from "chai-http";
import app from "../server";
import dbClient from "../utils/db";

use(chaiHttp);
should();

describe("testing App Endpoints", () => {
  const credentials = "dGVzdEBleGFtcGxlLmNvbTpwYXNzd29yZDEyMw==";
  describe("GET /status", () => {
    it("returns the status of redis and mongo connection", async () => {
      const response = await request(app).get("/status").send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ redis: true, db: true });
      expect(response.statusCode).to.equal(200);
    });
  });

  describe("GET /stats", () => {
    before(async function () {
      this.timeout(5000); // Extend timeout for this hook
      await dbClient.db.collection("users").deleteMany({});
      await dbClient.db.collection("files").deleteMany({});
    });

    it("returns number of users and files in db should be 0", async () => {
      const response = await request(app).get("/stats").send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ users: 0, files: 0 });
      expect(response.statusCode).to.equal(200);
    });

    it("returns number of users and files in db should be 1 and 2", async () => {
      await dbClient.db.collection("users").insertOne({ name: "Larry" });
      await dbClient.db.collection("files").insertOne({ name: "image.png" });
      await dbClient.db.collection("files").insertOne({ name: "file.txt" });

      const response = await request(app).get("/stats").send();
      const body = JSON.parse(response.text);

      expect(body).to.eql({ users: 1, files: 2 });
      expect(response.statusCode).to.equal(200);
    });
  });

  describe("Users Endpoints", () => {
    it("POST /users - should create a new user", async () => {
      const response = await request(app)
        .post("/users")
        .send({ email: "test@example.com", password: "password123" });

      expect(response.statusCode).to.equal(201);
      expect(response.body).to.have.property("id");
      expect(response.body).to.have.property("email", "test@example.com");
    });

    it("GET /users/me - should return user details when logged in", async () => {
      const loginResponse = await request(app)
        .get("/connect")
        .set("Authorization", `Basic ${credentials}`)
        .send();

      const body = JSON.parse(loginResponse.text);
      const token = body.token;

      const response = await request(app)
        .get("/users/me")
        .set("X-Token", token)
        .send();

      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property("email", "test@example.com");
    });
  });

  describe("Auth Endpoints", () => {
    it("GET /connect - should authenticate a user", async () => {
      const response = await request(app)
        .get("/connect")
        .set("Authorization", `Basic ${credentials}`)
        .send();

      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property("token");
    });

    it("GET /disconnect - should log out a user", async () => {
      const loginResponse = await request(app)
        .get("/connect")
        .set("Authorization", `Basic ${credentials}`)
        .send();

      const body = JSON.parse(loginResponse.text);
      const token = body.token;

      const response = await request(app)
        .get("/disconnect")
        .set("X-Token", token)
        .send();

      expect(response.text).to.be.equal("");
      expect(response.statusCode).to.equal(204);
    });
  });

  describe("Files Endpoints", () => {
    it("POST /files - should upload a file", async () => {
      const loginResponse = await request(app)
        .get("/connect")
        .set("Authorization", `Basic ${credentials}`)
        .send();

      const body = JSON.parse(loginResponse.text);
      const token = body.token;

      const response = await request(app)
        .post("/files")
        .set("X-Token", token)
        .send({ name: "file.txt", type: "text/plain", data: "Test content" });

      expect(response.statusCode).to.equal(201);
      expect(response.body).to.have.property("id");
      expect(response.body).to.have.property("name", "file.txt");
    });

    it("GET /files/:id - should return file details", async () => {
      const loginResponse = await request(app)
        .get("/connect")
        .set("Authorization", `Basic ${credentials}`)
        .send();

      const body = JSON.parse(loginResponse.text);
      const token = body.token;

      const fileResponse = await request(app)
        .post("/files")
        .set("X-Token", token)
        .send({ name: "file.txt", type: "text/plain", data: "Test content" });

      const fileId = fileResponse.body.id;

      const response = await request(app).get(`/files/${fileId}`);

      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property("id", fileId);
      expect(response.body).to.have.property("name", "file.txt");
    });

    it("GET /files - should list all files", async () => {
      const response = await request(app).get("/files");

      expect(response.statusCode).to.equal(200);
      expect(response.body).to.be.an("array");
      expect(response.body.length).to.be.greaterThan(0);
    });

    it("PUT /files/:id/publish - should publish a file", async () => {
      const fileResponse = await request(app)
        .post("/files")
        .send({ name: "file.txt", type: "text/plain", data: "Test content" });

      const fileId = fileResponse.body.id;

      const response = await request(app).put(`/files/${fileId}/publish`);

      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property("isPublic", true);
    });

    it("PUT /files/:id/unpublish - should unpublish a file", async () => {
      const fileResponse = await request(app)
        .post("/files")
        .send({ name: "file.txt", type: "text/plain", data: "Test content" });

      const fileId = fileResponse.body.id;

      await request(app).put(`/files/${fileId}/publish`);

      const response = await request(app).put(`/files/${fileId}/unpublish`);

      expect(response.statusCode).to.equal(200);
      expect(response.body).to.have.property("isPublic", false);
    });

    it("GET /files/:id/data - should fetch the file content", async () => {
      const fileResponse = await request(app)
        .post("/files")
        .send({ name: "file.txt", type: "text/plain", data: "Test content" });

      const fileId = fileResponse.body.id;

      const response = await request(app).get(`/files/${fileId}/data`);

      expect(response.statusCode).to.equal(200);
      expect(response.text).to.equal("Test content");
    });
  });
});
