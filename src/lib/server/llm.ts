// LLM 호출 래퍼 (Google Gemini). 키 없거나 실패하면 null을 돌려주고 호출부가 정적 폴백을 쓴다.
import "server-only";

// gemini-flash-lite-latest = 최신 lite flash. thinking이 거의 없어 분류가 결정적·일관적이고 빠르다(~1s).
// (thinking 모델 gemini-flash-latest는 추론 경로 변동으로 흥정 카테고리 분류가 불안정하고 5s+로 느렸다.)
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";

// system + user 프롬프트로 텍스트 1개를 받아온다. 키 없거나 실패 시 null(→ 폴백).
export async function askText(system: string, user: string, maxTokens = 400): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          // lite는 thinking이 거의 없어 여유는 소폭(+512)이면 충분. temperature 낮춰 흥정 분류를 결정적으로(대사는 입력마다 달라 다양성 유지).
          generationConfig: { maxOutputTokens: maxTokens + 512, temperature: 0.2 },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return null; // 안전차단·빈 응답 등
    const text = parts.map((p: { text?: string }) => p.text ?? "").join("");
    return text || null;
  } catch {
    return null;
  }
}

// 응답 안에서 첫 JSON 객체를 뽑아 파싱한다. 실패 시 null.
export function extractJson<T>(text: string | null): T | null {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
