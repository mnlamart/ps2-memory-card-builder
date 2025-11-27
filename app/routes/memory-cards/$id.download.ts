import fs from 'node:fs/promises'
import path from 'node:path'
import { redirect } from 'react-router'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { type Route } from './+types/$id.download.ts'

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
	
	return `${finalName}.${extension}`
}

export async function loader({ params }: Route.LoaderArgs) {
	const { id } = params
	if (!id) {
		throw redirect('/')
	}

	const cardInfo = await getMemoryCardInfo(id)
	if (!cardInfo) {
		throw redirect('/')
	}

	try {
		const fileBuffer = await fs.readFile(cardInfo.path)
		
		// Get the file extension from the actual filename
		const extension = path.extname(cardInfo.filename).slice(1) // Remove the dot
		// Use the user-friendly name for the download filename
		const downloadFilename = sanitizeFilename(cardInfo.name, extension)
		
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `attachment; filename="${downloadFilename}"`,
				'Content-Length': fileBuffer.length.toString(),
			},
		})
	} catch {
		throw new Response('Failed to download memory card', { status: 500 })
	}
}

