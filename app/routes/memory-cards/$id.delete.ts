import { redirect } from 'react-router'
import { deleteMemoryCard } from '#app/utils/file-handler.server.ts'
import { deleteMemoryCardMetadata } from '#app/utils/memory-card-metadata.server.ts'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$id.delete.ts'

export async function action({ params }: Route.ActionArgs) {
	const { id } = params
	if (!id) {
		throw redirect('/')
	}

	const cardInfo = await getMemoryCardInfo(id)
	if (!cardInfo) {
		throw redirect('/')
	}

	try {
		// Delete the memory card file
		await deleteMemoryCard(id)
		// Delete the metadata
		await deleteMemoryCardMetadata(id)
		
		return redirectWithToast('/', {
			title: 'Memory card deleted',
			description: `Successfully deleted "${cardInfo.name}"`,
			type: 'success',
		})
	} catch (error) {
		return redirectWithToast(`/memory-cards/${id}`, {
			title: 'Failed to delete',
			description:
				error instanceof Error ? error.message : 'Failed to delete memory card',
			type: 'error',
		})
	}
}





