// src/generation/chatEngine.js
// Retrieval + Generation akışını orkestre eder (RAG'ın kalbi)

import { retrieve } from "../retrieval/tfidfRetriever.js";
import { getChatClient } from "./foundryClient.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";

export async function askQuestion(question) {
  // 1. Retrieval: alakalı chunk'ları bul
  const chunks = retrieve(question);
  console.log(`🔍 ${chunks.length} alakalı parça bulundu.`);

  // 2. Prompt oluştur
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(question, chunks);

  // 3. Model çağrısı
  const chatClient = await getChatClient();
  const completion = await chatClient.completeChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const answer = completion.choices[0]?.message?.content ?? "(Cevap alınamadı)";

  return {
    answer,
    sources: chunks.map((c) => ({ title: c.title, docId: c.docId, score: c.score })),
  };
}