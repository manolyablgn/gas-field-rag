// src/server.js
// Express sunucusu: UI'ı servis eder, chat endpoint'i sağlar

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { askQuestion } from "./generation/chatEngine.js";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  const { question } = req.body;

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Geçerli bir 'question' alanı gerekli." });
  }

  try {
    const result = await askQuestion(question);
    res.json(result);
  } catch (err) {
    console.error("❌ Chat hatası:", err);
    res.status(500).json({ error: "Bir hata oluştu, tekrar deneyin." });
  }
});

// Basit durum endpoint'i
app.get("/api/status", (req, res) => {
  res.json({ status: "ok", model: config.model });
});

app.listen(config.port, () => {
  console.log(`\n🌐 Sunucu çalışıyor: http://localhost:${config.port}\n`);
});