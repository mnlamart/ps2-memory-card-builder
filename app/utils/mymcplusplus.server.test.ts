import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as mymcplusplus from './mymcplusplus.server.ts'

vi.mock('node:child_process', () => ({
	spawn: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
	default: {
		unlink: vi.fn(),
	},
}))

vi.mock('./file-handler.server.ts', () => ({
	fileExists: vi.fn(),
}))

describe('mymcplusplus.server', () => {
	const mockMemoryCardPath = '/test/path/memory.ps2'

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('format', () => {
		it('should format a memory card successfully when file exists', async () => {
			const { fileExists } = await import('./file-handler.server.ts')
			vi.mocked(fileExists).mockResolvedValue(true)

			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			await expect(
				mymcplusplus.format(mockMemoryCardPath),
			).resolves.not.toThrow()

			expect(fs.unlink).toHaveBeenCalledWith(mockMemoryCardPath)
		})

		it('should format a memory card successfully when file does not exist', async () => {
			const { fileExists } = await import('./file-handler.server.ts')
			vi.mocked(fileExists).mockResolvedValue(false)

			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			await expect(
				mymcplusplus.format(mockMemoryCardPath),
			).resolves.not.toThrow()

			expect(fs.unlink).not.toHaveBeenCalled()
		})

		it('should throw an error if format fails', async () => {
			const { fileExists } = await import('./file-handler.server.ts')
			vi.mocked(fileExists).mockResolvedValue(true)

			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: {
					on: vi.fn((event, callback) => {
						if (event === 'data') {
							setTimeout(() => callback(Buffer.from('Format failed')), 0)
						}
					}),
				},
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(1), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			await expect(mymcplusplus.format(mockMemoryCardPath)).rejects.toThrow(
				'Format failed',
			)
		})
	})

	describe('df', () => {
		it('should parse df output correctly', async () => {
			const mockChild = {
				stdout: {
					on: vi.fn((event, callback) => {
						if (event === 'data') {
							setTimeout(() => callback(Buffer.from('Free: 4096 KB, Used: 4096 KB, Total: 8192 KB')), 0)
						}
					}),
				},
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			const result = await mymcplusplus.df(mockMemoryCardPath)

			expect(result).toEqual({
				free: 4096,
				used: 4096,
				total: 8192,
				unit: 'KB',
			})
		})

		it('should return fallback values if parsing fails', async () => {
			const mockChild = {
				stdout: {
					on: vi.fn((event, callback) => {
						if (event === 'data') {
							setTimeout(() => callback(Buffer.from('Unexpected format')), 0)
						}
					}),
				},
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			const result = await mymcplusplus.df(mockMemoryCardPath)

			expect(result).toEqual({
				free: 0,
				used: 0,
				total: 8192,
				unit: 'KB',
			})
		})
	})

	describe('listContents', () => {
		it('should parse ls output correctly', async () => {
			const mockChild = {
				stdout: {
					on: vi.fn((event, callback) => {
						if (event === 'data') {
							setTimeout(() => callback(Buffer.from('save1\nsave2\nsave3')), 0)
						}
					}),
				},
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			const result = await mymcplusplus.listContents(mockMemoryCardPath)

			expect(result).toHaveLength(3)
			expect(result[0]).toEqual({ name: 'save1', path: 'save1' })
		})

		it('should filter out directory navigation entries', async () => {
			const mockChild = {
				stdout: {
					on: vi.fn((event, callback) => {
						if (event === 'data') {
							setTimeout(
								() => callback(Buffer.from('.\n..\nsave1\nsave2')),
								0,
							)
						}
					}),
				},
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			const result = await mymcplusplus.listContents(mockMemoryCardPath)

			expect(result).toHaveLength(2)
			expect(result[0]).toEqual({ name: 'save1', path: 'save1' })
			expect(result[1]).toEqual({ name: 'save2', path: 'save2' })
			expect(result.find((save) => save.name === '.')).toBeUndefined()
			expect(result.find((save) => save.name === '..')).toBeUndefined()
		})

		it('should throw an error if ls fails', async () => {
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: {
					on: vi.fn((event, callback) => {
						if (event === 'data') {
							setTimeout(() => callback(Buffer.from('List failed')), 0)
						}
					}),
				},
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(1), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			await expect(
				mymcplusplus.listContents(mockMemoryCardPath),
			).rejects.toThrow('List failed')
		})
	})

	describe('importSave', () => {
		it('should import a save file successfully', async () => {
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			await expect(
				mymcplusplus.importSave(mockMemoryCardPath, '/test/save.max'),
			).resolves.not.toThrow()
		})
	})

	describe('exportSave', () => {
		it('should export a save file successfully', async () => {
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			const result = await mymcplusplus.exportSave(
				mockMemoryCardPath,
				'save1',
				'max',
			)

			expect(result).toContain('save1.max')
		})
	})

	describe('deleteSave', () => {
		it('should delete a save file successfully', async () => {
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			await expect(
				mymcplusplus.deleteSave(mockMemoryCardPath, 'save1'),
			).resolves.not.toThrow()
		})
	})

	describe('check', () => {
		it('should return clean result when no errors', async () => {
			const mockChild = {
				stdout: {
					on: vi.fn((event, callback) => {
						if (event === 'data') {
							setTimeout(() => callback(Buffer.from('No errors found')), 0)
						}
					}),
				},
				stderr: { on: vi.fn() },
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(0), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			const result = await mymcplusplus.check(mockMemoryCardPath)

			expect(result).toEqual({
				errors: [],
				warnings: [],
				clean: true,
			})
		})

		it('should return errors when check fails', async () => {
			const mockChild = {
				stdout: { on: vi.fn() },
				stderr: {
					on: vi.fn((event, callback) => {
						if (event === 'data') {
							setTimeout(() => callback(Buffer.from('Error found')), 0)
						}
					}),
				},
				stdin: { write: vi.fn(), end: vi.fn() },
				on: vi.fn((event, callback) => {
					if (event === 'close') {
						setTimeout(() => callback(1), 0)
					}
				}),
			}
			vi.mocked(spawn).mockReturnValue(mockChild as any)

			const result = await mymcplusplus.check(mockMemoryCardPath)

			expect(result.clean).toBe(false)
			expect(result.errors.length).toBeGreaterThan(0)
		})
	})
})

