import fs from 'node:fs/promises'
import path from 'node:path'
import { type Route } from './+types/extracts.$saveId.view.png.ts'

export async function loader({ params }: Route.LoaderArgs) {
	const { saveId } = params
	if (!saveId) {
		return new Response('Save ID required', { status: 400 })
	}

	// Sanitize saveId to prevent directory traversal
	const sanitizedSaveId = path.basename(saveId)
	const iconPath = path.join(
		process.cwd(),
		'uploads',
		'extracts',
		sanitizedSaveId,
		'view.png',
	)

	try {
		const fileBuffer = await fs.readFile(iconPath)
		return new Response(fileBuffer, {
			headers: {
				'Content-Type': 'image/png',
				'Content-Length': fileBuffer.length.toString(),
				'Cache-Control': 'public, max-age=31536000, immutable',
			},
		})
	} catch {
		return new Response('Icon not found', { status: 404 })
	}
}

