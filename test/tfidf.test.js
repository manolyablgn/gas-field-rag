import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeTfidf, vectorizeQuery, cosineSimilarity } from "../src/ingestion/tfidf.js";

describe("cosineSimilarity", () => {
  test("özdeş vektörlerin benzerliği 1'e çok yakın olmalı", () => {
    const vecA = { kelime1: 0.5, kelime2: 0.3 };
    const sim = cosineSimilarity(vecA, vecA);
    assert.ok(Math.abs(sim - 1) < 1e-9, `beklenen ~1, gelen: ${sim}`);
  });

  test("hiç ortak kelimesi olmayan vektörlerin benzerliği 0 olmalı", () => {
    const vecA = { elma: 0.5 };
    const vecB = { armut: 0.5 };
    assert.equal(cosineSimilarity(vecA, vecB), 0);
  });

  test("boş vektörle karşılaştırma 0 döner (sıfıra bölme hatası olmamalı)", () => {
    assert.equal(cosineSimilarity({}, { a: 1 }), 0);
    assert.equal(cosineSimilarity({}, {}), 0);
  });

  test("kısmi örtüşen vektörler 0 ile 1 arasında bir skor verir", () => {
    const vecA = { vana: 0.6, bakım: 0.4 };
    const vecB = { vana: 0.5, kompresör: 0.5 };
    const sim = cosineSimilarity(vecA, vecB);
    assert.ok(sim > 0 && sim < 1, `beklenen 0-1 arası, gelen: ${sim}`);
  });
});

describe("computeTfidf + vectorizeQuery (gerçek senaryo testi)", () => {
  const chunks = [
    "vana bakımı ayda bir kez yapılmalıdır kritik hatlardaki vanalar haftalık kontrol edilir",
    "basınç seksen bar üzerine çıkarsa saha personeli derhal bölgeyi tahliye etmelidir",
    "kompresör denetimi haftada bir kez yapılmalıdır yağ seviyesi kontrol edilmelidir",
  ];

  test("aynı konudaki sorgu, doğru dokümanla en yüksek benzerliği vermeli", () => {
    const { idf, vectors } = computeTfidf(chunks);
    const query = "vana bakımı ne sıklıkla yapılmalı";
    const queryVec = vectorizeQuery(query, idf);

    const scores = vectors.map((v) => cosineSimilarity(queryVec, v));
    const bestIndex = scores.indexOf(Math.max(...scores));

    assert.equal(bestIndex, 0, "en yüksek skor 'vana bakımı' chunk'ında (index 0) olmalı");
  });

  test("tamamen alakasız sorgu düşük skor almalı", () => {
    const { idf, vectors } = computeTfidf(chunks);
    const query = "pizza tarifi nasıl yapılır";
    const queryVec = vectorizeQuery(query, idf);

    const scores = vectors.map((v) => cosineSimilarity(queryVec, v));
    const maxScore = Math.max(...scores);

    assert.ok(maxScore < 0.1, `alakasız sorgu için düşük skor bekleniyordu, gelen max: ${maxScore}`);
  });

  test("vocabulary'de olmayan kelimeler sorgu vektöründe yok sayılır (hata fırlatmaz)", () => {
    const { idf } = computeTfidf(chunks);
    assert.doesNotThrow(() => {
      vectorizeQuery("hiç alakasız yepyeni kelimeler burada", idf);
    });
  });
});