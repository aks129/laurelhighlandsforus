import { test, expect } from '@playwright/test'

test('landing page shows the hero + join CTA', async ({ page }) => {
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: /Hosting the Laurel Highlands/i })
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Join the community/i }).first()).toBeVisible()
})

test('login page shows the magic link option', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: /magic link/i })).toBeVisible()
  // Google sign-in is intentionally hidden until OAuth is configured.
  await expect(page.getByRole('button', { name: /Continue with Google/i })).toHaveCount(0)
})

test('anonymous visit to a gated route redirects to login', async ({ page }) => {
  await page.goto('/home')
  await expect(page).toHaveURL(/\/login$/)
})
