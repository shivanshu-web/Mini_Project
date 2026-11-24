import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Middleware
app.use(helmet());
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());
app.use(morgan("dev"));

// In-memory store for recent predictions (last 10 comparisons)
const recentPredictions = [];

// Reusable Axios client for the Python ML Microservice
const mlClient = axios.create({
  baseURL: ML_SERVICE_URL,
  timeout: 10000,
});

// 1. Combined Health Check (Express + Python ML Service)
app.get("/api/health", async (req, res) => {
  try {
    const mlHealth = await mlClient.get("/health");
    res.json({
      status: "ok",
      backend: "running",
      mlService: mlHealth.data,
    });
  } catch (error) {
    res.status(503).json({
      status: "degraded",
      backend: "running",
      mlService: "unreachable",
      message: "Python ML microservice is not responding.",
    });
  }
});

// 2. Fetch Model Categories & Dropdown Options
app.get("/api/metadata", async (req, res) => {
  try {
    const { data } = await mlClient.get("/metadata");
    res.json(data);
  } catch (error) {
    console.error("Metadata fetch error:", error.message);
    res.status(502).json({
      error: "Failed to load laptop specification options from ML service.",
    });
  }
});

// 3. Predict Laptop Price
app.post("/api/predict", async (req, res) => {
  try {
    const payload = {
      company: req.body.company,
      type_name: req.body.type_name,
      ram: Number(req.body.ram),
      gpu: req.body.gpu,
      op_sys: req.body.op_sys,
      cpu_brand: req.body.cpu_brand,
      ssd: Number(req.body.ssd),
      screen_size: Number(req.body.screen_size),
      resolution: req.body.resolution,
    };

    const { data } = await mlClient.post("/predict", payload);

    const record = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      specs: payload,
      prediction: data,
    };

    recentPredictions.unshift(record);
    if (recentPredictions.length > 10) recentPredictions.pop();

    res.json(record);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        error: "Invalid laptop specifications provided.",
        details: error.response.data,
      });
    }
    console.error("Prediction gateway error:", error.message);
    res.status(502).json({
      error: "Unable to connect to the ML prediction service.",
    });
  }
});

// 4. Get Recent Predictions History
app.get("/api/history", (req, res) => {
  res.json(recentPredictions);
});

app.listen(PORT, () => {
  console.log(`Express API Gateway running at http://localhost:${PORT}`);
  console.log(`Connected to ML Service at ${ML_SERVICE_URL}`);
});