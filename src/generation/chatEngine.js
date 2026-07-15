// src/generation/chatEngine.js
import { hybridRetrieve } from "../retrieval/hybridRetriever.js";
import { getChatClient } from "./foundryClient.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";

const NO_INFO_MESSAGE = "Bu konuda dokümanlarımda yeterli bilgi bulamadım.";

export async function askQuestion(question) {
  const chunks = await hybridRetrieve(question);
  const topChunks = chunks.slice(0, 2);

  console.log(`🔍 ${topChunks.length} alakalı parça bulundu.`);
  if (topChunks.length > 0) {
    console.log(`   En iyi skor (llmScore): ${topChunks[0].llmScore}`);
  }

  const bestScore = topChunks[0]?.llmScore;
  const bestLexical = topChunks[0]?.rawLexicalScore ?? 0;
  const bestSemantic = topChunks[0]?.rawSemanticScore ?? 0;
  console.log(`   Ham lexical: ${bestLexical} | Ham semantic: ${bestSemantic}`);

  // Çift güvenlik ağı: LLM puanına tek başına güvenmiyoruz (halüsinasyon görebiliyor).
  // Ham lexical VEYA ham semantic skorundan en az biri belirli bir eşiği geçmeli;
  // ikisi de düşükse konu gerçekten alakasızdır (RRF skoru küçük veri setinde
  // ayrım gücü zayıf olduğu için kullanılmıyor).
  const hasNoRelevantContext =
    topChunks.length === 0 ||
    bestScore === undefined ||
    (bestLexical < 0.03 && bestSemantic < 0.5);

  if (hasNoRelevantContext) {
    return { answer: NO_INFO_MESSAGE, sources: [] };
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(question, topChunks);

  const chatClient = await getChatClient();
  const completion = await chatClient.completeChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const answer = completion.choices[0]?.message?.content ?? "(Cevap alınamadı)";

  return {
    answer,
    sources: topChunks.map((c) => ({ title: c.title, docId: c.docId, score: c.rrfScore })),
  };
}