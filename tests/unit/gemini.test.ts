import { describe, it, expect } from 'vitest'
import { buildRequestBody, type ChatMessage } from '@/lib/gemini'

describe('gemini request body', () => {
  it('places the system instruction and maps chat history', () => {
    const history: ChatMessage[] = [
      { role: 'user', text: 'hi' },
      { role: 'model', text: 'hello' },
    ]
    const body = buildRequestBody('SYS', history)
    expect(body.systemInstruction.parts[0].text).toBe('SYS')
    expect(body.contents).toHaveLength(2)
    expect(body.contents[0]).toEqual({ role: 'user', parts: [{ text: 'hi' }] })
    expect(body.contents[1].role).toBe('model')
    expect(body.generationConfig.maxOutputTokens).toBe(800)
  })
})
