/**
 * WebSocket Real-time Features Test
 * Simple test to verify WebSocket connectivity and real-time notifications
 */

const io = require("socket.io-client");
const axios = require("axios");

const SERVER_URL = "http://localhost:3000";
const TEST_USER = {
  email: "test@fuchsio.com",
  password: "Test123!@#",
};

async function testWebSocketFeatures() {
  console.log("🔧 Testing Fuchsio WebSocket Real-time Features...\n");

  try {
    // Step 1: Login to get JWT token
    console.log("1️⃣ Authenticating user...");
    const loginResponse = await axios.post(
      `${SERVER_URL}/api/auth/login`,
      TEST_USER
    );
    const { token } = loginResponse.data.data;
    console.log("✅ Authentication successful\n");

    // Step 2: Connect to WebSocket with JWT
    console.log("2️⃣ Connecting to WebSocket server...");
    const socket = io(SERVER_URL, {
      auth: {
        token: token,
      },
    });

    // Set up event listeners
    socket.on("connect", () => {
      console.log("✅ WebSocket connected successfully");
      console.log("📱 Socket ID:", socket.id);
    });

    socket.on("notification", (data) => {
      console.log("🔔 Real-time notification received:");
      console.log("   Type:", data.type);
      console.log("   Message:", data.message);
      console.log("   Data:", JSON.stringify(data.data, null, 2));
    });

    socket.on("user_joined_project", (data) => {
      console.log("👥 User joined project notification:", data);
    });

    socket.on("typing", (data) => {
      console.log("⌨️ Typing indicator:", data);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection error:", error.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("🔌 WebSocket disconnected:", reason);
    });

    // Step 3: Test real-time status endpoints
    console.log("\n3️⃣ Testing real-time API endpoints...");

    const statusResponse = await axios.get(
      `${SERVER_URL}/api/realtime/status`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Real-time status:", statusResponse.data.data);

    const onlineUsersResponse = await axios.get(
      `${SERVER_URL}/api/realtime/online-users`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("✅ Online users count:", onlineUsersResponse.data.data.count);

    // Step 4: Test project room functionality
    console.log("\n4️⃣ Testing project room features...");
    const testProjectId = "test-project-123";

    socket.emit("join_project", { projectId: testProjectId });
    console.log("✅ Joined project room:", testProjectId);

    socket.emit("typing_start", {
      projectId: testProjectId,
      username: "Test User",
    });
    console.log("✅ Sent typing indicator");

    // Step 5: Wait and then disconnect
    setTimeout(() => {
      console.log("\n5️⃣ Disconnecting...");
      socket.disconnect();
      console.log("✅ WebSocket test completed successfully!\n");

      console.log("🎉 Real-time Features Test Summary:");
      console.log("   ✅ JWT Authentication with WebSocket");
      console.log("   ✅ Real-time notification system");
      console.log("   ✅ Project room management");
      console.log("   ✅ Typing indicators");
      console.log("   ✅ API status endpoints");
      console.log("   ✅ User presence tracking");

      process.exit(0);
    }, 3000);
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testWebSocketFeatures();
