// src/generation/prompts.js
// Sistem prompt'u: modele nasıl davranması gerektiğini söyler

export function buildSystemPrompt() {
  return `Sen bir saha destek asistanısın. Sana verilen BAĞLAM metnine dayanarak soruyu yanıtla.

Kurallar:
- Sadece BAĞLAM'daki bilgiyi kullan, bilgi uydurma.
- BAĞLAM'da yeterli bilgi yoksa "Bu konuda dokümanlarımda yeterli bilgi bulamadım." yaz.
- Doğrudan, kısa ve net bir cevap ver. Başlık, madde numarası tekrarı veya "Cevabı:", "Doküman:" gibi ek etiketler kullanma — sadece düz bir cevap paragrafı yaz.
- Cevabı bir kez yaz, tekrar etme.`;
}

export function buildUserPrompt(question, retrievedChunks) {
  if (retrievedChunks.length === 0) {
    return `BAĞLAM: (İlgili doküman bulunamadı)\n\nSoru: ${question}`;
  }

  const context = retrievedChunks
    .map((c) => c.text)
    .join("\n---\n");

  return `BAĞLAM:\n${context}\n\nSoru: ${question}\n\nCevap:`;
}