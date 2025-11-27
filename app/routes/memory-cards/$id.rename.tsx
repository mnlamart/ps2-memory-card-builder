import path from 'node:path'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { parseFormData } from '@mjackson/form-data-parser'
import { Form, data, redirect } from 'react-router'
import { z } from 'zod'
import { setMemoryCardName } from '#app/utils/memory-card-metadata.server.ts'
import { getMemoryCardInfo } from '#app/utils/memory-card.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/$id.rename.tsx'

const RenameMemoryCardSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
})

export async function loader({ params }: Route.LoaderArgs) {
	const { id } = params
	if (!id) {
		throw redirect('/')
	}

	const cardInfo = await getMemoryCardInfo(id)
	if (!cardInfo) {
		throw redirect('/')
	}

	return { card: cardInfo }
}

export async function action({ params, request }: Route.ActionArgs) {
	const { id } = params
	if (!id) {
		throw redirect('/')
	}

	const cardInfo = await getMemoryCardInfo(id)
	if (!cardInfo) {
		throw redirect('/')
	}

	const formData = await parseFormData(request)
	const submission = await parseWithZod(formData, {
		schema: RenameMemoryCardSchema,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply(), card: cardInfo },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	let { name } = submission.value
	// Remove any file extension from the name (users shouldn't be able to change it)
	name = name.replace(/\.(ps2|mc2)$/i, '')
	
	// Get the current file extension
	const ext = path.extname(cardInfo.filename) || '.ps2'
	// Rename the file to use the new friendly name
	await setMemoryCardName(id, name, ext)

	return redirectWithToast(`/memory-cards/${id}`, {
		title: 'Memory card renamed',
		description: `Successfully renamed to "${name}"`,
		type: 'success',
	})
}

export default function RenameMemoryCard({ actionData, loaderData }: Route.ComponentProps) {
	const card = loaderData?.card
	// Remove extension from the default name if it exists
	const defaultName = card?.name 
		? card.name.replace(/\.(ps2|mc2)$/i, '')
		: card?.filename 
			? card.filename.replace(/\.(ps2|mc2)$/i, '')
			: ''
	const [form, fields] = useForm({
		lastResult: actionData?.result,
		defaultValue: {
			name: defaultName,
		},
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: RenameMemoryCardSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<div className="container mx-auto px-4 py-6">
			<h1 className="text-2xl font-bold mb-6">Rename Memory Card</h1>
			<Form method="post" {...getFormProps(form)}>
				<div className="space-y-4 max-w-md">
					<div>
						<label
							htmlFor={fields.name.id}
							className="block text-sm font-medium mb-2"
						>
							Memory Card Name
						</label>
						<input
							{...getInputProps(fields.name, { type: 'text' })}
							placeholder="My PS2 Memory Card"
							className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
						{fields.name.errors && (
							<p className="mt-1 text-sm text-destructive">
								{fields.name.errors}
							</p>
						)}
					</div>
					<div className="flex gap-4">
						<button
							type="submit"
							className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Save
						</button>
						<a
							href={`/memory-cards/${card?.id}`}
							className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
						>
							Cancel
						</a>
					</div>
				</div>
			</Form>
		</div>
	)
}

