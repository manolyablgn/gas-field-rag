import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { reciprocalRankFusion } from "../src/retrieval/fusion.js";
import { embeddingSimilarity } from "../src/ingestion/vectorMath.js";

describe("embeddingSimilarity", () => {
  test("normalize edilmiş özdeş vektörlerin dot product'ı 1'dir", () => {
    const vec = [0.6, 0.8];
    const sim = embeddingSimilarity(vec, vec);
    assert.ok(Math.abs(sim - 1) < 1e-9);
  });

  test("dik (orthogonal) vektörlerin dot product'ı 0'dır", () => {
    assert.equal(embeddingSimilarity([1, 0], [0, 1]), 0);
  });
});

describe("reciprocalRankFusion", () => {
  test("her iki listede de 1. sırada olan chunk en yüksek RRF skorunu alır", () => {
    const lexicalScored = [{ index: 2, score: 0.9 }, { index: 0, score: 0.5 }, { index: 1, score: 0.1 }];
    const semanticScored = [{ index: 2, score: 0.8 }, { index: 1, score: 0.4 }, { index: 0, score: 0.2 }];
    const weights = { lexical: 1.0, semantic: 1.0 };

    const rrfScores = reciprocalRankFusion(lexicalScored, semanticScored, weights, 60);
    const sorted = [...rrfScores.entries()].sort((a, b) => b[1] - a[1]);

    assert.equal(sorted[0][0], 2, "index 2 her iki listede de 1. sırada, en yüksek RRF skoru olmalı");
  });

  test("semantic ağırlığı artırılırsa, sadece semantic'te iyi olan chunk öne çıkar", () => {
    const lexicalScored = [{ index: 0 }, { index: 2 }, { index: 1 }];
    const semanticScored = [{ index: 1 }, { index: 2 }, { index: 0 }];

    const equalWeights = { lexical: 1.0, semantic: 1.0 };
    const semanticHeavy = { lexical: 1.0, semantic: 5.0 };

    const equalResult = reciprocalRankFusion(lexicalScored, semanticScored, equalWeights, 60);
    const semanticResult = reciprocalRankFusion(lexicalScored, semanticScored, semanticHeavy, 60);

    assert.ok(Math.abs(equalResult.get(0) - equalResult.get(1)) < 1e-9);
    assert.ok(
      semanticResult.get(1) > semanticResult.get(0),
      "semantic ağırlığı artınca semantic'te iyi olan chunk öne geçmeli"
    );
  });

  test("bir listede hiç görünmeyen index sadece diğer listeden skor alır", () => {
    const lexicalScored = [{ index: 0 }];
    const semanticScored = [];
    const weights = { lexical: 1.0, semantic: 1.0 };

    const result = reciprocalRankFusion(lexicalScored, semanticScored, weights, 60);
    assert.ok(result.get(0) > 0, "sadece lexical'dan gelen skor da pozitif olmalı");
  });
});