import path from 'node:path'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { parseWithZod } from '@conform-to/zod/v4'
import { parseFormData } from '@mjackson/form-data-parser'
import { Form, data } from 'react-router'
import { MemoryCardUploadSchema } from '#app/schemas/memory-card.ts'
import { saveMemoryCard } from '#app/utils/file-handler.server.ts'
import { setMemoryCardName } from '#app/utils/memory-card-metadata.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { type Route } from './+types/new.ts'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function action({ request }: Route.ActionArgs) {
	const formData = await parseFormData(request, {
		maxFileSize: MAX_FILE_SIZE,
	})

	const submission = await parseWithZod(formData, {
		schema: MemoryCardUploadSchema.refine(
			(data) => {
				const ext = data.file.name.toLowerCase().split('.').pop()
				return ext === 'ps2' || ext === 'mc2'
			},
			{
				message: 'Only .ps2 and .mc2 files are allowed',
				path: ['file'],
			},
		).refine(
			(data) => data.file.size <= MAX_FILE_SIZE,
			{
				message: 'File size must be less than 10MB',
				path: ['file'],
			},
		),
		async: true,
	})

	if (submission.status !== 'success') {
		return data(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { file } = submission.value
	const { id, path: filePath } = await saveMemoryCard(file)

	// Set the uploaded filename as the friendly name (without extension)
	const friendlyName = file.name.replace(/\.(ps2|mc2)$/i, '')
	const ext = path.extname(file.name) || '.ps2'
	// Rename the file to use the friendly name (pass the ID-based path for renaming)
	await setMemoryCardName(id, friendlyName, ext, filePath)

	return redirectWithToast(`/memory-cards/${id}`, {
		title: 'Memory card uploaded',
		description: `Successfully uploaded ${file.name}`,
		type: 'success',
	})
}

export default function NewMemoryCard({ actionData }: Route.ComponentProps) {
	const [form, fields] = useForm({
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: MemoryCardUploadSchema })
		},
		shouldValidate: 'onBlur',
		shouldRevalidate: 'onInput',
	})

	return (
		<div className="container mx-auto px-4 py-6">
			<h1 className="text-2xl font-bold mb-6">Upload Memory Card</h1>
			<Form method="post" encType="multipart/form-data" {...getFormProps(form)}>
				<div className="space-y-4">
					<div>
						<label
							htmlFor={fields.file.id}
							className="block text-sm font-medium mb-2"
						>
							Memory Card File (.ps2 or .mc2)
						</label>
						<input
							{...getInputProps(fields.file, { type: 'file' })}
							accept=".ps2,.mc2"
							className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
						/>
						{fields.file.errors && (
							<p className="mt-1 text-sm text-destructive">
								{fields.file.errors}
							</p>
						)}
					</div>
					<div className="flex gap-4">
						<button
							type="submit"
							className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Upload
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

