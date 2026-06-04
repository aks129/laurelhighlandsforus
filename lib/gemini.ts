const MODEL = 'gemini-2.5-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

const PLAIN_TEXT = ` Format your reply as plain text. Do not use Markdown symbols such as **, ##, or backticks; for lists, use simple "- " dashes.`

export const ASSISTANT_SYSTEM = `You are the helpful assistant for "Laurel Highlands For Us," a community of short-term rental owners and Airbnb/VRBO operators around Hidden Valley and Seven Springs in the Laurel Highlands of Pennsylvania. Help with hosting questions, pricing strategy, finding local services, seasonal tips (ski season, fall foliage), and Airbnb/VRBO best practices. Be concise, friendly, and practical. If you are unsure about a specific local rule, tax, or regulation, say so and suggest confirming with the township, county, or the Go Laurel Highlands association. Never invent specific laws, prices, or vendor names.${PLAIN_TEXT}`

export const RECAP_SYSTEM = `You write clear, friendly recaps of community video calls for short-term rental owners. Given rough notes, produce a concise recap: a one-line summary, then 3-6 "Key points" as dashed lines, then a short "Action items" list if any are implied by the notes. Keep it neutral and skimmable. Do not invent details that are not in the notes.${PLAIN_TEXT}`

export function buildRequestBody(system: string, history: ChatMessage[]) {
  return {
    systemInstruction: { parts: [{ text: system }] },
    contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
    generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
  }
}

export async function generateReply(system: string, history: ChatMessage[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  const res = await fetch(`${ENDPOINT}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildRequestBody(system, history)),
  })
  if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`)
  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  return parts
    .map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim()
}
