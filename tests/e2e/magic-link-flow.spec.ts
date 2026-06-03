import { test, expect, request as pwRequest } from '@playwright/test'

const MAILPIT = 'http://127.0.0.1:54324'

// Poll Mailpit for the newest message addressed to `email` and return the
// sign-in link (our token_hash -> /auth/confirm URL) from its body.
async function fetchMagicLink(email: string): Promise<string> {
  const api = await pwRequest.newContext()
  for (let attempt = 0; attempt < 20; attempt++) {
    const list = await api.get(`${MAILPIT}/api/v1/messages?limit=50`)
    const { messages = [] } = await list.json()
    const match = messages.find((m: { To?: { Address: string }[] }) =>
      m.To?.some((t) => t.Address.toLowerCase() === email.toLowerCase())
    )
    if (match) {
      const msg = await (await api.get(`${MAILPIT}/api/v1/message/${match.ID}`)).json()
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
  throw new Error(`No magic link email arrived for ${email}`)
}

test('magic-link sign-in -> onboarding -> home -> account', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`

  // 1. Request a magic link from the login page.
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: /magic link/i }).click()
  await expect(page.getByText(/check your inbox/i)).toBeVisible()

  // 2. Retrieve the link from Mailpit and visit it (verifies the token_hash).
  const link = await fetchMagicLink(email)
  await page.goto(link)

  // 3. New user -> profile incomplete -> members layout sends them to onboarding.
  await expect(page).toHaveURL(/\/onboarding$/)
  await expect(page.getByRole('heading', { name: /tell us about you/i })).toBeVisible()

  // 4. Complete onboarding.
  await page.getByLabel('Full name').fill('Test Owner')
  await page.selectOption('#community', 'hidden_valley')
  await page.getByRole('button', { name: 'Finish' }).click()

  // 5. Lands on the members home.
  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()

  // 6. Account page reflects the saved profile.
  await page.goto('/account')
  await expect(page.getByText('Test Owner')).toBeVisible()
  await expect(page.getByText('Hidden Valley')).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()
})
