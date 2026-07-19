import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { embedTextsSync } from "../src/ingestion/embedBatchSync.js";

describe("embedTextsSync - alt process izolasyonu", () => {
  test("birden fazla metin için doğru sayıda vektör döner", () => {
    const texts = ["birinci metin", "ikinci metin", "üçüncü metin"];
    const results = embedTextsSync(texts);
    assert.equal(results.length, 3);
  });

  test("her vektör bir sayı dizisidir", () => {
    const results = embedTextsSync(["test metni"]);
    assert.ok(Array.isArray(results[0]));
    results[0].forEach((n) => assert.equal(typeof n, "number"));
  });

  test("boş dizi için boş sonuç döner, hata fırlatmaz", () => {
    assert.doesNotThrow(() => {
      const results = embedTextsSync([]);
      assert.deepEqual(results, []);
    });
  });
});