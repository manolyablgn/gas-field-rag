// src/retrieval/tfidfRetriever.js
// Kullanıcı sorgusunu alır, veritabanındaki chunk'larla karşılaştırıp en alakalı olanları döner

import { db } from "../db/sqlite.js";
import { computeTfidf, vectorizeQuery, cosineSimilarity } from "../ingestion/tfidf.js";
import { config } from "../config.js";

export function retrieve(query, topK = config.retrieval.topK) {
  // Tüm chunk'ları veritabanından çek
  const rows = db.prepare(`
    SELECT chunks.id, chunks.doc_id, chunks.chunk_text, chunks.tfidf_vector,
           documents.title, documents.category
    FROM chunks
    JOIN documents ON chunks.doc_id = documents.id
  `).all();

  if (rows.length === 0) return [];

  // Vocabulary ve idf'i yeniden hesaplamak yerine, kayıtlı vektörlerden idf'i türetiyoruz.
  // Basitlik için: sorguyu, tüm chunk metinleri üzerinden anlık hesaplanan idf ile vektörleştiriyoruz.
  const chunkTexts = rows.map((r) => r.chunk_text);
  const { idf } = computeTfidf(chunkTexts);

  const queryVector = vectorizeQuery(query, idf);

  // Her chunk için benzerlik skoru hesapla
  const scored = rows.map((row) => {
    const chunkVector = JSON.parse(row.tfidf_vector);
    const score = cosineSimilarity(queryVector, chunkVector);
    return {
      chunkId: row.id,
      docId: row.doc_id,
      title: row.title,
      category: row.category,
      text: row.chunk_text,
      score,
    };
  });

  // Skora göre sırala, eşik altını ele, topK kadarını döndür
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((r) => r.score >= config.retrieval.minScoreThreshold)
    .slice(0, topK);
}