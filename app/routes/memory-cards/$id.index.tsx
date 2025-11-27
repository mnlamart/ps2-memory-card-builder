import { Upload, Search, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { redirect, Link, useLoaderData  } from 'react-router'
import { SaveFileItem } from '#app/components/save-file-item.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { df, listContents } from '#app/utils/mymcplusplus.server.ts'
import { type Route } from './+types/$id.index.tsx'

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
		const dfResult = await df(cardInfo.path)
		const contents = await listContents(cardInfo.path)

		return {
			card: cardInfo,
			df: dfResult,
			contents,
		}
	} catch {
		return {
			card: cardInfo,
			df: { free: 0, used: 0, total: 8192, unit: 'KB' },
			contents: [],
		}
	}
}

export default function MemoryCardDetail() {
	const { card, contents } = useLoaderData<typeof loader>()
	const [searchQuery, setSearchQuery] = useState('')
	const [sortBy, setSortBy] = useState<'name' | 'date' | 'size'>('date')

	const filteredSaves = contents
		.filter(
			(save) =>
				save.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				save.folder?.toLowerCase().includes(searchQuery.toLowerCase()),
		)
		.sort((a, b) => {
			switch (sortBy) {
				case 'name':
					return a.name.localeCompare(b.name)
				case 'size':
					return (b.size || 0) - (a.size || 0)
				case 'date':
				default:
					return (b.date ? new Date(b.date).getTime() : 0) -
						(a.date ? new Date(a.date).getTime() : 0)
			}
		})

	return (
		<>
				<div className="mb-6">
					<div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
						<div className="flex-1">
							<div className="relative">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									type="text"
									placeholder="Search save files..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" className="w-full sm:w-auto">
									Sort:{' '}
									{sortBy === 'name'
										? 'Name'
										: sortBy === 'date'
											? 'Date'
											: 'Size'}
									<ChevronDown className="h-4 w-4 ml-2" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => setSortBy('name')}>
									Name
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setSortBy('date')}>
									Date
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setSortBy('size')}>
									Size
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{filteredSaves.length === 0 ? (
					<Card className="border-2 border-dashed">
						<CardContent className="p-12 text-center">
							<div className="flex justify-center mb-4">
								<div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
									<Upload className="h-8 w-8 text-muted-foreground" />
								</div>
							</div>
							<h3 className="text-lg font-semibold mb-2">
								{searchQuery
									? 'No save files match your search'
									: 'No save files on this memory card'}
							</h3>
							<p className="text-muted-foreground mb-6">
								{searchQuery
									? 'Try adjusting your search terms.'
									: 'Import your first save file to get started.'}
							</p>
							{!searchQuery && (
								<Link to={`/memory-cards/${card.id}/import`}>
									<Button>
										<Upload className="h-4 w-4 mr-2" />
										Import Save File
									</Button>
								</Link>
							)}
						</CardContent>
					</Card>
				) : (
					<div className="space-y-3">
						{filteredSaves.map((save, index) => (
							<div
								key={save.path}
								className="animate-slide-left"
								style={{ animationDelay: `${index * 0.05}s` }}
							>
								<SaveFileItem
									save={save}
									memoryCardId={card.id}
								/>
							</div>
						))}
					</div>
				)}
		</>
	)
}

