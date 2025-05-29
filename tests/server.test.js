const request = require("supertest");
const app = require("../src/server");

describe("Server", () => {
  describe("GET /", () => {
    it("should return welcome message", async () => {
      const response = await request(app).get("/").expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body.message).toBe("Welcome to Fuchsio Backend API");
      expect(response.body).toHaveProperty("version");
      expect(response.body).toHaveProperty("timestamp");
    });
  });

  describe("GET /health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/health").expect(200);

      expect(response.body).toHaveProperty("status", "OK");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("uptime");
    });
  });

  describe("GET /api/v1", () => {
    it("should return API info", async () => {
      const response = await request(app).get("/api/v1").expect(200);

      expect(response.body).toHaveProperty("message");
      expect(response.body).toHaveProperty("endpoints");
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await request(app).get("/unknown-route").expect(404);

      expect(response.body).toHaveProperty("error", "Not Found");
      expect(response.body).toHaveProperty("message");
    });
  });
});
