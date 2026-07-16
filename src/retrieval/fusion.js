// src/retrieval/fusion.js
// Reciprocal Rank Fusion: iki ayrı sıralamayı (lexical, semantic) tek bir skora birleştirir.
// Saf/pure fonksiyon - DB veya model bağımlılığı yok, bu yüzden bağımsız test edilebilir.

export function reciprocalRankFusion(lexicalScored, semanticScored, weights, rrfK) {
  const rrfScores = new Map();
  const { lexical: lexicalWeight, semantic: semanticWeight } = weights;

  lexicalScored.forEach((item, rank) => {
    const current = rrfScores.get(item.index) || 0;
    rrfScores.set(item.index, current + lexicalWeight / (rrfK + rank + 1));
  });

  semanticScored.forEach((item, rank) => {
    const current = rrfScores.get(item.index) || 0;
    rrfScores.set(item.index, current + semanticWeight / (rrfK + rank + 1));
  });

  return rrfScores;
}