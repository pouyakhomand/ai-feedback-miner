const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://localhost:27017/ai_feedback_miner",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
  console.log("Connected to MongoDB");
});

// Models
const feedbackSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  text: { type: String, required: true },
  source: { type: String, required: true },
  time: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

const integrationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ["slack", "zendesk", "productboard", "jira", "hubspot"],
  },
  name: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ["connected", "disconnected", "error"],
    default: "disconnected",
  },
  config: {
    webhookUrl: String,
    botToken: String,
    channels: [String],
    workspaceId: String,
    lastSync: Date,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const analysisSchema = new mongoose.Schema({
  params: {
    n_clusters: { type: Number, default: 5 },
    limit: { type: Number, default: 1000 },
    dataSource: {
      type: String,
      enum: ["database", "file"],
      default: "database",
    },
  },
  summary: {
    items: [
      {
        text: String,
        clean: String,
        cluster: Number,
        sentiment: Number,
      },
    ],
    clusters: [
      {
        cluster: Number,
        label: String,
        keywords: [String],
        volume: Number,
        avg_sentiment: Number,
        roi: Number,
      },
    ],
  },
  createdAt: { type: Date, default: Date.now },
});

const Feedback = mongoose.model("Feedback", feedbackSchema);
const Integration = mongoose.model("Integration", integrationSchema);
const Analysis = mongoose.model("Analysis", analysisSchema);

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Routes

// Health check
app.get("/health", (req, res) => {
  console.log("Health check invoked");
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Upload feedback endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const feedbacks = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on("data", (row) => {
          if (row.text && row.text.trim()) {
            feedbacks.push({
              id:
                row.id ||
                `upload_${Date.now()}_${Math.random()
                  .toString(36)
                  .substr(2, 9)}`,
              text: row.text.trim(),
              source: row.source || "upload",
              time: row.time ? new Date(row.time) : new Date(),
            });
          }
        })
        .on("end", resolve)
        .on("error", reject);
    });

    if (feedbacks.length === 0) {
      fs.unlinkSync(filePath); // Clean up file
      return res.status(400).json({ error: "No valid feedback found in file" });
    }

    // Save to database
    const savedFeedbacks = await Feedback.insertMany(feedbacks);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      message: "File uploaded successfully",
      inserted: savedFeedbacks.length,
      feedbacks: savedFeedbacks,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res
      .status(500)
      .json({ error: "Failed to process file", details: error.message });
  }
});

// Analyze feedback endpoint
app.post("/analyze", async (req, res) => {
  try {
    const {
      n_clusters = 5,
      limit = 1000,
      dataSource = "database",
      fileData,
    } = req.body;

    let texts = [];

    if (dataSource === "database") {
      // Get feedback from database
      const feedbacks = await Feedback.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .select("text");

      texts = feedbacks.map((f) => f.text);
    } else if (dataSource === "file" && fileData) {
      // Use provided file data
      texts = fileData.map((item) => item.text);
    }

    if (texts.length === 0) {
      return res.json({ items: [], clusters: [] });
    }

    // Call Python brain service
    const analysisResult = await callBrainService(texts, n_clusters);

    // Save analysis result
    const analysis = new Analysis({
      params: { n_clusters, limit, dataSource },
      summary: analysisResult,
    });
    await analysis.save();

    res.json(analysisResult);
  } catch (error) {
    console.error("Analysis error:", error);
    res
      .status(500)
      .json({ error: "Failed to analyze feedback", details: error.message });
  }
});

// Get analysis results
app.get("/analysis", async (req, res) => {
  try {
    const analyses = await Analysis.find().sort({ createdAt: -1 }).limit(10);

    res.json(analyses);
  } catch (error) {
    console.error("Get analysis error:", error);
    res.status(500).json({ error: "Failed to get analysis results" });
  }
});

// Get feedback count
app.get("/feedback/count", async (req, res) => {
  try {
    const count = await Feedback.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error("Count error:", error);
    res.status(500).json({ error: "Failed to get feedback count" });
  }
});

// Integration endpoints
app.get("/integrations", async (req, res) => {
  try {
    const integrations = await Integration.find().sort({ createdAt: -1 });
    res.json(integrations);
  } catch (error) {
    console.error("Get integrations error:", error);
    res.status(500).json({ error: "Failed to get integrations" });
  }
});

app.post("/integrations/slack/connect", async (req, res) => {
  try {
    const { botToken, channels, workspaceId } = req.body;

    if (!botToken || !channels || !workspaceId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Check if Slack integration already exists
    let integration = await Integration.findOne({ type: "slack" });

    if (integration) {
      // Update existing integration
      integration.status = "connected";
      integration.config = {
        botToken,
        channels,
        workspaceId,
        lastSync: new Date(),
      };
      integration.updatedAt = new Date();
    } else {
      // Create new integration
      integration = new Integration({
        type: "slack",
        name: "Slack",
        status: "connected",
        config: {
          botToken,
          channels,
          workspaceId,
          lastSync: new Date(),
        },
      });
    }

    await integration.save();

    res.json({
      message: "Slack integration connected successfully",
      integration: {
        id: integration._id,
        type: integration.type,
        name: integration.name,
        status: integration.status,
        channels: integration.config.channels,
        lastSync: integration.config.lastSync,
      },
    });
  } catch (error) {
    console.error("Slack connect error:", error);
    res.status(500).json({ error: "Failed to connect Slack integration" });
  }
});

app.post("/integrations/slack/disconnect", async (req, res) => {
  try {
    const integration = await Integration.findOne({ type: "slack" });

    if (!integration) {
      return res.status(404).json({ error: "Slack integration not found" });
    }

    integration.status = "disconnected";
    integration.config = {
      botToken: "",
      channels: [],
      workspaceId: "",
      lastSync: null,
    };
    integration.updatedAt = new Date();

    await integration.save();

    res.json({ message: "Slack integration disconnected successfully" });
  } catch (error) {
    console.error("Slack disconnect error:", error);
    res.status(500).json({ error: "Failed to disconnect Slack integration" });
  }
});

// Slack webhook endpoint
app.post("/webhooks/slack", async (req, res) => {
  console.log("Slack webhook invoked");
  try {
    const { event, challenge } = req.body;
    console.log("Slack webhook body:", req.body);
    // Handle Slack URL verification
    if (challenge) {
      console.log("Slack webhook challenge:", challenge);
      return res.send(challenge);
    }

    console.log("Slack webhook event:", event);
    // Handle message events
    if (event && event.type === "message" && event.text && !event.bot_id) {
      const integration = await Integration.findOne({
        type: "slack",
        status: "connected",
      });

      if (integration && integration.config.channels.includes(event.channel)) {
        // Save message as feedback
        const feedback = new Feedback({
          id: `slack_${event.ts}_${event.user}`,
          text: event.text,
          source: "slack",
          time: new Date(parseFloat(event.ts) * 1000),
        });

        await feedback.save();
        console.log(`New Slack feedback saved: ${event.text}`);
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Slack webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// Get feedback by source
app.get("/feedback/source/:source", async (req, res) => {
  try {
    const { source } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const feedbacks = await Feedback.find({ source })
      .sort({ time: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const count = await Feedback.countDocuments({ source });

    res.json({
      feedbacks,
      count,
      hasMore: parseInt(offset) + feedbacks.length < count,
    });
  } catch (error) {
    console.error("Get feedback by source error:", error);
    res.status(500).json({ error: "Failed to get feedback by source" });
  }
});

// Helper function to call Python brain service
async function callBrainService(texts, n_clusters) {
  const axios = require("axios");

  try {
    const response = await axios.post(
      "http://brain:5000/analyze",
      {
        texts: texts,
        n_clusters: n_clusters,
      },
      {
        timeout: 120000, // 2 minute timeout for Gemini API calls
      }
    );

    return response.data;
  } catch (error) {
    console.error("Brain service error:", error.message);
    throw new Error(`Brain service failed: ${error.message}`);
  }
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
