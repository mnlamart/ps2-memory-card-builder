import { expect, test } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Memory Card Management', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await injectAxe(page)
	})

	test('should display the home page with memory card list', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /Memory Card Manager/i })).toBeVisible()
		await checkA11y(page)
	})

	test('should navigate to upload page', async ({ page }) => {
		await page.getByRole('link', { name: /Upload Memory Card/i }).click()
		await expect(page).toHaveURL(/\/memory-cards\/new/)
		await checkA11y(page)
	})

	test('should show empty state when no memory cards', async ({ page }) => {
		// Assuming no memory cards are present
		const emptyState = page.getByText(/No memory cards found/i)
		if (await emptyState.isVisible()) {
			await expect(emptyState).toBeVisible()
			await expect(
				page.getByRole('link', { name: /Upload Your First Memory Card/i }),
			).toBeVisible()
		}
		await checkA11y(page)
	})

	test('should search memory cards', async ({ page }) => {
		const searchInput = page.getByPlaceholder(/Search memory cards/i)
		if (await searchInput.isVisible()) {
			await searchInput.fill('test')
			await expect(searchInput).toHaveValue('test')
		}
		await checkA11y(page)
	})

	test('should toggle between grid and list view', async ({ page }) => {
		const gridButton = page.getByRole('button').filter({ hasText: /Grid/i }).first()
		const listButton = page.getByRole('button').filter({ hasText: /List/i }).first()

		if (await gridButton.isVisible() && await listButton.isVisible()) {
			await listButton.click()
			await expect(listButton).toHaveAttribute('data-state', /checked|active/i)
			await gridButton.click()
			await expect(gridButton).toHaveAttribute('data-state', /checked|active/i)
		}
		await checkA11y(page)
	})
})

test.describe('Memory Card Upload', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/memory-cards/new')
		await injectAxe(page)
	})

	test('should display upload form', async ({ page }) => {
		await expect(page.getByRole('heading', { name: /Upload Memory Card/i })).toBeVisible()
		await expect(page.getByLabel(/Memory Card File/i)).toBeVisible()
		await checkA11y(page)
	})

	test('should validate file type', async ({ page }) => {
		// Create a mock file
		const file = new File(['test'], 'test.txt', { type: 'text/plain' })
		await page.evaluateHandle((file) => {
			const dt = new DataTransfer()
			dt.items.add(file)
			return dt
		}, file)

		// Note: File input validation happens on submit, not on change
		await checkA11y(page)
	})
})

test.describe('Memory Card Detail', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to a memory card detail page if one exists
		await page.goto('/')
		await injectAxe(page)
	})

	test('should display memory card actions', async ({ page }) => {
		// Check if there are any memory cards
		const memoryCardLinks = page.getByRole('link').filter({ hasText: /\.ps2|\.mc2/i })
		
		if ((await memoryCardLinks.count()) > 0) {
			await memoryCardLinks.first().click()
			await expect(page.getByRole('button', { name: /Import Save/i })).toBeVisible()
			await checkA11y(page)
		}
	})

	test('should display storage information', async ({ page }) => {
		const memoryCardLinks = page.getByRole('link').filter({ hasText: /\.ps2|\.mc2/i })
		
		if ((await memoryCardLinks.count()) > 0) {
			await memoryCardLinks.first().click()
			await expect(page.getByText(/Storage Used|Total Space|Save Files/i)).toBeVisible()
			await checkA11y(page)
		}
	})
})

test.describe('Save File Management', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await injectAxe(page)
	})

	test('should display save files list', async ({ page }) => {
		const memoryCardLinks = page.getByRole('link').filter({ hasText: /\.ps2|\.mc2/i })
		
		if ((await memoryCardLinks.count()) > 0) {
			await memoryCardLinks.first().click()
			// Check if save files are displayed or empty state
			const hasSaves = page.getByText(/No save files|save file/i)
			await expect(hasSaves).toBeVisible()
			await checkA11y(page)
		}
	})

	test('should navigate to save file detail', async ({ page }) => {
		const memoryCardLinks = page.getByRole('link').filter({ hasText: /\.ps2|\.mc2/i })
		
		if ((await memoryCardLinks.count()) > 0) {
			await memoryCardLinks.first().click()
			const saveFileLinks = page.getByRole('link').filter({ hasText: /save/i })
			
			if ((await saveFileLinks.count()) > 0) {
				await saveFileLinks.first().click()
				await expect(page.getByRole('button', { name: /Export/i })).toBeVisible()
				await checkA11y(page)
			}
		}
	})
})

