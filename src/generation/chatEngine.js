// src/generation/chatEngine.js
import { hybridRetrieve } from "../retrieval/hybridRetriever.js";
import { getChatClient } from "./foundryClient.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { config } from "../config.js";
import { ValidationError, RetrievalError } from "../utils/errors.js";

const NO_INFO_MESSAGE = "I couldn't find enough information on this topic in my documents.";

// Retrieval + grounding guard mantığını iki fonksiyon (streaming/non-streaming) paylaşır
async function prepareContext(question) {
  if (typeof question !== "string" || question.trim().length === 0) {
    throw new ValidationError("Soru boş olamaz.");
  }

  let chunks;
  try {
    chunks = await hybridRetrieve(question);
  } catch (err) {
    throw new RetrievalError(err);
  }

  const topChunks = chunks.slice(0, 2);
  console.log(`🔍 ${topChunks.length} alakalı parça bulundu.`);

  const bestScore = topChunks[0]?.llmScore;
  const bestLexical = topChunks[0]?.rawLexicalScore ?? 0;
  const bestSemantic = topChunks[0]?.rawSemanticScore ?? 0;
  const { minLexicalScore, minSemanticScore } = config.retrieval.groundingThresholds;

  console.log(`   Ham lexical: ${bestLexical} | Ham semantic: ${bestSemantic}`);

  const hasNoRelevantContext =
    topChunks.length === 0 ||
    bestScore === undefined ||
    (bestLexical < minLexicalScore && bestSemantic < minSemanticScore);

  return { topChunks, hasNoRelevantContext };
}

// Eski, tek seferde tam cevap dönen versiyon (geriye dönük uyumluluk için, eval script'i bunu kullanıyor)
export async function askQuestion(question) {
  const { topChunks, hasNoRelevantContext } = await prepareContext(question);

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

// Yeni, streaming versiyon: her token geldiğinde onCallback'i çağırır
export async function askQuestionStreaming(question, onToken) {
  const { topChunks, hasNoRelevantContext } = await prepareContext(question);

  if (hasNoRelevantContext) {
    onToken(NO_INFO_MESSAGE);
    return { sources: [] };
  }

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(question, topChunks);

  const chatClient = await getChatClient();

  for await (const chunk of chatClient.completeStreamingChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ])) {
    const token = chunk.choices?.[0]?.delta?.content;
    if (token) onToken(token);
  }

  return {
    sources: topChunks.map((c) => ({ title: c.title, docId: c.docId, score: c.rrfScore })),
  };
}