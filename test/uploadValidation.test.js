import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { validateUploadFilename, sanitizeUploadFilename } from "../src/ingestion/uploadValidation.js";

describe("validateUploadFilename - güvenlik testleri", () => {
  test("geçerli bir .md dosya adını kabul eder", () => {
    assert.equal(validateUploadFilename("rapor.md").valid, true);
  });

  test("geçerli bir .pdf dosya adını kabul eder", () => {
    assert.equal(validateUploadFilename("rapor.pdf").valid, true);
  });

  test("path traversal denemesini reddeder (../ ile)", () => {
    const result = validateUploadFilename("../../etc/passwd.md");
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("klasör ayırıcı")));
  });

  test("Windows tarzı path traversal denemesini reddeder (..\\ ile)", () => {
    assert.equal(validateUploadFilename("..\\..\\Windows\\System32\\evil.md").valid, false);
  });

  test("içinde klasör ayırıcı olan adı da reddeder", () => {
    assert.equal(validateUploadFilename("klasor/dosya.md").valid, false);
  });

  test("desteklenmeyen uzantıyı reddeder", () => {
    const result = validateUploadFilename("script.exe");
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("yüklenebilir")));
  });

  test("çift uzantı ile kaçırma denemesini reddeder", () => {
    assert.equal(validateUploadFilename("virus.md.exe").valid, false);
  });

  test("boş dosya adını reddeder", () => {
    assert.equal(validateUploadFilename("").valid, false);
    assert.equal(validateUploadFilename("   ").valid, false);
  });

  test("null/undefined güvenli şekilde reddedilir (hata fırlatmaz)", () => {
    assert.doesNotThrow(() => validateUploadFilename(null));
    assert.equal(validateUploadFilename(null).valid, false);
  });

  test("çok uzun dosya adını reddeder", () => {
    assert.equal(validateUploadFilename("a".repeat(250) + ".md").valid, false);
  });

  test("null byte injection denemesini reddeder", () => {
    assert.equal(validateUploadFilename("rapor.md\0.exe").valid, false);
  });
});

describe("sanitizeUploadFilename", () => {
  test("uzantıyı korur", () => {
    assert.ok(sanitizeUploadFilename("Rapor.pdf").endsWith(".pdf"));
  });

  test("iki farklı çağrı farklı dosya adı üretir (çakışma önleme)", () => {
    const result1 = sanitizeUploadFilename("aynı-isim.md");
    const result2 = sanitizeUploadFilename("aynı-isim.md");
    assert.notEqual(result1, result2);
  });

  test("tehlikeli karakterleri temizler", () => {
    const result = sanitizeUploadFilename("../../etc/passwd.md");
    assert.ok(!result.includes(".."));
    assert.ok(!result.includes("/"));
  });

  test("Türkçe karakterleri korur", () => {
    const result = sanitizeUploadFilename("Basınç Raporu.md");
    assert.ok(result.includes("ınç") || result.includes("Bas"));
  });
});