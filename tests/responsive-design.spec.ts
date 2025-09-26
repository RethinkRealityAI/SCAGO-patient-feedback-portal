import { test, expect } from '@playwright/test';

test.describe('Responsive Design Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display properly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Check if header is visible
    await expect(page.locator('header')).toBeVisible();
    
    // Check if main content is visible
    await expect(page.locator('main')).toBeVisible();
    
    // Check if glassmorphism effects are applied
    const card = page.locator('[class*="glass-card"]').first();
    if (await card.count() > 0) {
      await expect(card).toBeVisible();
    }
    
    // Check if navigation is properly spaced
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should display properly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check responsive layout
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Check if content adapts to tablet size
    const container = page.locator('.container');
    await expect(container).toBeVisible();
  });

  test('should display properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check mobile layout
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Check if mobile navigation works
    const mobileNav = page.locator('nav');
    await expect(mobileNav).toBeVisible();
    
    // Check if content is properly stacked on mobile
    const title = page.locator('h1');
    await expect(title).toBeVisible();
  });

  test('should have proper glassmorphism effects', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Check if backdrop-blur is supported and applied
    const glassElements = page.locator('[class*="backdrop-blur"]');
    const count = await glassElements.count();
    
    if (count > 0) {
      // Check first glass element
      const firstGlass = glassElements.first();
      await expect(firstGlass).toBeVisible();
      
      // Check if the element has proper styling
      const styles = await firstGlass.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          backdropFilter: computed.backdropFilter,
          backgroundColor: computed.backgroundColor,
        };
      });
      
      // Verify backdrop-filter is applied (if supported)
      expect(styles.backdropFilter).not.toBe('none');
    }
  });

  test('should handle hover effects properly', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Find interactive elements
    const buttons = page.locator('button, a[class*="button"], [class*="hover:"]');
    const count = await buttons.count();
    
    if (count > 0) {
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();
      
      // Test hover effect
      await firstButton.hover();
      
      // Wait for transition
      await page.waitForTimeout(500);
      
      // The element should still be visible after hover
      await expect(firstButton).toBeVisible();
    }
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Continue tabbing through interactive elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
    }
  });

  test('should load without performance issues', async ({ page }) => {
    // Start timing
    const startTime = Date.now();
    
    await page.goto('/');
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    // Check if animations are not causing performance issues
    const animatedElements = page.locator('[class*="animate-"]');
    const count = await animatedElements.count();
    
    if (count > 0) {
      // Animations should be present but not excessive
      expect(count).toBeLessThan(20);
    }
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/');
    
    // Check if animations are disabled when reduced motion is preferred
    const animatedElements = page.locator('[class*="animate-"]');
    const count = await animatedElements.count();
    
    if (count > 0) {
      const firstAnimated = animatedElements.first();
      const animationDuration = await firstAnimated.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return computed.animationDuration;
      });
      
      // Animation should be disabled or very short
      expect(animationDuration === '0s' || animationDuration === 'none').toBeTruthy();
    }
  });
});

test.describe('Component Responsiveness', () => {
  test('cards should adapt to different screen sizes', async ({ page }) => {
    await page.goto('/');
    
    const viewports = [
      { width: 375, height: 667 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1920, height: 1080 }, // Desktop
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      
      const cards = page.locator('[class*="card"]');
      const count = await cards.count();
      
      if (count > 0) {
        const firstCard = cards.first();
        await expect(firstCard).toBeVisible();
        
        // Check if card is properly sized for viewport
        const boundingBox = await firstCard.boundingBox();
        expect(boundingBox?.width).toBeLessThanOrEqual(viewport.width);
      }
    }
  });

  test('navigation should be responsive', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile navigation
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileNav = page.locator('nav');
    await expect(mobileNav).toBeVisible();
    
    // Test desktop navigation
    await page.setViewportSize({ width: 1920, height: 1080 });
    const desktopNav = page.locator('nav');
    await expect(desktopNav).toBeVisible();
  });
});
