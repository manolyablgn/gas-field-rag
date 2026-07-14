// src/ingest.js
// Ana ingestion script'i: docs/ klasöründeki dosyaları okuyup veritabanına indeksler

import { db } from "./db/sqlite.js";
import { loadDocuments, splitIntoChunks } from "./ingestion/chunker.js";
import { computeTfidf } from "./ingestion/tfidf.js";
import { config } from "./config.js";
import { embedTexts } from "./ingestion/embeddings.js";

async function ingest() {
  console.log("📄 Dokümanlar okunuyor...");
  const documents = loadDocuments();
  console.log(`   ${documents.length} doküman bulundu.`);

  // Önceki verileri temizle (yeniden ingestion yapılabilir olsun diye)
  db.exec("DELETE FROM chunks");
  db.exec("DELETE FROM documents");

  // Tüm dokümanları chunk'lara böl
  const allChunks = []; // { docId, text }
  documents.forEach((doc) => {
    const chunks = splitIntoChunks(doc.content);
    chunks.forEach((chunkText, index) => {
      allChunks.push({ docId: doc.id, text: chunkText, index });
    });
  });

  console.log(`✂️  ${allChunks.length} parçaya (chunk) bölündü.`);

  // Tüm chunk metinleri üzerinden TF-IDF hesapla (vocabulary tüm chunk'lara göre kurulur)
  const chunkTexts = allChunks.map((c) => c.text);
  const { vectors } = computeTfidf(chunkTexts);

  console.log("🧮 TF-IDF vektörleri hesaplandı.");
  console.log("🧠 Embedding vektörleri hesaplanıyor (ilk seferde model indirilecek, biraz sürebilir)...");
  const embeddings = await embedTexts(chunkTexts);
  console.log("✅ Embedding vektörleri hazır.");

  // Dokümanları veritabanına yaz
  const insertDoc = db.prepare(
    "INSERT INTO documents (id, title, category, filename) VALUES (?, ?, ?, ?)"
  );
  documents.forEach((doc) => {
    insertDoc.run(doc.id, doc.title, doc.category, doc.filename);
  });

  // Chunk'ları vektörleriyle birlikte veritabanına yaz
  const insertChunk = db.prepare(
    "INSERT INTO chunks (doc_id, chunk_text, chunk_index, tfidf_vector, embedding) VALUES (?, ?, ?, ?, ?)"
  );
  allChunks.forEach((chunk, i) => {
    insertChunk.run(
      chunk.docId,
      chunk.text,
      chunk.index,
      JSON.stringify(vectors[i]),
      JSON.stringify(embeddings[i])
    );
  });

  console.log("✅ Ingestion tamamlandı!");
  console.log(`   ${documents.length} doküman, ${allChunks.length} chunk veritabanına yazıldı.`);
}

await ingest();