// src/ingestion/embeddings.js
// Metinleri semantic (anlamsal) vektörlere çevirir - çoklu dil destekli küçük model

import { pipeline, env } from "@xenova/transformers";

// Native (onnxruntime-node) yerine WASM motorunu kullan —
// Foundry Local'in kendi native ONNX Runtime'ıyla DLL çakışmasını önler
env.backends.onnx.wasm.numThreads = 1;

let embedder = null;

// Modeli bir kez yükler (ilk çağrıda otomatik indirilir, ~470MB)
async function getEmbedder() {
  if (embedder) return embedder;
  console.log("🧠 Embedding modeli yükleniyor (ilk seferde indirilecek)...");
  embedder = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
  );
  console.log("✅ Embedding modeli hazır.");
  return embedder;
}

// Tek bir metni vektöre çevirir
export async function embedText(text) {
  const model = await getEmbedder();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// Birden fazla metni sırayla vektöre çevirir
export async function embedTexts(texts) {
  const model = await getEmbedder();
  const vectors = [];
  for (const text of texts) {
    const output = await model(text, { pooling: "mean", normalize: true });
    vectors.push(Array.from(output.data));
  }
  return vectors;
}

// İki dense vektör arasında kosinüs benzerliği (embedding'ler zaten normalize edildiği için basit dot product yeterli)
export function embeddingSimilarity(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}