// src/ingestion/embedQuery.js
// Bağımsız script: bir metni embedding vektörüne çevirir, JSON olarak yazdırır.
// Foundry Local ile aynı process'te çalışmadığı için DLL çakışması olmaz.

import { pipeline } from "@xenova/transformers";

const text = process.argv[2];

if (!text) {
  console.error("Kullanım: node embedQuery.js \"metin\"");
  process.exit(1);
}

const embedder = await pipeline(
  "feature-extraction",
  "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
);
const output = await embedder(text, { pooling: "mean", normalize: true });
console.log(JSON.stringify(Array.from(output.data)));