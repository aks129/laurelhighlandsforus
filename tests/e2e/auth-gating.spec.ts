import { test, expect } from '@playwright/test'

test('landing page shows the join CTA', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Laurel Highlands For Us' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Join the community' })).toBeVisible()
})

test('login page shows magic link and Google options', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByRole('button', { name: /magic link/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Continue with Google/i })).toBeVisible()
})

test('anonymous visit to a gated route redirects to login', async ({ page }) => {
  await page.goto('/home')
  await expect(page).toHaveURL(/\/login$/)
})
