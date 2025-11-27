import { Upload, RefreshCw, AlertTriangle, HardDrive, Download, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { redirect, Link, Outlet, useLoaderData, useFetcher, useNavigate } from 'react-router'
import { AppHeader } from '#app/components/app-header.tsx'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '#app/components/ui/alert-dialog.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent } from '#app/components/ui/card.tsx'
import { Progress } from '#app/components/ui/progress.tsx'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { df, listContents } from '#app/utils/mymcplusplus.server.ts'
import { type Route } from './+types/$id.tsx'

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

export default function MemoryCardLayout() {
	const { card, df: dfResult, contents } = useLoaderData<typeof loader>()
	const deleteFetcher = useFetcher()
	const navigate = useNavigate()
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
	const usedPercentage =
		dfResult.total > 0 ? (dfResult.used / dfResult.total) * 100 : 0

	// Handle redirect after successful deletion
	useEffect(() => {
		if (deleteFetcher.state === 'idle' && deleteFetcher.data !== undefined) {
			setIsDeleteDialogOpen(false)
			void navigate('/', { replace: true })
		}
	}, [deleteFetcher.data, deleteFetcher.state, navigate])

	const formatBytes = (bytes: number) => {
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
	}

	return (
		<div className="min-h-screen">
			<AppHeader showSearch={false} showActions={true} />
			
			<div className="border-b bg-card">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center gap-4 mb-4">
						<div className="flex items-center gap-3 flex-1">
							<div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
								<HardDrive className="h-6 w-6 text-primary" />
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="text-foreground truncate">{card.name}</h1>
								<p className="text-sm text-muted-foreground">
									{formatBytes(card.size)} • {contents.length} save files
								</p>
							</div>
						</div>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
						<Card>
							<CardContent className="p-4">
								<div className="space-y-2">
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">Storage Used</span>
										<span className="text-foreground">
											{usedPercentage.toFixed(1)}%
										</span>
									</div>
									<Progress value={usedPercentage} className="h-2" />
									<div className="flex items-center justify-between text-xs text-muted-foreground">
										<span>{formatBytes(dfResult.used * 1024)} used</span>
										<span>{formatBytes(dfResult.free * 1024)} free</span>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Total Space
									</span>
									<span className="text-foreground">
										{formatBytes(dfResult.total * 1024)}
									</span>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<span className="text-sm text-muted-foreground">
										Save Files
									</span>
									<Badge variant="secondary">{contents.length}</Badge>
								</div>
							</CardContent>
						</Card>
					</div>

					<div className="flex flex-wrap gap-2">
						<Button variant="outline" asChild>
							<a
								href={`/memory-cards/${card.id}/download`}
								target="_blank"
								rel="noopener noreferrer"
							>
								<Download className="h-4 w-4 mr-2" />
								Download Card
							</a>
						</Button>
						<Link to={`/memory-cards/${card.id}/import`}>
							<Button>
								<Upload className="h-4 w-4 mr-2" />
								Import Save
							</Button>
						</Link>
						<form method="post" action={`/memory-cards/${card.id}/check`}>
							<Button variant="outline" type="submit">
								<AlertTriangle className="h-4 w-4 mr-2" />
								Check for Errors
							</Button>
						</form>
						<form method="post" action={`/memory-cards/${card.id}/format`}>
							<Button variant="outline" type="submit">
								<RefreshCw className="h-4 w-4 mr-2" />
								Format Card
							</Button>
						</form>
						<AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
							<AlertDialogTrigger asChild>
								<Button variant="destructive">
									<Trash2 className="h-4 w-4 mr-2" />
									Delete Card
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<deleteFetcher.Form 
									method="post" 
									action={`/memory-cards/${card.id}/delete`}
								>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Delete Memory Card?
										</AlertDialogTitle>
										<AlertDialogDescription>
											This will permanently delete "{card.name}" and
											all its save files. This action cannot be undone.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel 
											onClick={() => setIsDeleteDialogOpen(false)}
										>
											Cancel
										</AlertDialogCancel>
										<Button
											type="submit"
											disabled={deleteFetcher.state !== 'idle'}
											variant="destructive"
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											{deleteFetcher.state !== 'idle' ? 'Deleting...' : 'Delete'}
										</Button>
									</AlertDialogFooter>
								</deleteFetcher.Form>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			</div>

			<div className="container mx-auto px-4 py-6">
				<Outlet />
			</div>
		</div>
	)
}
