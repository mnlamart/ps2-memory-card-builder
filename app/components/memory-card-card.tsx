import { HardDrive, MoreVertical, Download, Pencil } from 'lucide-react'
import { Link } from 'react-router'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { Card, CardContent } from './ui/card.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu.tsx'
import { Progress } from './ui/progress.tsx'

interface MemoryCardCardProps {
	card: {
		id: string
		filename: string
		name: string
		size: number
		freeSpace: number
		totalSpace: number
		saveCount: number
		lastModified: Date
	}
}

export function MemoryCardCard({ card }: MemoryCardCardProps) {
	const usedSpace = card.totalSpace - card.freeSpace
	const usedPercentage =
		card.totalSpace > 0 ? (usedSpace / card.totalSpace) * 100 : 0

	const formatBytes = (bytes: number) => {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
	}

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		}).format(date)
	}

	return (
		<Card className="cursor-pointer hover:bg-accent/50 transition-colors">
			<CardContent className="p-4">
				<div className="flex items-center gap-4">
					<div className="shrink-0">
						<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
							<HardDrive className="h-6 w-6 text-primary" />
						</div>
					</div>

					<Link
						to={`/memory-cards/${card.id}`}
						className="flex-1 min-w-0"
					>
						<div className="flex items-center gap-2 mb-1">
							<h3 className="text-foreground truncate">{card.name}</h3>
							<Badge variant="secondary" className="shrink-0">
								{card.saveCount} saves
							</Badge>
						</div>
						<div className="flex items-center gap-4 text-sm text-muted-foreground">
							<span>{formatBytes(card.size)}</span>
							<span>{formatDate(card.lastModified)}</span>
						</div>
					</Link>

					<div className="flex items-center gap-4">
						<div className="hidden md:block w-48">
							<div className="flex items-center justify-between text-sm mb-1">
								<span className="text-muted-foreground">Storage</span>
								<span className="text-foreground">
									{formatBytes(card.freeSpace)} free
								</span>
							</div>
							<Progress value={usedPercentage} className="h-2" />
						</div>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" size="icon">
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem asChild>
									<Link to={`/memory-cards/${card.id}`}>
										<HardDrive className="h-4 w-4 mr-2" />
										Open Card
									</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link to={`/memory-cards/${card.id}/rename`}>
										<Pencil className="h-4 w-4 mr-2" />
										Rename
									</Link>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<a
										href={`/memory-cards/${card.id}/download`}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Download className="h-4 w-4 mr-2" />
										Download
									</a>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

