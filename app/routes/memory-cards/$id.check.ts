import { data, redirect } from 'react-router'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { check as checkMemoryCard } from '#app/utils/mymcplusplus.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$id.check.ts'

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
		const result = await checkMemoryCard(cardInfo.path)
		
		if (result.clean) {
			return redirectWithToast(`/memory-cards/${id}`, {
				title: 'Memory card check completed',
				description: 'No errors found',
				type: 'success',
			})
		}

		const messages = [
			...result.errors.map((e) => `Error: ${e}`),
			...result.warnings.map((w) => `Warning: ${w}`),
		]

		return redirectWithToast(`/memory-cards/${id}`, {
			title: 'Memory card check completed',
			description: messages.join(', '),
			type: result.errors.length > 0 ? 'error' : 'message',
		})
	} catch (error) {
		return data(
			{
				error: error instanceof Error ? error.message : 'Failed to check memory card',
			},
			{ status: 400 },
		)
	}
}

