// src/retrieval/hybridRetriever.js
// TF-IDF (lexical) ve embedding (semantic) sonuçlarını RRF ile birleştirir
import { rerank } from "./reranker.js";
import { db } from "../db/sqlite.js";
import { computeTfidf, vectorizeQuery, cosineSimilarity } from "../ingestion/tfidf.js";
import { embeddingSimilarity } from "../ingestion/vectorMath.js";
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const embedScriptPath = path.join(__dirname, "..", "ingestion", "embedQuery.js");

// Sorgu embedding'ini ayrı bir process'te hesaplar (Foundry Local ile DLL çakışmasını önlemek için)
function embedQuerySync(text) {
  const output = execFileSync("node", [embedScriptPath, text], { encoding: "utf-8" });
  const lines = output.trim().split("\n").filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}
import { config } from "../config.js";
import { getChatClient } from "../generation/foundryClient.js";

const RRF_K = 5; // küçük veri setleri için düşürülmüş sabit (daha net ayrım sağlar)

export async function hybridRetrieve(query, topK = config.retrieval.topK) {
  const rows = db.prepare(`
    SELECT chunks.id, chunks.doc_id, chunks.chunk_text, chunks.tfidf_vector, chunks.embedding,
           documents.title, documents.category
    FROM chunks
    JOIN documents ON chunks.doc_id = documents.id
  `).all();

  if (rows.length === 0) return [];

  // --- 1. Lexical (TF-IDF) sıralaması ---
  const chunkTexts = rows.map((r) => r.chunk_text);
  const { idf } = computeTfidf(chunkTexts);
  const queryTfidfVector = vectorizeQuery(query, idf);

  const lexicalScored = rows.map((row, i) => {
    const chunkVector = JSON.parse(row.tfidf_vector);
    const score = cosineSimilarity(queryTfidfVector, chunkVector);
    return { index: i, score };
  }).sort((a, b) => b.score - a.score);

  // --- 2. Semantic (embedding) sıralaması ---
  const queryEmbedding = embedQuerySync(query);
  const semanticScored = rows.map((row, i) => {
    const chunkEmbedding = JSON.parse(row.embedding);
    const score = embeddingSimilarity(queryEmbedding, chunkEmbedding);
    return { index: i, score };
  }).sort((a, b) => b.score - a.score);

  // --- 3. RRF füzyonu: her chunk'ın iki listedeki sırasına göre skor hesapla ---
  const rrfScores = new Map(); // index -> rrf score

  const { lexical: lexicalWeight, semantic: semanticWeight } = config.retrieval.weights;

  lexicalScored.forEach((item, rank) => {
    const current = rrfScores.get(item.index) || 0;
    rrfScores.set(item.index, current + lexicalWeight / (RRF_K + rank + 1));
  });

  semanticScored.forEach((item, rank) => {
    const current = rrfScores.get(item.index) || 0;
    rrfScores.set(item.index, current + semanticWeight / (RRF_K + rank + 1));
  });

  // --- 4. Sonuçları birleştir ve sırala ---
  const results = rows.map((row, i) => ({
    chunkId: row.id,
    docId: row.doc_id,
    title: row.title,
    category: row.category,
    text: row.chunk_text,
    rrfScore: rrfScores.get(i) || 0,
  }));

  const topCandidates = results
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, Math.min(topK + 3, results.length)); // biraz daha fazla aday al, sonra rerank ile daralt

  const reranked = await rerank(query, topCandidates);

  // Aynı dokümandan birden fazla chunk varsa, en iyi sıradaki tek chunk'ı tut
  const seenDocs = new Set();
  const deduped = [];
  for (const chunk of reranked) {
    if (!seenDocs.has(chunk.docId)) {
      seenDocs.add(chunk.docId);
      deduped.push(chunk);
    }
  }

  // topK bir ÜST SINIR, model daha azını "alakalı" bulduysa daha az sonuç dönebilir
  return deduped.slice(0, topK);
}