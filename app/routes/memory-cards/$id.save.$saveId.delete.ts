import { redirect } from 'react-router'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { deleteSave } from '#app/utils/mymcplusplus.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$id.save.$saveId.delete.ts'

export async function action({ params }: Route.ActionArgs) {
	const { id, saveId } = params
	if (!id || !saveId) {
		throw redirect('/')
	}

	const cardInfo = await getMemoryCardInfo(id)
	if (!cardInfo) {
		throw redirect('/')
	}

	try {
		await deleteSave(cardInfo.path, decodeURIComponent(saveId))
		return redirectWithToast(`/memory-cards/${id}`, {
			title: 'Save file deleted',
			description: 'The save file has been successfully deleted',
			type: 'success',
		})
	} catch (error) {
		return redirectWithToast(`/memory-cards/${id}/save/${saveId}`, {
			title: 'Failed to delete',
			description:
				error instanceof Error ? error.message : 'Failed to delete save file',
			type: 'error',
		})
	}
}

