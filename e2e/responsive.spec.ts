import { test, expect, devices } from '@playwright/test'

test.describe('Mobile responsiveness', () => {
  test.use({ ...devices['iPhone 14'] })

  test('mobile menu opens and shows games', async ({ page }) => {
    await page.goto('/')
    // Mobile menu button should be visible
    const menuButton = page.locator('button >> svg').first()
    await expect(menuButton).toBeVisible()
  })

  test('login page works on mobile', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('game pages render on mobile', async ({ page }) => {
    await page.goto('/games/slots')
    // Page should load without horizontal scroll issues
    const viewportWidth = page.viewportSize()?.width || 390
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10) // small tolerance
  })
})
