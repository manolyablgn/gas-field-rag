// src/config.js
// Projenin tüm ayarlarını buradan yönetiyoruz. Sunucu başlarken bu ayarlar
// otomatik olarak doğrulanır (validateConfig) — geçersiz bir ayar varsa
// sistem hemen, anlaşılır bir hatayla durur; yarım yamalak çalışmaz.
import dotenv from "dotenv";
dotenv.config();
import { ConfigError } from "./utils/errors.js";

export const config = {
  // Foundry Local'de kullanılacak modeller (foundry model list çıktısındaki "Alias" sütunu)
  model: process.env.GENERATION_MODEL || "qwen2.5-7b",        // hızlı, cevap üretme (generation) için
  rerankModel: process.env.RERANK_MODEL || "qwen2.5-7b",        // güçlü, alaka değerlendirme (reranking) için

  // Sunucu ayarları
  port: parseInt(process.env.PORT, 10) || 3000,

  // Doküman parçalama (chunking) ayarları
  chunking: {
    chunkSize: 500,      // her parçanın yaklaşık karakter sayısı
    chunkOverlap: 100,   // parçalar arası örtüşme (bağlamı korumak için)
  },

  // Retrieval (getirme) ayarları
  retrieval: {
    topK: 3,
    minScoreThreshold: 0.1,
    absoluteRelevanceThreshold: 6,   // 0-10 üzerinden, bunun altındaki adaylar elenir
    weights: {
      lexical: 1.0,
      semantic: 1.3,
    },
    // Grounding guard: ikisi de bu eşiğin altındaysa modele hiç sormadan
    // "bilgi bulamadım" dönülür (uydurma riskini sıfırlar, hızlıdır)
    groundingThresholds: {
      minLexicalScore: 0.03,
      minSemanticScore: 0.35, // eval verisine dayanarak kalibre edildi: off-topic sorular
                               // max 0.223 semantic skor alırken, gerçek/paraphrase sorular
                               // 0.25-0.48 arası çıkıyor - 0.35 güvenli bir ayrım noktası
    },
  },

  // Veritabanı dosya yolu
  dbPath: process.env.DB_PATH || "./data/rag.db",

  // Doküman klasörü
  docsPath: process.env.DOCS_PATH || "./docs",
};

export function validateConfig(cfg) {
  const errors = [];

  if (!cfg.model || typeof cfg.model !== "string") {
    errors.push("config.model tanımlı bir string olmalı (örn. 'qwen2.5-1.5b')");
  }
  if (!cfg.rerankModel || typeof cfg.rerankModel !== "string") {
    errors.push("config.rerankModel tanımlı bir string olmalı");
  }
  if (!Number.isInteger(cfg.port) || cfg.port <= 0 || cfg.port > 65535) {
    errors.push("config.port 1-65535 arası bir tam sayı olmalı");
  }
  if (!cfg.chunking || cfg.chunking.chunkSize <= 0) {
    errors.push("config.chunking.chunkSize pozitif bir sayı olmalı");
  }
  if (cfg.chunking && cfg.chunking.chunkOverlap >= cfg.chunking.chunkSize) {
    errors.push("config.chunking.chunkOverlap, chunkSize'dan küçük olmalı");
  }
  if (!cfg.retrieval || !Number.isInteger(cfg.retrieval.topK) || cfg.retrieval.topK < 1) {
    errors.push("config.retrieval.topK pozitif bir tam sayı olmalı");
  }
  if (
    cfg.retrieval &&
    (cfg.retrieval.absoluteRelevanceThreshold < 0 || cfg.retrieval.absoluteRelevanceThreshold > 10)
  ) {
    errors.push("config.retrieval.absoluteRelevanceThreshold 0-10 arasında olmalı");
  }
  if (!cfg.retrieval?.groundingThresholds) {
    errors.push("config.retrieval.groundingThresholds tanımlı olmalı");
  }
  if (!cfg.docsPath) {
    errors.push("config.docsPath tanımlı olmalı");
  }
  if (!cfg.dbPath) {
    errors.push("config.dbPath tanımlı olmalı");
  }

  if (errors.length > 0) {
    throw new ConfigError(errors);
  }
}

// Modül yüklendiği anda otomatik doğrula — geçersiz config'le hiçbir şey çalışmasın
validateConfig(config);