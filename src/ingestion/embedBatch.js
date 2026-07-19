// src/ingestion/embedBatch.js
// Bağımsız script: birden fazla metni embedding vektörlerine çevirir, JSON dizisi olarak yazdırır.
// stdin'den JSON dizi (string[]) okur, stdout'a JSON dizi (number[][]) yazar.
// Foundry Local ile aynı process'te ÇALIŞMADIĞI için DLL çakışması olmaz.

import { pipeline, env } from "@xenova/transformers";

env.backends.onnx.wasm.numThreads = 1;

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

async function main() {
  const input = await readStdin();
  const texts = JSON.parse(input);

  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
  );

  const results = [];
  for (const text of texts) {
    const output = await embedder(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data));
  }

  console.log(JSON.stringify(results));
}

main();