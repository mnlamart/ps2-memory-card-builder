import { Upload } from 'lucide-react'
import { useState } from 'react'
import { type MetaFunction, Link, useLoaderData } from 'react-router'
import { AppHeader } from '#app/components/app-header.tsx'
import { MemoryCardCard } from '#app/components/memory-card-card.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { ensureUploadDirs } from '#app/utils/file-handler.server.ts'
import { listMemoryCards } from '#app/utils/memory-card.server.ts'
import { type Route } from './+types/_index.ts'

export const meta: MetaFunction = () => {
	return [
		{ title: 'PS2 Memory Card Manager' },
		{ name: 'description', content: 'Manage your PlayStation 2 memory cards' },
	]
}

export async function loader(_request: Route.LoaderArgs) {
	await ensureUploadDirs()
	const memoryCards = await listMemoryCards()
	
	// Get df info for each card to calculate free space and save count
	const cardsWithInfo = await Promise.all(
		memoryCards.map(async (card) => {
			try {
				const { df, listContents } = await import('#app/utils/mymcplusplus.server.ts')
				const dfResult = await df(card.path)
				const contents = await listContents(card.path)
				return {
					...card,
					freeSpace: dfResult.free * 1024,
					totalSpace: dfResult.total * 1024,
					saveCount: contents.length,
				}
			} catch {
				return {
					...card,
					freeSpace: card.size,
					totalSpace: card.size,
					saveCount: 0,
				}
			}
		})
	)

	return { memoryCards: cardsWithInfo }
}

export default function Index() {
	const { memoryCards } = useLoaderData<typeof loader>()
	const [searchQuery, setSearchQuery] = useState('')

	const filteredCards = memoryCards.filter((card) =>
		card.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
		card.filename.toLowerCase().includes(searchQuery.toLowerCase())
	)

	return (
		<div className="min-h-screen">
			<AppHeader
				searchQuery={searchQuery}
				onSearchChange={setSearchQuery}
				showSearch={true}
				showActions={true}
			/>

			<div className="container mx-auto px-4 py-6">
				{filteredCards.length === 0 ? (
					<div className="text-center py-12 border-2 border-dashed rounded-lg">
						<p className="text-muted-foreground mb-4">
							{searchQuery
								? 'No memory cards match your search'
								: 'No memory cards found'}
						</p>
						{!searchQuery && (
							<Link to="/memory-cards/new">
								<Button>
									<Upload className="h-4 w-4 mr-2" />
									Upload Your First Memory Card
								</Button>
							</Link>
						)}
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{filteredCards.map((card) => (
							<MemoryCardCard
								key={card.id}
								card={{
									...card,
									lastModified: card.modifiedAt,
								}}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	)
}

