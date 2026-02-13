/**
 * Test script to verify the backend API is working
 * Run with: node test-api.js
 */

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4001";
const TEST_PROFILE_ID = "05e33681-4ab2-44b0-87b3-f7591d8dc7b3"; // Replace with actual profile ID

async function testHealthCheck() {
  console.log("\n🔍 Testing Health Check...");
  try {
    const response = await fetch(`${API_BASE_URL}/api/launch/health`);
    const data = await response.json();
    console.log("✅ Health Check Response:", data);
    return true;
  } catch (error) {
    console.error("❌ Health Check Failed:", error.message);
    return false;
  }
}

async function testMarkCompleted(action) {
  console.log(`\n🔍 Testing Mark Completed (${action})...`);
  try {
    const response = await fetch(`${API_BASE_URL}/api/launch/mark-completed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        profileId: TEST_PROFILE_ID,
        action: action,
      }),
    });

    const text = await response.text();
    console.log(`Status: ${response.status}`);
    console.log(`Response: ${text}`);

    if (response.ok) {
      console.log(`✅ ${action} marked successfully`);
      return true;
    } else {
      console.error(`❌ Failed to mark ${action}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error calling API:`, error.message);
    return false;
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("🧪 Launch Password Reset API Test");
  console.log("=".repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  console.log(`Test Profile ID: ${TEST_PROFILE_ID}`);

  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log("\n❌ Backend server is not running!");
    console.log("💡 Start the server with: cd server && npm start");
    process.exit(1);
  }

  // Test 2: Mark Terms Accepted
  await testMarkCompleted("terms_accepted");

  // Test 3: Mark Password Reset
  await testMarkCompleted("password_reset");

  console.log("\n" + "=".repeat(60));
  console.log("✅ All tests completed!");
  console.log("=".repeat(60));
  console.log("\n💡 Next steps:");
  console.log("1. Check the database to verify updates:");
  console.log("   SELECT * FROM launch_password_resets WHERE profile_id = '" + TEST_PROFILE_ID + "';");
  console.log("2. Check the admin dashboard to see the status");
}

runTests().catch(console.error);
