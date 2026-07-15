// src/retrieval/reranker.js
// LLM'e tüm adayları BİR ARADA gösterip karşılaştırmalı, mutlak puan (0-10) verdirir.
// Bu, izole puanlamadan (tutarsız) daha güvenilir, RRF skor eşiğinden (matematiksel
// olarak anlamsız) daha doğru bir filtreleme sağlar.

import { getRerankClient } from "../generation/foundryClient.js";
import { config } from "../config.js";

export async function rerank(query, candidates) {
  if (candidates.length === 0) return [];
  if (candidates.length === 1) return candidates;

  const chatClient = await getRerankClient();

  const list = candidates
    .map((c, i) => `[${i + 1}] ${c.text.slice(0, 250)}`)
    .join("\n\n");

  const prompt = `Aşağıda numaralandırılmış metin parçaları var. Her birini, soruyu ne kadar DOĞRUDAN yanıtladığına göre 0-10 arası puanla.

ÖNEMLİ:
- Soru ve metinler farklı kelimeler kullanabilir ama aynı şeyi kastedebilir (örn. "valf" = "vana"). Kelime benzerliğine değil, KONUNUN gerçekten örtüşüp örtüşmediğine bak.
- Metinleri birbirleriyle KARŞILAŞTIRARAK puanla: en alakalı olana en yüksek puanı ver, konusu tamamen farklı olanlara düşük puan ver.
- 8-10: Soruyu doğrudan yanıtlıyor
- 4-7: Aynı genel alanda ama soruyu tam yanıtlamıyor
- 0-3: Farklı bir konu/ekipman hakkında

Soru: "${query}"

Metinler:
${list}

Her metin için "numara:puan" formatında, virgülle ayrılmış şekilde yaz. Örnek: 1:8,2:2,3:6
Başka hiçbir açıklama yazma.`;

  const completion = await chatClient.completeChat([{ role: "user", content: prompt }]);
  const raw = completion.choices[0]?.message?.content ?? "";
  console.log("🔎 Reranker ham çıktı:", JSON.stringify(raw));

  const scoreMap = new Map();
  const pairs = raw.match(/\d+\s*:\s*\d+/g) || [];
  pairs.forEach((pair) => {
    const [idxStr, scoreStr] = pair.split(":").map((s) => s.trim());
    const idx = parseInt(idxStr, 10) - 1;
    const score = parseInt(scoreStr, 10);
    if (idx >= 0 && idx < candidates.length) {
      scoreMap.set(idx, score);
    }
  });

  // Model beklenen formatı hiç vermediyse, orijinal sırayı koru (fallback)
  if (scoreMap.size === 0) return candidates;

  const scored = candidates.map((c, i) => ({
    ...c,
    llmScore: scoreMap.has(i) ? scoreMap.get(i) : 0,
  }));

  scored.sort((a, b) => b.llmScore - a.llmScore);

  const threshold = config.retrieval.absoluteRelevanceThreshold;
  const filtered = scored.filter((c, i) => i === 0 || c.llmScore >= threshold);

  return filtered;
}