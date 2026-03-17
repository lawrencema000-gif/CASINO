import { test, expect } from '@playwright/test'

test.describe('Store', () => {
  test('store page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/store')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('store packages API returns data', async ({ request }) => {
    const response = await request.get('/api/store/packages')
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data.packages).toBeDefined()
    expect(data.packages.length).toBeGreaterThan(0)
  })
})

test.describe('Achievements', () => {
  test('achievements page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/achievements')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })
})
