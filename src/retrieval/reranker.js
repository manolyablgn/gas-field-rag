// src/retrieval/reranker.js
// LLM tabanlı listwise reranking: tüm adayları tek seferde modele gösterip
// en alakalıdan en alakasıza doğru sıralamasını ister (pointwise puanlamadan daha güvenilir)

import { getChatClient } from "../generation/foundryClient.js";

export async function rerank(query, candidates) {
  if (candidates.length <= 1) return candidates;

  const chatClient = await getChatClient();

  const list = candidates
    .map((c, i) => `[${i + 1}] ${c.text.slice(0, 200)}`)
    .join("\n\n");

  const prompt = `Aşağıda numaralandırılmış metin parçaları var. Soruyu yanıtlamak için EN ALAKALI olandan EN ALAKASIZ olana doğru sırala.

ÖNEMLİ: Soru ve metinler farklı kelimeler kullanabilir ama aynı şeyi kastedebilir (örn. "valf" = "vana"). Kelime benzerliğine değil, KONUNUN gerçekten örtüşüp örtüşmediğine bak.

Soru: "${query}"

Metinler:
${list}

Sadece numaraları en alakalıdan en alakasıza doğru, virgülle ayrılmış şekilde yaz. Örnek format: 3,1,4,2
Başka hiçbir açıklama yazma.`;

  const completion = await chatClient.completeChat([
    { role: "user", content: prompt },
  ]);

  const raw = completion.choices[0]?.message?.content ?? "";
  const orderMatches = raw.match(/\d+/g);

  if (!orderMatches) {
    // Model beklenen formatı vermezse, orijinal RRF sırasına geri dön
    return candidates;
  }

  const order = orderMatches
    .map((n) => parseInt(n, 10) - 1)
    .filter((i) => i >= 0 && i < candidates.length);

  // Modelin belirttiği sırayla diz, eksik kalanları sona ekle
  const seen = new Set(order);
  const reranked = order.map((i) => candidates[i]);
  candidates.forEach((c, i) => {
    if (!seen.has(i)) reranked.push(c);
  });

  return reranked;
}