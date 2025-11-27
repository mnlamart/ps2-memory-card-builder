import fs from 'node:fs/promises'
import path from 'node:path'
import { createId } from '@paralleldrive/cuid2'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'memory-cards')
const SAVES_DIR = path.join(process.cwd(), 'uploads', 'saves')
const EXPORTS_DIR = path.join(process.cwd(), 'uploads', 'exports')
const EXTRACTS_DIR = path.join(process.cwd(), 'uploads', 'extracts')

// Ensure upload directories exist
export async function ensureUploadDirs(): Promise<void> {
	await fs.mkdir(UPLOAD_DIR, { recursive: true })
	await fs.mkdir(SAVES_DIR, { recursive: true })
	await fs.mkdir(EXPORTS_DIR, { recursive: true })
	await fs.mkdir(EXTRACTS_DIR, { recursive: true })
}

export function getMemoryCardPath(id: string): string {
	return path.join(UPLOAD_DIR, `${id}.ps2`)
}

export function getMemoryCardPathWithExt(id: string, ext: string): string {
	return path.join(UPLOAD_DIR, `${id}${ext}`)
}

export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath)
		return true
	} catch {
		return false
	}
}

export async function getFileStats(filePath: string) {
	return await fs.stat(filePath)
}

export async function saveMemoryCard(
	file: File,
): Promise<{ id: string; path: string; filename: string }> {
	await ensureUploadDirs()

	const id = createId()
	const ext = path.extname(file.name) || '.ps2'
	const filePath = getMemoryCardPathWithExt(id, ext)

	const arrayBuffer = await file.arrayBuffer()
	const buffer = Buffer.from(arrayBuffer)
	await fs.writeFile(filePath, buffer)

	return {
		id,
		path: filePath,
		filename: file.name,
	}
}

export async function saveSaveFile(
	file: File,
): Promise<{ id: string; path: string; filename: string }> {
	await ensureUploadDirs()

	const id = createId()
	const ext = path.extname(file.name)
	const filePath = path.join(SAVES_DIR, `${id}${ext}`)

	const arrayBuffer = await file.arrayBuffer()
	const buffer = Buffer.from(arrayBuffer)
	await fs.writeFile(filePath, buffer)

	return {
		id,
		path: filePath,
		filename: file.name,
	}
}

export async function deleteMemoryCard(id: string): Promise<void> {
	const { getMemoryCardFilename } = await import('./memory-card-metadata.server.ts')
	
	// Try to find file by metadata filename first
	const storedFilename = await getMemoryCardFilename(id)
	if (storedFilename) {
		const filePath = path.join(UPLOAD_DIR, storedFilename)
		if (await fileExists(filePath)) {
			await fs.unlink(filePath)
			return
		}
	}
	
	// Fallback to ID-based lookup for backwards compatibility
	const filePath = getMemoryCardPath(id)
	if (await fileExists(filePath)) {
		await fs.unlink(filePath)
		return
	}

	// Try with .mc2 extension
	const mc2Path = getMemoryCardPathWithExt(id, '.mc2')
	if (await fileExists(mc2Path)) {
		await fs.unlink(mc2Path)
	}
}

