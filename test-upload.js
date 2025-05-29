const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const axios = require("axios");

const API_BASE_URL = "http://localhost:3000/api/v1";

// Test data for authentication
const testUser = {
  email: "admin@example.com",
  password: "admin123",
};

let authToken = "";

// Function to authenticate and get token
async function authenticate() {
  try {
    console.log("🔐 Authenticating...");
    const response = await axios.post(`${API_BASE_URL}/auth/login`, testUser);
    authToken = response.data.tokens.access.token;
    console.log("✅ Authentication successful");
    return true;
  } catch (error) {
    console.error(
      "❌ Authentication failed:",
      error.response?.data || error.message
    );
    return false;
  }
}

// Function to create a test file
function createTestFile(
  filename,
  content = "This is a test file for upload functionality."
) {
  const filepath = path.join(__dirname, filename);
  fs.writeFileSync(filepath, content);
  return filepath;
}

// Function to test single file upload
async function testSingleFileUpload() {
  try {
    console.log("\n📁 Testing single file upload...");

    const testFile = createTestFile("test-document.txt");
    const form = new FormData();
    form.append("file", fs.createReadStream(testFile));
    form.append("category", "DOCUMENT");
    form.append("description", "Test document upload");
    form.append("isPublic", "false");

    const response = await axios.post(`${API_BASE_URL}/upload/file`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log("✅ Single file upload successful:", response.data);

    // Clean up test file
    fs.unlinkSync(testFile);

    return response.data.file.id;
  } catch (error) {
    console.error(
      "❌ Single file upload failed:",
      error.response?.data || error.message
    );
    return null;
  }
}

// Function to test multiple file upload
async function testMultipleFileUpload() {
  try {
    console.log("\n📁 Testing multiple file upload...");

    const testFile1 = createTestFile("test-image.txt", "Fake image content");
    const testFile2 = createTestFile(
      "test-code.js",
      'console.log("Hello World");'
    );

    const form = new FormData();
    form.append("files", fs.createReadStream(testFile1));
    form.append("files", fs.createReadStream(testFile2));
    form.append("category", "GENERAL");
    form.append("description", "Test multiple file upload");

    const response = await axios.post(`${API_BASE_URL}/upload/files`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log("✅ Multiple file upload successful:", response.data);

    // Clean up test files
    fs.unlinkSync(testFile1);
    fs.unlinkSync(testFile2);

    return response.data.files.map((f) => f.id);
  } catch (error) {
    console.error(
      "❌ Multiple file upload failed:",
      error.response?.data || error.message
    );
    return [];
  }
}

// Function to test file retrieval
async function testFileRetrieval() {
  try {
    console.log("\n📋 Testing file retrieval...");

    const response = await axios.get(`${API_BASE_URL}/upload`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log("✅ File retrieval successful:", {
      total: response.data.total,
      files: response.data.files.length,
    });

    return response.data.files;
  } catch (error) {
    console.error(
      "❌ File retrieval failed:",
      error.response?.data || error.message
    );
    return [];
  }
}

// Function to test file download
async function testFileDownload(fileId) {
  try {
    console.log(`\n⬇️ Testing file download for ID: ${fileId}...`);

    const response = await axios.get(
      `${API_BASE_URL}/upload/${fileId}/download`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        responseType: "stream",
      }
    );

    console.log("✅ File download successful:", {
      contentType: response.headers["content-type"],
      contentDisposition: response.headers["content-disposition"],
    });

    return true;
  } catch (error) {
    console.error(
      "❌ File download failed:",
      error.response?.data || error.message
    );
    return false;
  }
}

// Function to test file deletion
async function testFileDeletion(fileId) {
  try {
    console.log(`\n🗑️ Testing file deletion for ID: ${fileId}...`);

    const response = await axios.delete(`${API_BASE_URL}/upload/${fileId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log("✅ File deletion successful:", response.data);
    return true;
  } catch (error) {
    console.error(
      "❌ File deletion failed:",
      error.response?.data || error.message
    );
    return false;
  }
}

// Main test function
async function runTests() {
  console.log("🧪 Starting File Upload API Tests...\n");

  // Authenticate first
  const authenticated = await authenticate();
  if (!authenticated) {
    console.log("❌ Cannot proceed without authentication");
    return;
  }

  // Test single file upload
  const singleFileId = await testSingleFileUpload();

  // Test multiple file upload
  const multipleFileIds = await testMultipleFileUpload();

  // Test file retrieval
  const files = await testFileRetrieval();

  // Test file download (if we have files)
  if (singleFileId) {
    await testFileDownload(singleFileId);
  }

  // Test file deletion
  if (singleFileId) {
    await testFileDeletion(singleFileId);
  }

  // Clean up multiple files
  for (const fileId of multipleFileIds) {
    await testFileDeletion(fileId);
  }

  console.log("\n🎉 File Upload API Tests Completed!");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  authenticate,
  testSingleFileUpload,
  testMultipleFileUpload,
  testFileRetrieval,
  testFileDownload,
  testFileDeletion,
};
