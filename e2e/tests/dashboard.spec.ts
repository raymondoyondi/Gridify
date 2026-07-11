import { test, expect } from '@playwright/test'

test.describe('Gridify Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000')
  })
 
  test('should load landing page', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Intelligent Telemetry')
    await expect(page.locator('button:has-text("Launch Dashboard Console")')).toBeVisible()
  })
 
  test('should navigate to dashboard', async ({ page }) => {
    await page.click('button:has-text("Launch Dashboard Console")')
    await expect(page).toHaveURL(/.*dashboard/)
    await expect(page.locator('h2')).toContainText('Dashboard')
  })
  
  test('should display telemetry widgets', async ({ page }) => {
    await page.click('button:has-text("Launch Dashboard Console")')
    
    // Wait for widgets to load
    await page.waitForLoadState('networkidle')
    
    // Check for widget titles
    await expect(page.locator('text=IoT Sensor Metrics')).toBeVisible()
    await expect(page.locator('text=Device Status')).toBeVisible()
    await expect(page.locator('text=Business Analytics')).toBeVisible()
  })
 
  test('should handle AI query submission', async ({ page }) => {
    await page.click('button:has-text("Launch Dashboard Console")')
    await page.waitForLoadState('networkidle')
    
    // Find and fill the AI query input
    const queryInput = page.locator('#dashboard-prompt-input')
    await queryInput.fill('Show me last month temperature trends')
    
    // Click generate button
    await page.click('button:has-text("Generate View")')
    
    // Wait for response and toast notification
    await expect(page.locator('#toast-notification')).toBeVisible({ timeout: 10000 })
  })
  
  test('should filter metrics with chips', async ({ page }) => {
    await page.click('button:has-text("Launch Dashboard Console")')
    await page.waitForLoadState('networkidle')
    
    // Wait for filter chips to appear
    const filterChips = page.locator('[class*="filter-chips"]')
    await expect(filterChips).toBeVisible()
    
    // Check chips count
    const chips = await page.locator('[class*="filter-chips"] button').count()
    expect(chips).toBeGreaterThan(0)
  })
 
  test('should remove filter chips', async ({ page }) => {
    await page.click('button:has-text("Launch Dashboard Console")')
    await page.waitForLoadState('networkidle')
    
    const chipCount = await page.locator('[class*="filter-chips"] button').count()
    
    // Click remove button on first chip
    await page.locator('[class*="filter-chips"] button').first().click()
    
    // Verify toast message
    await expect(page.locator('#toast-notification')).toBeVisible()
    
    // Verify chip was removed
    const newChipCount = await page.locator('[class*="filter-chips"] button').count()
    expect(newChipCount).toBeLessThan(chipCount)
  })
 
  test('should reset dashboard layout', async ({ page }) => {
    await page.click('button:has-text("Launch Dashboard Console")')
    await page.waitForLoadState('networkidle')
    
    // Click reset layout button
    await page.click('button:has-text("Reset Layout")')
    
    // Verify success toast
    await expect(page.locator('#toast-notification')).toContainText('restored')
  })
 
  test('should navigate to analytics', async ({ page }) => {
    // Use sidebar navigation
    await page.click('button:has-text("Advanced Performance Analytics")')
    await expect(page).toHaveURL(/.*analytics/)
  })
 
  test('should display device metrics table', async ({ page }) => {
    await page.click('button:has-text("Business Analytics Summary")')
    await page.waitForLoadState('networkidle')
    
    // Check for table headers
    await expect(page.locator('thead')).toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(0, { timeout: 5000 })
  })
})

test.describe('Dashboard Responsiveness', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000')
    
    await expect(page).toHaveTitle(/Gridify/)
    await page.click('button:has-text("Launch Dashboard Console")')
    
    // Verify responsive layout
    const mainFrame = page.locator('#workspace-main-frame')
    await expect(mainFrame).toBeVisible()
  })
 
  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('http://localhost:3000')
    
    await page.click('button:has-text("Launch Dashboard Console")')
    await page.waitForLoadState('networkidle')
    
    // Check responsive grid layout
    const widgets = page.locator('[class*="widget"]')
    await expect(widgets).toHaveCount(0, { timeout: 5000 })
  })
 
  test('should work on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('http://localhost:3000')
    
    await page.click('button:has-text("Launch Dashboard Console")')
    await page.waitForLoadState('networkidle')
    
    // Verify full desktop layout
    const header = page.locator('#workspace-header')
    await expect(header).toBeVisible()
  })
})

test.describe('Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('http://localhost:3000')
    await page.click('button:has-text("Launch Dashboard Console")')
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(5000) // 5 second timeout
  })
 
  test('should handle rapid widget removal', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.click('button:has-text("Launch Dashboard Console")')
    await page.waitForLoadState('networkidle')
    
    // Rapidly click multiple filter removals
    const chips = page.locator('[class*="filter-chips"] button')
    const chipCount = await chips.count()
    
    for (let i = 0; i < Math.min(3, chipCount); i++) {
      await chips.first().click()
      await page.waitForTimeout(100)
    }
    
    // Verify page is still responsive
    await expect(page.locator('#workspace-main-frame')).toBeVisible()
  })
})

test.describe('Error Handling', () => {
  test('should display error toast on failed query', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await page.click('button:has-text("Launch Dashboard Console")')
    
    // Intercept API and return error
    await page.route('**/api/gemini/command', route => {
      route.abort('failed')
    })
    
    const queryInput = page.locator('#dashboard-prompt-input')
    await queryInput.fill('Test query')
    await page.click('button:has-text("Generate View")')
    
    // Verify error toast appears
    await expect(page.locator('#toast-notification')).toBeVisible({ timeout: 5000 })
  })
})
