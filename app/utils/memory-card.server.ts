import fs from 'node:fs/promises'
import path from 'node:path'
import {
	getMemoryCardPath,
	getMemoryCardPathWithExt,
	fileExists,
} from './file-handler.server.ts'
import { getMemoryCardName, getMemoryCardFilename } from './memory-card-metadata.server.ts'

export interface MemoryCardInfo {
	id: string
	filename: string
	name: string // User-friendly display name
	size: number
	path: string
	createdAt: Date
	modifiedAt: Date
}

export async function listMemoryCards(): Promise<MemoryCardInfo[]> {
	const uploadDir = path.join(process.cwd(), 'uploads', 'memory-cards')
	
	try {
		await fs.access(uploadDir)
	} catch {
		return []
	}

	const files = await fs.readdir(uploadDir)
	const memoryCards: MemoryCardInfo[] = []

	for (const file of files) {
		const filePath = path.join(uploadDir, file)
		
		// Skip metadata directory
		if (file === '.metadata') {
			continue
		}
		
		const stats = await fs.stat(filePath)
		
		// Only include .ps2 and .mc2 files
		if (file.endsWith('.ps2') || file.endsWith('.mc2')) {
			// Try to find ID by checking metadata files
			// For backwards compatibility, also check if filename matches ID pattern
			let id: string | null = null
			const metadataDir = path.join(uploadDir, '.metadata')
			
			try {
				const metadataFiles = await fs.readdir(metadataDir)
				for (const metadataFile of metadataFiles) {
					if (metadataFile.endsWith('.json')) {
						const metadataId = path.basename(metadataFile, '.json')
						const storedFilename = await getMemoryCardFilename(metadataId)
						if (storedFilename === file) {
							id = metadataId
							break
						}
					}
				}
			} catch {
				// Metadata dir might not exist
			}
			
			// Fallback: if filename looks like an ID (long alphanumeric), use it
			if (!id) {
				const basename = path.basename(file, path.extname(file))
				// CUID2 IDs are typically 24+ characters, but we'll be lenient
				if (basename.length > 10 && /^[a-z0-9]+$/i.test(basename)) {
					id = basename
				} else {
					// Generate a new ID for files without metadata
					const { createId } = await import('@paralleldrive/cuid2')
					id = createId()
				}
			}
			
			const friendlyName = id ? await getMemoryCardName(id) : null
			memoryCards.push({
				id: id || file,
				filename: file,
				name: friendlyName || file.replace(/\.(ps2|mc2)$/i, ''), // Use friendly name or filename without extension
				size: stats.size,
				path: filePath,
				createdAt: stats.birthtime,
				modifiedAt: stats.mtime,
			})
		}
	}

	return memoryCards.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())
}

export async function getMemoryCardInfo(id: string): Promise<MemoryCardInfo | null> {
	const uploadDir = path.join(process.cwd(), 'uploads', 'memory-cards')
	
	// First, try to find file by metadata filename
	const storedFilename = await getMemoryCardFilename(id)
	if (storedFilename) {
		const filePath = path.join(uploadDir, storedFilename)
		if (await fileExists(filePath)) {
			const stats = await fs.stat(filePath)
			const friendlyName = await getMemoryCardName(id)
			return {
				id,
				filename: storedFilename,
				name: friendlyName || storedFilename.replace(/\.(ps2|mc2)$/i, ''),
				size: stats.size,
				path: filePath,
				createdAt: stats.birthtime,
				modifiedAt: stats.mtime,
			}
		}
	}
	
	// Fallback to ID-based lookup for backwards compatibility
	const ps2Path = getMemoryCardPath(id)
	const mc2Path = getMemoryCardPathWithExt(id, '.mc2')

	let filePath: string | null = null
	let filename: string | null = null

	if (await fileExists(ps2Path)) {
		filePath = ps2Path
		filename = `${id}.ps2`
	} else if (await fileExists(mc2Path)) {
		filePath = mc2Path
		filename = `${id}.mc2`
	} else {
		return null
	}

	const stats = await fs.stat(filePath)
	const friendlyName = await getMemoryCardName(id)

	return {
		id,
		filename,
		name: friendlyName || filename.replace(/\.(ps2|mc2)$/i, ''), // Use friendly name or filename without extension
		size: stats.size,
		path: filePath,
		createdAt: stats.birthtime,
		modifiedAt: stats.mtime,
	}
}

