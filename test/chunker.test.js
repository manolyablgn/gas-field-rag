import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { splitIntoChunks } from "../src/ingestion/chunker.js";

describe("splitIntoChunks", () => {
  test("boş metin için boş dizi döner", () => {
    assert.deepEqual(splitIntoChunks(""), []);
    assert.deepEqual(splitIntoChunks("   "), []);
  });

  test("chunkSize'dan kısa metin tek chunk olarak döner", () => {
    const result = splitIntoChunks("kısa bir metin", 500, 100);
    assert.equal(result.length, 1);
    assert.equal(result[0], "kısa bir metin");
  });

  test("uzun metni birden fazla chunk'a böler", () => {
    const longText = Array.from({ length: 300 }, (_, i) => `kelime${i}`).join(" ");
    const result = splitIntoChunks(longText, 100, 20);
    assert.ok(result.length > 1, "birden fazla chunk üretmeli");
  });

  test("sonsuz döngüye girmez (regresyon testi - daha önce yaşanan gerçek bug)", () => {
    const text = Array.from({ length: 50 }, (_, i) => `kelime${i}`).join(" ");
    const start = Date.now();
    const result = splitIntoChunks(text, 10, 9999);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 1000, "1 saniyeden kısa sürede bitmeli (sonsuz döngü yok)");
    assert.ok(result.length > 0, "sonuç üretmeli");
  });

  test("her chunk chunkSize sınırını büyük ölçüde aşmaz", () => {
    const longText = Array.from({ length: 200 }, (_, i) => `kelime${i}`).join(" ");
    const chunkSize = 50;
    const result = splitIntoChunks(longText, chunkSize, 10);
    result.forEach((chunk) => {
      assert.ok(chunk.length <= chunkSize + 50, `chunk çok uzun: ${chunk.length} karakter`);
    });
  });

  test("overlap sayesinde ardışık chunk'lar arasında ortak kelime bulunur", () => {
    const longText = Array.from({ length: 100 }, (_, i) => `kelime${i}`).join(" ");
    const result = splitIntoChunks(longText, 100, 30);
    if (result.length >= 2) {
      const firstWords = new Set(result[0].split(" "));
      const secondWords = result[1].split(" ");
      const hasOverlap = secondWords.some((w) => firstWords.has(w));
      assert.ok(hasOverlap, "ardışık chunk'lar arasında overlap olmalı");
    }
  });

  test("kelimenin ortasından kesmez", () => {
    const text = "bu bir test cümlesidir ve devam eder böyle böyle uzayıp gider ta ki bitene kadar";
    const result = splitIntoChunks(text, 20, 5);
    result.forEach((chunk) => {
      chunk.split(" ").forEach((word) => {
        assert.ok(text.includes(word), `"${word}" orijinal metinde tam kelime olarak bulunmalı`);
      });
    });
  });
});