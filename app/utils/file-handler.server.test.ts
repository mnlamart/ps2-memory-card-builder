import fs from 'node:fs/promises'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fileHandler from './file-handler.server.ts'

vi.mock('node:fs/promises')

describe('file-handler.server', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('fileExists', () => {
		it('should return true if file exists', async () => {
			vi.mocked(fs.access).mockResolvedValue(undefined)

			const result = await fileHandler.fileExists('/test/path/file.ps2')

			expect(result).toBe(true)
		})

		it('should return false if file does not exist', async () => {
			vi.mocked(fs.access).mockRejectedValue(new Error('File not found'))

			const result = await fileHandler.fileExists('/test/path/file.ps2')

			expect(result).toBe(false)
		})
	})

	describe('getMemoryCardPath', () => {
		it('should return correct path for memory card', () => {
			const path = fileHandler.getMemoryCardPath('test-id')

			expect(path).toContain('test-id.ps2')
			expect(path).toContain('uploads/memory-cards')
		})
	})

	describe('saveMemoryCard', () => {
		it('should save a memory card file', async () => {
			const mockFile = new File(['test content'], 'test.ps2', {
				type: 'application/octet-stream',
			})

			vi.mocked(fs.mkdir).mockResolvedValue(undefined)
			vi.mocked(fs.writeFile).mockResolvedValue(undefined)

			const result = await fileHandler.saveMemoryCard(mockFile)

			expect(result).toHaveProperty('id')
			expect(result).toHaveProperty('path')
			expect(result).toHaveProperty('filename', 'test.ps2')
			expect(fs.writeFile).toHaveBeenCalled()
		})
	})

	describe('saveSaveFile', () => {
		it('should save a save file', async () => {
			const mockFile = new File(['test content'], 'save.max', {
				type: 'application/octet-stream',
			})

			vi.mocked(fs.mkdir).mockResolvedValue(undefined)
			vi.mocked(fs.writeFile).mockResolvedValue(undefined)

			const result = await fileHandler.saveSaveFile(mockFile)

			expect(result).toHaveProperty('id')
			expect(result).toHaveProperty('path')
			expect(result).toHaveProperty('filename', 'save.max')
		})
	})
})

