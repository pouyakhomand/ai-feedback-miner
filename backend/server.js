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
  text: { type: String, required: true },
  source: { type: String, default: "upload" },
  createdAt: { type: Date, default: Date.now },
});

const analysisSchema = new mongoose.Schema({
  params: {
    n_clusters: { type: Number, default: 5 },
    limit: { type: Number, default: 1000 },
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
              text: row.text.trim(),
              source: row.source || "upload",
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
    const { n_clusters = 5, limit = 1000 } = req.body;

    // Get feedback from database
    const feedbacks = await Feedback.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select("text");

    if (feedbacks.length === 0) {
      return res.json({ items: [], clusters: [] });
    }

    const texts = feedbacks.map((f) => f.text);

    // Call Python brain service
    const analysisResult = await callBrainService(texts, n_clusters);

    // Save analysis result
    const analysis = new Analysis({
      params: { n_clusters, limit },
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
