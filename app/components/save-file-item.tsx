import { Gamepad2, MoreVertical, Trash2, Shield, Calendar, HardDrive } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog.tsx'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { Card, CardContent } from './ui/card.tsx'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu.tsx'

interface SaveFileItemProps {
	save: {
		name: string
		path: string
		size?: number
		date?: string
		folder?: string
		flags?: string[]
		gameTitle?: string
		productCode?: string
		region?: string
		protectionStatus?: string
		mode?: string
		fileCount?: number
		sizeKB?: number
		iconPath?: string
	}
	memoryCardId: string
	onDelete?: () => void
}

export function SaveFileItem({
	save,
	memoryCardId,
	onDelete,
}: SaveFileItemProps) {
	const [imageError, setImageError] = useState(false)
	
	const formatBytes = (bytes: number) => {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
	}

	const formatDate = (date: Date | string) => {
		const dateObj = typeof date === 'string' ? new Date(date) : date
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(dateObj)
	}

	const handleExport = (format: string) => {
		window.location.href = `/memory-cards/${memoryCardId}/save/${encodeURIComponent(save.path)}/export?format=${format}`
	}

	return (
		<Card className="cursor-pointer hover:bg-accent/50 transition-colors shadow-sm hover:shadow-md border">
			<CardContent className="p-4">
				<div className="flex items-center gap-4">
					<div className="shrink-0">
						<div className="w-12 h-12 rounded-lg overflow-hidden bg-primary/10 flex items-center justify-center relative">
							{save.iconPath && !imageError ? (
								<img
									src={save.iconPath}
									alt={`${save.gameTitle || save.name} icon`}
									className="w-full h-full object-contain"
									onError={() => setImageError(true)}
								/>
							) : (
								<Gamepad2 className="h-6 w-6 text-primary" />
							)}
						</div>
					</div>

					<Link
						to={`/memory-cards/${memoryCardId}/save/${encodeURIComponent(save.path)}`}
						className="flex-1 min-w-0"
					>
						<div className="flex items-center gap-2 mb-1.5 flex-wrap">
							<h3 className="text-foreground font-semibold truncate">{save.name}</h3>
							{save.flags?.includes('protected') || save.protectionStatus === 'Protected' ? (
								<Badge variant="secondary" className="gap-1">
									<Shield className="h-3 w-3" />
									Protected
								</Badge>
							) : null}
						</div>
						{save.gameTitle && (
							<p className="text-sm text-muted-foreground mb-1.5 leading-relaxed">
								{save.gameTitle}
							</p>
						)}
						{save.folder && !save.gameTitle && (
							<p className="text-sm text-muted-foreground mb-1.5 leading-relaxed">
								{save.folder}
							</p>
						)}
						<div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
							{save.size && (
								<span className="flex items-center gap-1">
									<HardDrive className="h-3 w-3" />
									{formatBytes(save.size)}
								</span>
							)}
							{save.date && (
								<span className="flex items-center gap-1">
									<Calendar className="h-3 w-3" />
									{formatDate(save.date)}
								</span>
							)}
						</div>
					</Link>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="h-10 w-10">
								<MoreVertical className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem asChild>
								<Link
									to={`/memory-cards/${memoryCardId}/save/${encodeURIComponent(save.path)}`}
								>
									<Gamepad2 className="h-4 w-4 mr-2" />
									View Details
								</Link>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuLabel className="text-xs">Export as...</DropdownMenuLabel>
							<DropdownMenuItem onClick={() => handleExport('max')}>
								.MAX (Action Replay)
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleExport('psu')}>
								.PSU (PS3)
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleExport('sps')}>
								.SPS (SharkPort)
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleExport('xps')}>
								.XPS (X-Port)
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							{onDelete && (
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<DropdownMenuItem
											onSelect={(e) => e.preventDefault()}
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Delete
										</DropdownMenuItem>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>Delete Save File?</AlertDialogTitle>
											<AlertDialogDescription>
												This will permanently delete "{save.name}". This action
												cannot be undone.
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction
												onClick={onDelete}
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											>
												Delete
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</CardContent>
		</Card>
	)
}

