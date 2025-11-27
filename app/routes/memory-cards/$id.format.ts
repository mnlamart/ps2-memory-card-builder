import { data, redirect } from 'react-router'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { format as formatMemoryCard } from '#app/utils/mymcplusplus.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$id.format.ts'

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
		await formatMemoryCard(cardInfo.path)
		return redirectWithToast(`/memory-cards/${id}`, {
			title: 'Memory card formatted',
			description: 'The memory card has been successfully formatted',
			type: 'success',
		})
	} catch (error) {
		return data(
			{
				error: error instanceof Error ? error.message : 'Failed to format memory card',
			},
			{ status: 400 },
		)
	}
}

