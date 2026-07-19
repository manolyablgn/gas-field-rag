// src/ingest.js
import { fileURLToPath } from "url";
import { db } from "./db/sqlite.js";
import { loadDocuments, splitIntoChunks } from "./ingestion/chunker.js";
import { computeTfidf } from "./ingestion/tfidf.js";
import { embedTexts } from "./ingestion/embeddings.js";

export async function ingestAll() {
  console.log("📄 Dokümanlar okunuyor...");
  const documents = await loadDocuments();
  console.log(`   ${documents.length} doküman bulundu.`);

  db.exec("DELETE FROM chunks");
  db.exec("DELETE FROM documents");

  const allChunks = [];
  documents.forEach((doc) => {
    const chunks = splitIntoChunks(doc.content);
    chunks.forEach((chunkText, index) => {
      allChunks.push({ docId: doc.id, text: chunkText, index });
    });
  });

  console.log(`✂️  ${allChunks.length} parçaya (chunk) bölündü.`);

  const chunkTexts = allChunks.map((c) => c.text);
  const { vectors } = computeTfidf(chunkTexts);
  console.log("🧮 TF-IDF vektörleri hesaplandı.");

  console.log("🧠 Embedding vektörleri hesaplanıyor...");
  const embeddings = await embedTexts(chunkTexts);
  console.log("✅ Embedding vektörleri hazır.");

  const insertDoc = db.prepare(
    "INSERT INTO documents (id, title, category, filename) VALUES (?, ?, ?, ?)"
  );
  documents.forEach((doc) => {
    insertDoc.run(doc.id, doc.title, doc.category, doc.filename);
  });

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

  return { documentCount: documents.length, chunkCount: allChunks.length };
}

// Terminalden doğrudan çalıştırıldığında otomatik tetikle (npm run ingest için)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ingestAll();
}