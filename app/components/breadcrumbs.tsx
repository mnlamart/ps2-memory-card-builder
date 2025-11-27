import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '#app/utils/misc.tsx'

interface BreadcrumbItem {
	label: string
	href?: string
}

interface BreadcrumbsProps {
	items: BreadcrumbItem[]
	className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
	return (
		<nav
			aria-label="Breadcrumb"
			className={cn('flex items-center gap-2 text-sm', className)}
		>
			<Link
				to="/"
				className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
			>
				<Home className="h-4 w-4" />
				<span className="sr-only">Home</span>
			</Link>
			{items.map((item, index) => (
				<div key={index} className="flex items-center gap-2">
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
					{item.href ? (
						<Link
							to={item.href}
							className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
						>
							{item.label}
						</Link>
					) : (
						<span className="text-foreground truncate max-w-[200px]">
							{item.label}
						</span>
					)}
				</div>
			))}
		</nav>
	)
}

