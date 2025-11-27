import fs from 'node:fs/promises'
import path from 'node:path'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'memory-cards')
const METADATA_DIR = path.join(UPLOAD_DIR, '.metadata')

interface MemoryCardMetadata {
	name: string
	filename: string
	createdAt: string
	updatedAt: string
}

/**
 * Converts a user-friendly name to a safe filename.
 * - Converts to lowercase
 * - Replaces spaces with underscores
 * - Removes special characters except underscores and hyphens
 * - Preserves file extension
 */
function sanitizeFilename(name: string, extension: string): string {
	// Remove the extension if it's already in the name
	const nameWithoutExt = name.replace(/\.(ps2|mc2)$/i, '')
	
	// Convert to lowercase, replace spaces with underscores, remove special chars
	const sanitized = nameWithoutExt
		.toLowerCase()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_-]/g, '')
		.replace(/_{2,}/g, '_') // Replace multiple underscores with single
		.replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
	
	// Ensure we have a valid filename (fallback to 'memory-card' if empty)
	const finalName = sanitized || 'memory-card'
	
	// Remove leading dot from extension if present
	const ext = extension.startsWith('.') ? extension.slice(1) : extension
	
	return `${finalName}.${ext}`
}

async function ensureMetadataDir(): Promise<void> {
	await fs.mkdir(METADATA_DIR, { recursive: true })
}

function getMetadataPath(id: string): string {
	return path.join(METADATA_DIR, `${id}.json`)
}

async function readMetadata(id: string): Promise<MemoryCardMetadata | null> {
	try {
		const metadataPath = getMetadataPath(id)
		const content = await fs.readFile(metadataPath, 'utf-8')
		return JSON.parse(content) as MemoryCardMetadata
	} catch {
		return null
	}
}

async function writeMetadata(id: string, metadata: MemoryCardMetadata): Promise<void> {
	await ensureMetadataDir()
	const metadataPath = getMetadataPath(id)
	await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8')
}

/**
 * Gets the user-friendly name for a memory card
 */
export async function getMemoryCardName(id: string): Promise<string | null> {
	const metadata = await readMetadata(id)
	return metadata?.name || null
}

/**
 * Gets the stored filename for a memory card
 */
export async function getMemoryCardFilename(id: string): Promise<string | null> {
	const metadata = await readMetadata(id)
	return metadata?.filename || null
}

/**
 * Sets the user-friendly name for a memory card and optionally renames the file.
 * Returns the sanitized filename that was used.
 */
export async function setMemoryCardName(
	id: string,
	name: string,
	ext: string,
	oldFilePath?: string,
): Promise<string> {
	await ensureMetadataDir()
	
	// Remove extension from name if present
	const cleanName = name.replace(/\.(ps2|mc2)$/i, '')
	
	// Sanitize the filename
	const sanitizedFilename = sanitizeFilename(cleanName, ext)
	
	// Read existing metadata or create new
	const existing = await readMetadata(id)
	const now = new Date().toISOString()
	
	const metadata: MemoryCardMetadata = {
		name: cleanName,
		filename: sanitizedFilename,
		createdAt: existing?.createdAt || now,
		updatedAt: now,
	}
	
	// Handle file renaming if needed
	const newFilePath = path.join(UPLOAD_DIR, sanitizedFilename)
	
	if (oldFilePath) {
		// If oldFilePath is provided, rename from that path
		const oldFilename = path.basename(oldFilePath)
		if (oldFilename !== sanitizedFilename) {
			try {
				await fs.rename(oldFilePath, newFilePath)
			} catch (error) {
				// If rename fails, still save the metadata
				console.error('Failed to rename memory card file:', error)
			}
		}
	} else if (existing?.filename && existing.filename !== sanitizedFilename) {
		// Otherwise, if metadata exists with a different filename, try to rename
		const oldPath = path.join(UPLOAD_DIR, existing.filename)
		try {
			await fs.rename(oldPath, newFilePath)
		} catch (error) {
			// If file doesn't exist or rename fails, continue
			// This is fine - the file might have been manually moved or deleted
		}
	}
	
	await writeMetadata(id, metadata)
	return sanitizedFilename
}

/**
 * Deletes the metadata file for a memory card
 */
export async function deleteMemoryCardMetadata(id: string): Promise<void> {
	try {
		const metadataPath = getMetadataPath(id)
		await fs.unlink(metadataPath)
	} catch {
		// Metadata file might not exist, which is fine
	}
}
