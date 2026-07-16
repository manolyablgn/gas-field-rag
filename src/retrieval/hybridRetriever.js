// src/retrieval/hybridRetriever.js
import { rerank } from "./reranker.js";
import { reciprocalRankFusion } from "./fusion.js";
import { db } from "../db/sqlite.js";
import { computeTfidf, vectorizeQuery, cosineSimilarity } from "../ingestion/tfidf.js";
import { embeddingSimilarity } from "../ingestion/vectorMath.js";
import { execFileSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "../config.js";
import { RetrievalError } from "../utils/errors.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const embedScriptPath = path.join(__dirname, "..", "ingestion", "embedQuery.js");

const RRF_K = 5;

function embedQuerySync(text) {
  const output = execFileSync("node", [embedScriptPath, text], { encoding: "utf-8" });
  const lines = output.trim().split("\n").filter(Boolean);
  return JSON.parse(lines[lines.length - 1]);
}

export async function hybridRetrieve(query, topK = config.retrieval.topK) {
  let rows;
  try {
    rows = db.prepare(`
      SELECT chunks.id, chunks.doc_id, chunks.chunk_text, chunks.tfidf_vector, chunks.embedding,
             documents.title, documents.category
      FROM chunks
      JOIN documents ON chunks.doc_id = documents.id
    `).all();
  } catch (err) {
    throw new RetrievalError(err);
  }

  if (rows.length === 0) return [];

  const chunkTexts = rows.map((r) => r.chunk_text);
  const { idf } = computeTfidf(chunkTexts);
  const queryTfidfVector = vectorizeQuery(query, idf);

  const lexicalScored = rows.map((row, i) => {
    const chunkVector = JSON.parse(row.tfidf_vector);
    const score = cosineSimilarity(queryTfidfVector, chunkVector);
    return { index: i, score };
  }).sort((a, b) => b.score - a.score);

  const queryEmbedding = embedQuerySync(query);
  const semanticScored = rows.map((row, i) => {
    const chunkEmbedding = JSON.parse(row.embedding);
    const score = embeddingSimilarity(queryEmbedding, chunkEmbedding);
    return { index: i, score };
  }).sort((a, b) => b.score - a.score);

  const rrfScores = reciprocalRankFusion(lexicalScored, semanticScored, config.retrieval.weights, RRF_K);

  const lexicalByIndex = new Map(lexicalScored.map((item) => [item.index, item.score]));
  const semanticByIndex = new Map(semanticScored.map((item) => [item.index, item.score]));

  const results = rows.map((row, i) => ({
    chunkId: row.id,
    docId: row.doc_id,
    title: row.title,
    category: row.category,
    text: row.chunk_text,
    rrfScore: rrfScores.get(i) || 0,
    rawLexicalScore: lexicalByIndex.get(i) || 0,
    rawSemanticScore: semanticByIndex.get(i) || 0,
  }));

  const topCandidates = results
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, Math.min(topK + 3, results.length));

  const reranked = await rerank(query, topCandidates);

  const seenDocs = new Set();
  const deduped = [];
  for (const chunk of reranked) {
    if (!seenDocs.has(chunk.docId)) {
      seenDocs.add(chunk.docId);
      deduped.push(chunk);
    }
  }

  return deduped.slice(0, topK);
}