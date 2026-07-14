// src/generation/chatEngine.js
// Retrieval + Generation akışını orkestre eder (RAG'ın kalbi)

import { hybridRetrieve } from "../retrieval/hybridRetriever.js";
import { getChatClient } from "./foundryClient.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";

export async function askQuestion(question) {
  // 1. Retrieval: alakalı chunk'ları bul
  const chunks = await hybridRetrieve(question);
  const topChunks = chunks.slice(0, 2); // cevap üretimi ve kaynak gösterimi için en fazla 2 kaynak kullan
  console.log(`🔍 ${topChunks.length} alakalı parça bulundu.`);

  // 2. Prompt oluştur (sadece topChunks kullan, kırpma burada da uygulanmalı)
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(question, topChunks);

  // 3. Model çağrısı
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