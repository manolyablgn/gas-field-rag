// src/ingestion/promptInjectionDetector.js
// Yüklenen dokümanlarda şüpheli prompt injection kalıplarını tespit eder.
// Deterministik kalıp eşleştirme kullanır (LLM'e güvenmez, halüsinasyon riski yok).
// Tespit edilen içerik ENGELLENMEZ (yanlış pozitif riski var çünkü teknik dokümanlar
// bazen bu kalıplara benzeyen meşru cümleler içerebilir), sadece LOGLANIR.

// "Turkish-I problemi": Türkçe "İ" ve İngilizce "I" harfleri birbirine karışabilir.
// Standart .toLowerCase() "İ"yi yanlış çevirir (i̇ birleşik karakteri üretir),
// Türkçe locale ise İngilizce "I"yi "ı"ya çevirip İngilizce kalıpları bozar.
// Çözüm: sadece "İ" harfini elle "i"ye çeviriyoruz, gerisi için standart toLowerCase
// kullanıyoruz - VE Türkçe kalıplardaki "ı" harflerini [iı] karakter sınıfıyla yazıyoruz,
// böylece "I" ister "i" ister "ı" olarak küçülsün, kalıp yine de eşleşir.
function normalizeForMatching(text) {
  return (text || "").replace(/İ/g, "i").toLowerCase();
}

const SUSPICIOUS_PATTERNS = [
  /önceki tal[iı]matlar[iı] (unut|yok say|görmezden gel)/,
  /sen art[iı]k .{0,40}s[iı]n\b/,
  /ignore (previous|all|above) instructions/,
  /you are now/,
  /sistem promptunu (göster|yazd[iı]r|paylaş)/,
  /kullan[iı]c[iı]ya şunu söyle/,
  /bundan sonra .{0,30}(gibi davran|rolünü üstlen)/,
];

export function detectSuspiciousContent(text, filename) {
  const findings = [];
  const normalizedText = normalizeForMatching(text);

  SUSPICIOUS_PATTERNS.forEach((pattern) => {
    if (pattern.test(normalizedText)) {
      findings.push(pattern.source);
    }
  });

  if (findings.length > 0) {
    console.warn(
      `⚠️  "${filename}" dosyasında şüpheli kalıp(lar) tespit edildi (${findings.length} adet). ` +
      `İçerik yine de indekslendi (yanlış pozitif olabilir) ama gözden geçirilmesi önerilir.`
    );
  }

  return { hasSuspiciousContent: findings.length > 0, findings };
}