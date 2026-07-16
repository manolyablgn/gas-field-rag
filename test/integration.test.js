import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeTfidf, vectorizeQuery, cosineSimilarity } from "../src/ingestion/tfidf.js";
import { reciprocalRankFusion } from "../src/retrieval/fusion.js";

describe("Hybrid retrieval akışı (entegrasyon simülasyonu)", () => {
  const chunks = [
    { title: "Vana Bakım Prosedürü", text: "vana bakımı ayda bir kez yapılmalıdır kritik hatlardaki vanalar haftalık kontrol edilir" },
    { title: "Pipeline Basınç Güvenlik Prosedürü", text: "basınç seksen bar üzerine çıkarsa saha personeli derhal bölgeyi tahliye etmelidir" },
    { title: "Kompresör Denetim Prosedürü", text: "kompresör denetimi haftada bir kez yapılmalıdır yağ seviyesi kontrol edilmelidir" },
  ];

  const fakeEmbeddings = [
    [0.9, 0.1, 0.1],
    [0.1, 0.9, 0.1],
    [0.2, 0.1, 0.8],
  ];
  const fakeQueryEmbedding = [0.85, 0.15, 0.15];

  function dot(a, b) {
    return a.reduce((sum, v, i) => sum + v * b[i], 0);
  }

  test("vana ile ilgili sorgu, hem lexical hem semantic sinyalle doğru chunk'ı bulur", () => {
    const chunkTexts = chunks.map((c) => c.text);
    const { idf, vectors } = computeTfidf(chunkTexts);
    const query = "vana bakımı ne sıklıkla yapılmalı";
    const queryVec = vectorizeQuery(query, idf);

    const lexicalScored = vectors
      .map((v, i) => ({ index: i, score: cosineSimilarity(queryVec, v) }))
      .sort((a, b) => b.score - a.score);

    const semanticScored = fakeEmbeddings
      .map((v, i) => ({ index: i, score: dot(fakeQueryEmbedding, v) }))
      .sort((a, b) => b.score - a.score);

    const weights = { lexical: 1.0, semantic: 1.3 };
    const rrfScores = reciprocalRankFusion(lexicalScored, semanticScored, weights, 5);

    const ranked = [...rrfScores.entries()].sort((a, b) => b[1] - a[1]);
    const topIndex = ranked[0][0];

    assert.equal(chunks[topIndex].title, "Vana Bakım Prosedürü");
  });

  test("iki farklı ağırlık konfigürasyonu farklı ama tutarlı sonuç üretir", () => {
    const chunkTexts = chunks.map((c) => c.text);
    const { idf, vectors } = computeTfidf(chunkTexts);
    const query = "vana bakımı ne sıklıkla yapılmalı";
    const queryVec = vectorizeQuery(query, idf);

    const lexicalScored = vectors
      .map((v, i) => ({ index: i, score: cosineSimilarity(queryVec, v) }))
      .sort((a, b) => b.score - a.score);
    const semanticScored = fakeEmbeddings
      .map((v, i) => ({ index: i, score: dot(fakeQueryEmbedding, v) }))
      .sort((a, b) => b.score - a.score);

    const lexicalOnly = reciprocalRankFusion(lexicalScored, semanticScored, { lexical: 10, semantic: 0.01 }, 5);
    const semanticOnly = reciprocalRankFusion(lexicalScored, semanticScored, { lexical: 0.01, semantic: 10 }, 5);

    const lexicalWinner = [...lexicalOnly.entries()].sort((a, b) => b[1] - a[1])[0][0];
    assert.equal(lexicalWinner, lexicalScored[0].index);

    const semanticWinner = [...semanticOnly.entries()].sort((a, b) => b[1] - a[1])[0][0];
    assert.equal(semanticWinner, semanticScored[0].index);
  });
});