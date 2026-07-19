import { test, describe } from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { fileURLToPath } from "url";
import { classifyFile, listSupportedFiles } from "../src/ingestion/fileRouter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("classifyFile", () => {
  test(".md dosyasını 'markdown' olarak sınıflandırır", () => {
    assert.equal(classifyFile("dokuman.md"), "markdown");
  });

  test(".pdf dosyasını 'pdf' olarak sınıflandırır", () => {
    assert.equal(classifyFile("rapor.pdf"), "pdf");
  });

  test("büyük harf uzantıları da tanır (case-insensitive)", () => {
    assert.equal(classifyFile("DOKUMAN.MD"), "markdown");
    assert.equal(classifyFile("RAPOR.PDF"), "pdf");
  });

  test("desteklenmeyen uzantılar için null döner", () => {
    assert.equal(classifyFile("notlar.txt"), null);
    assert.equal(classifyFile("resim.png"), null);
    assert.equal(classifyFile("dosya"), null);
  });
});

describe("listSupportedFiles", () => {
  test("bir klasördeki sadece desteklenen dosyaları listeler", () => {
    const testDir = path.join(__dirname, "fixtures");
    const result = listSupportedFiles(testDir);
    const filenames = result.map((f) => f.filename).sort();
    assert.deepEqual(filenames, ["a.md", "b.pdf", "c.MD", "e.PDF"].sort());
  });

  test("her dosyanın doğru type ile eşleştiğini doğrular", () => {
    const testDir = path.join(__dirname, "fixtures");
    const result = listSupportedFiles(testDir);
    const byName = Object.fromEntries(result.map((f) => [f.filename, f.type]));
    assert.equal(byName["a.md"], "markdown");
    assert.equal(byName["b.pdf"], "pdf");
    assert.equal(byName["c.MD"], "markdown");
    assert.equal(byName["e.PDF"], "pdf");
  });
});