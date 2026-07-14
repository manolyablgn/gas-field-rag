// src/db/sqlite.js
// SQLite veritabanı bağlantısı ve tablo şeması

import Database from "better-sqlite3";
import { config } from "../config.js";
import fs from "fs";
import path from "path";

// data/ klasörü yoksa oluştur
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.dbPath);

// Performans için WAL modunu aktif et
db.pragma("journal_mode = WAL");

// Tabloları oluştur (yoksa)
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    filename TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chunks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id TEXT NOT NULL,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    tfidf_vector TEXT,
    embedding TEXT,
    FOREIGN KEY (doc_id) REFERENCES documents(id)
  );

  CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);
`);

console.log("✅ Veritabanı hazır:", config.dbPath);