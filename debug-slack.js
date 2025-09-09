#!/usr/bin/env node

/**
 * Slack Integration Debugging Tool
 *
 * This script helps debug Slack integration issues by:
 * 1. Testing webhook endpoint
 * 2. Checking integration status
 * 3. Verifying database connections
 * 4. Simulating Slack events
 */

const axios = require("axios");
const readline = require("readline");

const API_BASE = "http://localhost:8000";
const WEBHOOK_URL = `${API_BASE}/webhooks/slack`;

// Colors for console output
const colors = {
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testWebhookEndpoint() {
  log("\n🔍 Testing Webhook Endpoint...", "blue");

  try {
    const response = await axios.post(WEBHOOK_URL, {
      challenge: "test_challenge_123",
    });

    if (response.data === "test_challenge_123") {
      log("✅ Webhook endpoint is working correctly", "green");
      return true;
    } else {
      log("❌ Webhook endpoint returned unexpected response", "red");
      return false;
    }
  } catch (error) {
    log(`❌ Webhook endpoint test failed: ${error.message}`, "red");
    return false;
  }
}

async function checkIntegrationStatus() {
  log("\n🔍 Checking Integration Status...", "blue");

  try {
    const response = await axios.get(`${API_BASE}/integrations`);
    const integrations = response.data;

    const slackIntegration = integrations.find((int) => int.type === "slack");

    if (!slackIntegration) {
      log("❌ No Slack integration found", "red");
      return null;
    }

    log(
      `📊 Slack Integration Status: ${slackIntegration.status}`,
      slackIntegration.status === "connected" ? "green" : "red"
    );

    if (slackIntegration.status === "connected") {
      log(
        `📋 Channels: ${slackIntegration.config.channels.join(", ")}`,
        "blue"
      );
      log(
        `🕒 Last Sync: ${slackIntegration.config.lastSync || "Never"}`,
        "blue"
      );
    }

    return slackIntegration;
  } catch (error) {
    log(`❌ Failed to check integration status: ${error.message}`, "red");
    return null;
  }
}

async function checkSlackFeedback() {
  log("\n🔍 Checking Slack Feedback in Database...", "blue");

  try {
    const response = await axios.get(`${API_BASE}/feedback/source/slack`);
    const data = response.data;

    log(`📊 Total Slack feedback entries: ${data.count}`, "blue");

    if (data.feedbacks.length > 0) {
      log("\n📝 Recent Slack messages:", "blue");
      data.feedbacks.slice(0, 5).forEach((feedback, index) => {
        log(`${index + 1}. "${feedback.text}" (${feedback.time})`, "green");
      });
    } else {
      log("⚠️  No Slack messages found in database", "yellow");
    }

    return data.count;
  } catch (error) {
    log(`❌ Failed to check Slack feedback: ${error.message}`, "red");
    return 0;
  }
}

async function simulateSlackEvent() {
  log("\n🔍 Simulating Slack Event...", "blue");

  const testEvent = {
    event: {
      type: "message",
      text: "This is a test message from debugging tool",
      channel: "C1234567890",
      user: "U1234567890",
      ts: (Date.now() / 1000).toString(),
    },
  };

  try {
    const response = await axios.post(WEBHOOK_URL, testEvent);

    if (response.status === 200) {
      log("✅ Test event processed successfully", "green");

      // Wait a moment and check if it was saved
      setTimeout(async () => {
        const feedbackCount = await checkSlackFeedback();
        if (feedbackCount > 0) {
          log("✅ Test message was saved to database", "green");
        } else {
          log("⚠️  Test message was not saved to database", "yellow");
        }
      }, 1000);
    }
  } catch (error) {
    log(`❌ Failed to simulate Slack event: ${error.message}`, "red");
  }
}

async function testDatabaseConnection() {
  log("\n🔍 Testing Database Connection...", "blue");

  try {
    const response = await axios.get(`${API_BASE}/health`);
    log("✅ Backend is healthy", "green");

    const feedbackResponse = await axios.get(`${API_BASE}/feedback/count`);
    log(`📊 Total feedback entries: ${feedbackResponse.data.count}`, "blue");

    return true;
  } catch (error) {
    log(`❌ Database connection test failed: ${error.message}`, "red");
    return false;
  }
}

async function runDiagnostics() {
  log("🚀 Slack Integration Diagnostics Tool", "bold");
  log("=====================================", "bold");

  // Test 1: Database connection
  const dbOk = await testDatabaseConnection();
  if (!dbOk) {
    log("\n❌ Database connection failed. Please check your services.", "red");
    return;
  }

  // Test 2: Webhook endpoint
  const webhookOk = await testWebhookEndpoint();

  // Test 3: Integration status
  const integration = await checkIntegrationStatus();

  // Test 4: Existing Slack feedback
  const feedbackCount = await checkSlackFeedback();

  // Test 5: Simulate event (only if webhook is working)
  if (webhookOk) {
    await simulateSlackEvent();
  }

  // Summary
  log("\n📋 DIAGNOSTIC SUMMARY", "bold");
  log("====================", "bold");

  log(
    `Database Connection: ${dbOk ? "✅ OK" : "❌ FAILED"}`,
    dbOk ? "green" : "red"
  );
  log(
    `Webhook Endpoint: ${webhookOk ? "✅ OK" : "❌ FAILED"}`,
    webhookOk ? "green" : "red"
  );
  log(
    `Integration Status: ${
      integration
        ? integration.status === "connected"
          ? "✅ CONNECTED"
          : "❌ NOT CONNECTED"
        : "❌ NOT FOUND"
    }`,
    integration && integration.status === "connected" ? "green" : "red"
  );
  log(
    `Slack Messages: ${feedbackCount} found`,
    feedbackCount > 0 ? "green" : "yellow"
  );

  // Recommendations
  log("\n💡 RECOMMENDATIONS", "bold");
  log("==================", "bold");

  if (!webhookOk) {
    log("1. Check if backend service is running: docker-compose ps", "yellow");
    log("2. Verify webhook URL is accessible from internet", "yellow");
  }

  if (!integration || integration.status !== "connected") {
    log("3. Set up Slack integration in your app UI", "yellow");
    log("4. Make sure bot token and channels are configured", "yellow");
  }

  if (
    integration &&
    integration.status === "connected" &&
    feedbackCount === 0
  ) {
    log("5. Configure Event Subscriptions in Slack app settings", "yellow");
    log("6. Add bot to the channels you want to monitor", "yellow");
    log("7. Send test messages in monitored channels", "yellow");
  }

  if (
    webhookOk &&
    integration &&
    integration.status === "connected" &&
    feedbackCount === 0
  ) {
    log(
      "8. Most likely issue: Event Subscriptions not configured in Slack",
      "red"
    );
    log("   Go to api.slack.com/apps → Your App → Event Subscriptions", "red");
    log("   Enable Events and set Request URL to your webhook endpoint", "red");
  }
}

// Run diagnostics if this script is executed directly
if (require.main === module) {
  runDiagnostics().catch(console.error);
}

module.exports = {
  testWebhookEndpoint,
  checkIntegrationStatus,
  checkSlackFeedback,
  simulateSlackEvent,
  testDatabaseConnection,
  runDiagnostics,
};
