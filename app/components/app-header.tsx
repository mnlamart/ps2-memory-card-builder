import { Upload, Search, Plus } from 'lucide-react'
import { Link } from 'react-router'
import playstationIcon from '#app/assets/playstation.svg'
import { Button } from './ui/button.tsx'
import { Input } from './ui/input.tsx'

interface AppHeaderProps {
	searchQuery?: string
	onSearchChange?: (value: string) => void
	showSearch?: boolean
	showActions?: boolean
}

export function AppHeader({
	searchQuery = '',
	onSearchChange,
	showSearch = true,
	showActions = true,
}: AppHeaderProps) {
	return (
		<header className="border-b bg-card">
			<div className="container mx-auto px-4 py-4">
				<div className="flex items-center justify-between mb-4">
					<Link to="/" className="flex items-center gap-3">
						<div className="w-10 h-10 flex items-center justify-center">
							<img
								src={playstationIcon}
								alt="PlayStation"
								className="w-10 h-10"
							/>
						</div>
						<div>
							<h1 className="text-foreground font-bold text-lg">Memory Card Manager</h1>
							<p className="text-sm text-muted-foreground mt-0.5">
								PlayStation 2 Save File Management
							</p>
						</div>
					</Link>
				</div>

				{(showSearch || showActions) && (
					<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
						{showSearch && (
							<div className="flex-1 w-full sm:w-auto">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
									<Input
										type="text"
										placeholder="Search memory cards..."
										value={searchQuery}
										onChange={(e) => onSearchChange?.(e.target.value)}
										className="pl-9"
									/>
								</div>
							</div>
						)}
						{showActions && (
							<div className="flex gap-2">
								<Link to="/memory-cards/new-create">
									<Button variant="outline">
										<Plus className="h-4 w-4 mr-2" />
										Create New Card
									</Button>
								</Link>
								<Link to="/memory-cards/new">
									<Button>
										<Upload className="h-4 w-4 mr-2" />
										Upload Memory Card
									</Button>
								</Link>
							</div>
						)}
					</div>
				)}
			</div>
		</header>
	)
}

