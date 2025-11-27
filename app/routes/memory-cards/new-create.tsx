import path from 'node:path'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { parseFormData } from '@mjackson/form-data-parser'
import { createId } from '@paralleldrive/cuid2'
import { Form, data } from 'react-router'
import { z } from 'zod'
import { ensureUploadDirs } from '#app/utils/file-handler.server.ts'
import { setMemoryCardName } from '#app/utils/memory-card-metadata.server.ts'
import { format } from '#app/utils/mymcplusplus.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/new-create.ts'

const CreateMemoryCardSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
})

export async function action({ request }: Route.ActionArgs) {
	const formData = await parseFormData(request)
	const submission = await parseWithZod(formData, {
		schema: CreateMemoryCardSchema,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	await ensureUploadDirs()

	// Generate a new ID
	const id = createId()
	
	// Save the user-friendly name (remove any file extension)
	let { name } = submission.value
	name = name.replace(/\.(ps2|mc2)$/i, '')
	
	// Set the name and get the sanitized filename
	const sanitizedFilename = await setMemoryCardName(id, name, '.ps2')
	const filePath = path.join(process.cwd(), 'uploads', 'memory-cards', sanitizedFilename)

	// Create a new empty formatted memory card with the friendly filename
	await format(filePath)

	return redirectWithToast(`/memory-cards/${id}`, {
		title: 'Memory card created',
		description: `Successfully created new empty memory card "${name}"`,
		type: 'success',
	})
}

export default function CreateMemoryCard({ actionData }: Route.ComponentProps) {
	const [form, fields] = useForm({
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreateMemoryCardSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<div className="container mx-auto px-4 py-6">
			<h1 className="text-2xl font-bold mb-6">Create New Memory Card</h1>
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
							Create Card
						</button>
						<a
							href="/"
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

