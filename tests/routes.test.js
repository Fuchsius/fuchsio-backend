const request = require("supertest");
const app = require("../src/server");

describe("Example Routes", () => {
  describe("GET /api/v1/examples", () => {
    it("should return all examples", async () => {
      const response = await request(app).get("/api/v1/examples").expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body).toHaveProperty("count");
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("GET /api/v1/examples/:id", () => {
    it("should return specific example", async () => {
      const response = await request(app).get("/api/v1/examples/1").expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("id", 1);
    });

    it("should return 404 for non-existent example", async () => {
      const response = await request(app)
        .get("/api/v1/examples/999")
        .expect(404);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error", "Example not found");
    });
  });

  describe("POST /api/v1/examples", () => {
    it("should create new example", async () => {
      const newExample = {
        name: "Test Example",
        description: "This is a test example",
      };

      const response = await request(app)
        .post("/api/v1/examples")
        .send(newExample)
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("name", newExample.name);
      expect(response.body.data).toHaveProperty(
        "description",
        newExample.description
      );
    });

    it("should return 400 for missing required fields", async () => {
      const response = await request(app)
        .post("/api/v1/examples")
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });
  });
});
