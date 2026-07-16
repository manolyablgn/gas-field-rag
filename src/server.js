// src/server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { askQuestion } from "./generation/chatEngine.js";
import { config } from "./config.js";
import { db } from "./db/sqlite.js";
import { AppError } from "./utils/errors.js";

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