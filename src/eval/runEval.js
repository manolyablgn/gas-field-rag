// src/eval/runEval.js
// goldenSet.json'daki her soruyu sisteme sorar, retrieval doğruluğunu ve
// cevap içeriğini otomatik kontrol eder, genel bir rapor üretir.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { askQuestion } from "../generation/chatEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const goldenSet = JSON.parse(
  fs.readFileSync(path.join(__dirname, "goldenSet.json"), "utf-8")
);

async function runEval() {
  const results = [];

  for (const testCase of goldenSet) {
    console.log(`\n❓ Soru: ${testCase.question}`);
    const result = await askQuestion(testCase.question);

    // 2. İçerik doğruluğu önce hesaplanır (bazı beklenen kelimelerden en az biri geçmeli)
    const answerLower = result.answer.toLowerCase();
    const contentCorrect = testCase.mustContainAny.some((keyword) =>
      answerLower.includes(keyword.toLowerCase())
    );

    // 1. Retrieval doğruluğu: alakasız sorularda asıl ölçüt "doğru cevap verdi mi" (yani
    //    grounding fallback'i tetiklendi mi), hangi chunk'ın arka planda getirildiği değil.
    const retrievedDocIds = result.sources.map((s) => s.docId);
    let retrievalCorrect;
    if (testCase.expectedDocId === null) {
      retrievalCorrect = contentCorrect; // "bilgi bulamadım" diyebildiyse başarılı
    } else {
      retrievalCorrect = retrievedDocIds.includes(testCase.expectedDocId);
    }

    const passed = retrievalCorrect && contentCorrect;

    results.push({
      question: testCase.question,
      expectedDocId: testCase.expectedDocId,
      retrievedDocIds,
      retrievalCorrect,
      contentCorrect,
      passed,
      answer: result.answer,
    });

    console.log(`   Retrieval: ${retrievalCorrect ? "✅" : "❌"} | İçerik: ${contentCorrect ? "✅" : "❌"} | Sonuç: ${passed ? "✅ GEÇTİ" : "❌ KALDI"}`);
  }

  // --- Özet rapor ---
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const retrievalAccuracy = results.filter((r) => r.retrievalCorrect).length / total;
  const contentAccuracy = results.filter((r) => r.contentCorrect).length / total;

  console.log("\n" + "=".repeat(50));
  console.log("📊 SONUÇ RAPORU");
  console.log("=".repeat(50));
  console.log(`Toplam soru: ${total}`);
  console.log(`Geçen: ${passedCount} (${((passedCount / total) * 100).toFixed(1)}%)`);
  console.log(`Retrieval doğruluğu: ${(retrievalAccuracy * 100).toFixed(1)}%`);
  console.log(`İçerik doğruluğu: ${(contentAccuracy * 100).toFixed(1)}%`);

  const failed = results.filter((r) => !r.passed);
  if (failed.length > 0) {
    console.log("\n❌ Başarısız olan sorular:");
    failed.forEach((f) => {
      console.log(`\n- "${f.question}"`);
      console.log(`  Beklenen doküman: ${f.expectedDocId}, Gelen: [${f.retrievedDocIds.join(", ")}]`);
      console.log(`  Cevap: ${f.answer.slice(0, 150)}...`);
    });
  }

  // Sonuçları dosyaya da kaydet (ileride karşılaştırma için)
  const outputPath = path.join(__dirname, "results", `eval-${Date.now()}.json`);
  fs.mkdirSync(path.join(__dirname, "results"), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Detaylı sonuçlar kaydedildi: ${outputPath}`);
}

await runEval();