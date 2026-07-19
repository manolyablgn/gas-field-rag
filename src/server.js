// src/server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { askQuestion, askQuestionStreaming } from "./generation/chatEngine.js";
import { config } from "./config.js";
import { db } from "./db/sqlite.js";
import { AppError } from "./utils/errors.js";
import multer from "multer";
import fs from "fs";
import { validateUploadFilename, sanitizeUploadFilename } from "./ingestion/uploadValidation.js";
import { ingestAll } from "./ingest.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "..", "public")));

app.post("/api/chat", async (req, res) => {
  const { question } = req.body;

  if (typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "Geçerli bir 'question' alanı gerekli." });
  }
  if (question.length > 500) {
    return res.status(400).json({ error: "Soru çok uzun (maksimum 500 karakter)." });
  }

  try {
    const result = await askQuestion(question.trim());
    res.json(result);
  } catch (err) {
    if (err instanceof AppError) {
      console.error(`❌ [${err.code}]`, err.message);
      const status = err.code === "VALIDATION_ERROR" || err.code === "CONFIG_INVALID" ? 400 : 503;
      return res.status(status).json({
        error: err.isRecoverable
          ? "Şu an bir sorun yaşıyoruz, lütfen birkaç saniye sonra tekrar deneyin."
          : err.message,
        code: err.code,
      });
    }
    console.error("❌ Beklenmeyen hata:", err);
    res.status(500).json({ error: "Bir hata oluştu, tekrar deneyin." });
  }
});

app.post("/api/chat/stream", async (req, res) => {
  const { question } = req.body;

  if (typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "Geçerli bir 'question' alanı gerekli." });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const result = await askQuestionStreaming(question.trim(), (token) => {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    });
    res.write(`data: ${JSON.stringify({ done: true, sources: result.sources })}\n\n`);
  } catch (err) {
    console.error("❌ Streaming hatası:", err.message);
    res.write(`data: ${JSON.stringify({ error: "Bir hata oluştu, tekrar deneyin." })}\n\n`);
  }

  res.end();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

app.post("/api/upload", upload.single("document"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Dosya bulunamadı." });
  }

  const { originalname, buffer } = req.file;
  const validation = validateUploadFilename(originalname);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.errors.join(" ") });
  }

  const safeFilename = sanitizeUploadFilename(originalname);
  const destPath = path.join(__dirname, "..", "docs", safeFilename);

  try {
    fs.writeFileSync(destPath, buffer);
  } catch (err) {
    console.error("❌ Dosya yazılamadı:", err.message);
    return res.status(500).json({ error: "Dosya kaydedilemedi." });
  }

  try {
    console.log(`📥 Yeni doküman yüklendi: ${safeFilename}, yeniden indeksleniyor...`);
    const result = await ingestAll();
    res.json({ success: true, filename: safeFilename, ...result });
  } catch (err) {
    console.error("❌ Yeniden indeksleme başarısız:", err.message);
    res.status(500).json({ error: "Dosya kaydedildi ama yeniden indeksleme başarısız oldu, sunucuyu yeniden başlatmayı deneyin." });
  }
});

app.get("/api/status", (req, res) => {
  let dbOk = false;
  try {
    db.prepare("SELECT 1").get();
    dbOk = true;
  } catch (err) {
    console.error("❌ DB durum kontrolü başarısız:", err.message);
    dbOk = false;
  }

  res.json({
    status: dbOk ? "ok" : "degraded",
    db: dbOk,
    model: config.model,
    rerankModel: config.rerankModel,
  });
});

const server = app.listen(config.port, () => {
  console.log(`\n🌐 Sunucu çalışıyor: http://localhost:${config.port}\n`);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Yakalanmamış hata:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("❌ Yakalanmamış promise reddi:", err);
});

function shutdown() {
  console.log("\n🛑 Sunucu kapatılıyor...");
  server.close(() => {
    db.close();
    console.log("✅ Veritabanı kapatıldı, güle güle.");
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);