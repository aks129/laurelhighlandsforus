import { test, expect, request as pwRequest } from '@playwright/test'

const MAILPIT = 'http://127.0.0.1:54324'
const LOCAL = process.env.E2E_LOCAL === '1'

async function magicLink(email: string): Promise<string> {
  const api = await pwRequest.newContext()
  for (let i = 0; i < 20; i++) {
    const { messages = [] } = await (await api.get(`${MAILPIT}/api/v1/messages?limit=50`)).json()
    const m = messages.find((x: { To?: { Address: string }[] }) =>
      x.To?.some((t) => t.Address.toLowerCase() === email.toLowerCase())
    )
    if (m) {
      const msg = await (await api.get(`${MAILPIT}/api/v1/message/${m.ID}`)).json()
      const body = `${msg.Text ?? ''}\n${msg.HTML ?? ''}`.replace(/&amp;/g, '&')
      const link = body.match(/http:\/\/localhost:3100\/auth\/confirm\?[^\s"'<>]+/)?.[0]
      if (link) {
        await api.dispose()
        return link
      }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  await api.dispose()
  throw new Error('no link')
}

test.describe('events', () => {
  test.skip(!LOCAL, 'requires local Supabase + Mailpit (set E2E_LOCAL=1)')

  test('a non-admin member sees calls but cannot schedule', async ({ page }) => {
    const email = `ev-${Date.now()}@example.com`
    await page.goto('/login')
    await page.getByLabel('Email').fill(email)
    await page.getByRole('button', { name: /magic link/i }).click()
    await page.goto(await magicLink(email))

    await page.getByLabel('Full name').fill('Event Tester')
    await page.selectOption('#community', 'hidden_valley')
    await page.getByRole('button', { name: /Finish/i }).click()
    await expect(page).toHaveURL(/\/home$/)

    await page.goto('/events')
    await expect(page.getByRole('heading', { name: 'Community calls' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Schedule a call/i })).toHaveCount(0)
  })
})
