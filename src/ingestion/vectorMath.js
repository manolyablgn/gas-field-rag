// src/ingestion/vectorMath.js
// Saf matematik fonksiyonları - hiçbir native/ağır kütüphaneye bağımlı değil.
// Bu dosya bilinçli olarak @xenova/transformers import ETMEZ,
// çünkü Foundry Local ile aynı process'te DLL çakışmasına yol açıyor.

export function embeddingSimilarity(vecA, vecB) {
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}