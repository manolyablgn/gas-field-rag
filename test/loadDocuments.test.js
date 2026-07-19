import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { loadDocuments } from "../src/ingestion/chunker.js";

describe("loadDocuments - varsayılan parametre regresyon testi", () => {
  test("argümansız çağrıldığında config.docsPath'i kullanır, çökmez", async () => {
    // Bu, ingest.js'in gerçek kullanım şeklini birebir taklit eder.
    // Daha önce buradaki varsayılan parametre yanlışlıkla silinmiş ve
    // "path must be string, received undefined" hatasına yol açmıştı.
    await assert.doesNotReject(async () => {
      await loadDocuments();
    });
  });

  test("docs/ klasöründeki dokümanları yükler (markdown ve/veya pdf)", async () => {
    const docs = await loadDocuments();
    assert.ok(docs.length > 0, "en az bir doküman yüklenmeli");
    docs.forEach((doc) => {
      assert.ok(doc.id, "her dokümanın bir id'si olmalı");
      assert.ok(doc.title, "her dokümanın bir title'ı olmalı");
      assert.ok(doc.content.length > 0, "her dokümanın içeriği boş olmamalı");
    });
  });
});