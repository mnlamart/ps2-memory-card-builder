import { ArrowLeft, Download, Trash2, Shield, Gamepad2, Calendar, HardDrive, FolderOpen, Info } from 'lucide-react'
import { useEffect } from 'react'
import { redirect, Form, Link, useLoaderData, useNavigate  } from 'react-router'
import { Breadcrumbs } from '#app/components/breadcrumbs.tsx'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#app/components/ui/alert-dialog.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '#app/components/ui/card.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuLabel,
	DropdownMenuSeparator,
} from '#app/components/ui/dropdown-menu.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { getSaveDetails, listContents } from '#app/utils/mymcplusplus.server.ts'
import { type Route } from './+types/$id.save.$saveId.tsx'

export async function loader({ params }: Route.LoaderArgs) {
	const { id, saveId } = params
	if (!id || !saveId) {
		throw redirect('/')
	}

	const cardInfo = await getMemoryCardInfo(id)
	if (!cardInfo) {
		throw redirect('/')
	}

	try {
		const decodedSaveId = decodeURIComponent(saveId)
		
		// First, check if the save exists by listing contents
		const contents = await listContents(cardInfo.path)
		const saveFile = contents.find(
			(save) => 
				save.path === decodedSaveId || 
				save.name === decodedSaveId ||
				decodeURIComponent(save.path) === decodedSaveId ||
				decodeURIComponent(save.name) === decodedSaveId
		)

		if (!saveFile) {
			// Save file doesn't exist, redirect to memory card page
			throw redirect(`/memory-cards/${id}`)
		}

		// Try to get additional save details (this might fail, but that's okay)
		let saveDetails: Record<string, unknown> = {}
		try {
			saveDetails = await getSaveDetails(cardInfo.path, decodedSaveId)
		} catch {
			// If getSaveDetails fails, we'll just use the basic info from listContents
		}

		return {
			card: cardInfo,
			save: {
				id: saveId,
				name: saveFile.name || decodedSaveId,
				path: saveFile.path || decodedSaveId,
				size: saveFile.size,
				date: saveFile.date,
				folder: saveFile.folder,
				flags: saveFile.flags,
				gameTitle: saveFile.gameTitle || (saveDetails.gameTitle as string | undefined),
				productCode: saveFile.productCode || (saveDetails.productCode as string | undefined),
				region: saveFile.region || (saveDetails.region as string | undefined),
				protectionStatus: saveFile.protectionStatus || (saveDetails.protectionStatus as string | undefined),
				mode: saveFile.mode || (saveDetails.mode as string | undefined),
				fileCount: saveFile.fileCount || (saveDetails.fileCount as number | undefined),
				sizeKB: saveFile.sizeKB || (saveDetails.sizeKB as number | undefined),
				iconPath: saveFile.iconPath || (saveDetails.iconPath as string | undefined),
				details: saveDetails.details,
			},
		}
	} catch (error) {
		// If it's a redirect, re-throw it
		if (error instanceof Response && error.status >= 300 && error.status < 400) {
			throw error
		}
		// Otherwise, redirect to memory card page
		throw redirect(`/memory-cards/${id}`)
	}
}

type SaveData = {
	id: string
	name: string
	path: string
	size?: number
	date?: string
	folder?: string
	flags?: string[]
	details?: unknown
	gameTitle?: string
	productCode?: string
	region?: string
	protectionStatus?: string
	mode?: string
	fileCount?: number
	sizeKB?: number
	iconPath?: string
}

export default function SaveFileDetail() {
	const { card, save: saveData } = useLoaderData<typeof loader>()
	const save = saveData as SaveData
	const navigate = useNavigate()

	// Add keyboard shortcut for back navigation
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				navigate(`/memory-cards/${card.id}`)
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [navigate, card.id])

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
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
		}).format(dateObj)
	}


	const isProtected = save.flags?.includes('protected') ?? false

	return (
		<div className="min-h-screen">
			<header className="border-b bg-card">
				<div className="container mx-auto px-4 py-5">
					<Breadcrumbs
						items={[
							{ label: card.name, href: `/memory-cards/${card.id}` },
							{ label: save.name },
						]}
						className="mb-4"
					/>
					<div className="flex items-center gap-4 mb-4">
						<Link to={`/memory-cards/${card.id}`}>
							<Button variant="ghost" size="icon" className="h-10 w-10">
								<ArrowLeft className="h-5 w-5" />
							</Button>
						</Link>
						<div className="flex items-center gap-3 flex-1">
							<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
								<Gamepad2 className="h-6 w-6 text-primary" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2 mb-1.5 flex-wrap">
									<h1 className="text-foreground font-bold text-xl">{save.name}</h1>
									{isProtected && (
										<Badge variant="secondary" className="gap-1">
											<Shield className="h-3 w-3" />
											Protected
										</Badge>
									)}
								</div>
								<p className="text-sm text-muted-foreground mt-1">
									{card.filename}
								</p>
							</div>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button>
									<Download className="h-4 w-4 mr-2" />
									Export
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuLabel>Export Format</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<a
										href={`/memory-cards/${card.id}/save/${encodeURIComponent(save.path || save.name)}/export?format=max`}
										target="_blank"
										rel="noopener noreferrer"
									>
										.MAX (Action Replay)
									</a>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<a
										href={`/memory-cards/${card.id}/save/${encodeURIComponent(save.path || save.name)}/export?format=psu`}
										target="_blank"
										rel="noopener noreferrer"
									>
										.PSU (PS3)
									</a>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<a
										href={`/memory-cards/${card.id}/save/${encodeURIComponent(save.path || save.name)}/export?format=sps`}
										target="_blank"
										rel="noopener noreferrer"
									>
										.SPS (SharkPort)
									</a>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<a
										href={`/memory-cards/${card.id}/save/${encodeURIComponent(save.path || save.name)}/export?format=xps`}
										target="_blank"
										rel="noopener noreferrer"
									>
										.XPS (X-Port)
									</a>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<a
										href={`/memory-cards/${card.id}/save/${encodeURIComponent(save.path || save.name)}/export?format=cbs`}
										target="_blank"
										rel="noopener noreferrer"
									>
										.CBS (CodeBreaker)
									</a>
								</DropdownMenuItem>
								<DropdownMenuItem asChild>
									<a
										href={`/memory-cards/${card.id}/save/${encodeURIComponent(save.path || save.name)}/export?format=psv`}
										target="_blank"
										rel="noopener noreferrer"
									>
										.PSV (PS1/PS2)
									</a>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>

						<AlertDialog>
							<AlertDialogTrigger asChild>
								<Button variant="destructive" type="button">
									<Trash2 className="h-4 w-4 mr-2" />
									Delete
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<Form
									method="post"
									action={`/memory-cards/${card.id}/save/${encodeURIComponent(save.path || save.name)}/delete`}
								>
									<AlertDialogHeader>
										<AlertDialogTitle>Delete Save File?</AlertDialogTitle>
										<AlertDialogDescription>
											This will permanently delete "{save.name}" from the
											memory card. This action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction asChild>
											<Button
												type="submit"
												variant="destructive"
												className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
											>
												Delete
											</Button>
										</AlertDialogAction>
									</AlertDialogFooter>
								</Form>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			</header>

			<div className="container mx-auto px-4 py-6">
				<div className="space-y-6">
					{save.iconPath && (
						<Card>
							<CardHeader>
								<CardTitle>Save Icon</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex justify-center">
									<img
										src={save.iconPath}
										alt={`${save.gameTitle || save.name} icon`}
										className="max-w-full h-auto rounded"
										onError={(e) => {
											// Hide image on error
											e.currentTarget.style.display = 'none'
										}}
									/>
								</div>
							</CardContent>
						</Card>
					)}

					<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Info className="h-5 w-5" />
									Metadata
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								{save.gameTitle && (
									<div>
										<p className="text-sm text-muted-foreground mb-1">
											Game Title
										</p>
										<p className="text-foreground text-lg font-semibold">
											{save.gameTitle}
										</p>
									</div>
								)}

								<Separator />

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{save.productCode && (
										<div>
											<p className="text-sm text-muted-foreground mb-1">
												Product Code
											</p>
											<p className="text-foreground">{save.productCode}</p>
										</div>
									)}

									{save.region && (
										<div>
											<p className="text-sm text-muted-foreground mb-1">
												Region
											</p>
											<p className="text-foreground">{save.region}</p>
										</div>
									)}

									{(save.sizeKB !== undefined || save.size) && (
										<div className="flex items-start gap-3">
											<HardDrive className="h-5 w-5 text-muted-foreground mt-0.5" />
											<div>
												<p className="text-sm text-muted-foreground">
													Size
												</p>
												<p className="text-foreground">
													{save.sizeKB !== undefined
														? `${save.sizeKB} KB`
														: save.size
															? formatBytes(save.size)
															: 'N/A'}
												</p>
											</div>
										</div>
									)}

									{save.protectionStatus && (
										<div className="flex items-start gap-3">
											<Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
											<div>
												<p className="text-sm text-muted-foreground">
													Protection Status
												</p>
												<Badge
													variant={
														save.protectionStatus === 'Protected'
															? 'secondary'
															: 'outline'
													}
													className="mt-1"
												>
													{save.protectionStatus}
												</Badge>
											</div>
										</div>
									)}

									{save.date && (
										<div className="flex items-start gap-3">
											<Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
											<div>
												<p className="text-sm text-muted-foreground">
													Last Modified
												</p>
												<p className="text-foreground">
													{formatDate(save.date)}
												</p>
											</div>
										</div>
									)}

									{save.mode && (
										<div>
											<p className="text-sm text-muted-foreground mb-1">
												File Mode
											</p>
											<p className="text-foreground font-mono text-sm">
												{save.mode}
											</p>
										</div>
									)}

									{save.fileCount !== undefined && (
										<div>
											<p className="text-sm text-muted-foreground mb-1">
												File Count
											</p>
											<p className="text-foreground">{save.fileCount}</p>
										</div>
									)}

									<div className="flex items-start gap-3">
										<FolderOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
										<div>
											<p className="text-sm text-muted-foreground">
												Memory Card
											</p>
											<p className="text-foreground">{card.filename}</p>
										</div>
									</div>

									{save.flags && save.flags.length > 0 && (
										<div className="flex items-start gap-3">
											<Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
											<div>
												<p className="text-sm text-muted-foreground">Flags</p>
												<div className="flex gap-2 mt-1 flex-wrap">
													{save.flags.map((flag) => (
														<Badge key={flag} variant="secondary">
															{flag}
														</Badge>
													))}
												</div>
											</div>
										</div>
									)}
								</div>

								{'details' in save && save.details ? (
									<>
										<Separator />
										<div>
											<p className="text-sm text-muted-foreground mb-1">
												Raw Details
											</p>
											<pre className="text-sm bg-muted p-4 rounded overflow-auto">
												{typeof save.details === 'string' 
													? save.details 
													: JSON.stringify(save.details, null, 2)}
											</pre>
										</div>
									</>
								) : null}
							</CardContent>
						</Card>
				</div>
			</div>
		</div>
	)
}

