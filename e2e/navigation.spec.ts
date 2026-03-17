import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('homepage loads with game lobby', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/Fortuna/i)
    await expect(page.locator('text=FORTUNA CASINO')).toBeVisible()
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Welcome Back')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('text=Create Account')).toBeVisible()
    await expect(page.locator('input#username')).toBeVisible()
    await expect(page.locator('input#email')).toBeVisible()
  })

  test('header navigation links work', async ({ page }) => {
    await page.goto('/')
    // Main nav links
    await expect(page.locator('nav >> text=Lobby')).toBeVisible()
    await expect(page.locator('nav >> text=Slots')).toBeVisible()
    await expect(page.locator('nav >> text=Blackjack')).toBeVisible()
    await expect(page.locator('nav >> text=Roulette')).toBeVisible()
  })

  test('footer links are present', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('footer >> text=Terms of Service')).toBeVisible()
    await expect(page.locator('footer >> text=Privacy Policy')).toBeVisible()
    await expect(page.locator('footer >> text=Responsible Gambling')).toBeVisible()
  })

  test('static pages load', async ({ page }) => {
    await page.goto('/terms')
    await expect(page.locator('h1')).toBeVisible()

    await page.goto('/privacy')
    await expect(page.locator('h1')).toBeVisible()

    await page.goto('/about')
    await expect(page.locator('h1')).toBeVisible()

    await page.goto('/faq')
    await expect(page.locator('h1')).toBeVisible()
  })
})

test.describe('Auth redirects', () => {
  test('profile redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })

  test('wallet redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/wallet')
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain('/login')
  })
})

test.describe('Game pages', () => {
  const games = ['slots', 'blackjack', 'roulette', 'dice', 'crash', 'plinko', 'coinflip', 'poker', 'mines', 'keno', 'hilo', 'limbo']

  for (const game of games) {
    test(`${game} page loads`, async ({ page }) => {
      await page.goto(`/games/${game}`)
      await expect(page.locator('h1, h2, [class*="text-2xl"], [class*="text-3xl"]').first()).toBeVisible()
    })
  }
})

test.describe('Guest mode', () => {
  test('can continue as guest from login page', async ({ page }) => {
    await page.goto('/login')
    const guestButton = page.locator('text=Continue as Guest')
    if (await guestButton.isVisible()) {
      await guestButton.click()
      await page.waitForURL('/')
    }
  })
})
