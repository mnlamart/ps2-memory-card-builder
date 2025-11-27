import fs from 'node:fs/promises'
import { redirect } from 'react-router'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { exportSave } from '#app/utils/mymcplusplus.server.ts'
import { type Route } from './+types/$id.save.$saveId.export.ts'

export async function loader({ params, request }: Route.LoaderArgs) {
	const { id, saveId } = params
	if (!id || !saveId) {
		throw redirect('/')
	}

	const cardInfo = await getMemoryCardInfo(id)
	if (!cardInfo) {
		throw redirect('/')
	}

	const url = new URL(request.url)
	const format = (url.searchParams.get('format') || 'max') as
		| 'max'
		| 'psu'
		| 'sps'
		| 'xps'
		| 'cbs'
		| 'psv'

	try {
		const exportPath = await exportSave(
			cardInfo.path,
			decodeURIComponent(saveId),
			format,
		)

		const fileBuffer = await fs.readFile(exportPath)
		const fileName = `${decodeURIComponent(saveId)}.${format}`

		return new Response(fileBuffer, {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `attachment; filename="${fileName}"`,
				'Content-Length': fileBuffer.length.toString(),
			},
		})
	} catch {
		throw redirect(`/memory-cards/${id}/save/${saveId}`)
	}
}

