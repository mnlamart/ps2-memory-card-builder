import { z } from 'zod'

export const MemoryCardUploadSchema = z.object({
	file: z.instanceof(File, { message: 'File is required' }),
})

export const SaveFileImportSchema = z.object({
	file: z.instanceof(File, { message: 'File is required' }),
	memoryCardId: z.string().min(1, 'Memory card ID is required'),
})

export const SaveFileExportSchema = z.object({
	saveId: z.string().min(1, 'Save ID is required'),
	format: z.enum(['max', 'psu', 'sps', 'xps', 'cbs', 'psv']).default('max'),
})

export const SaveFileDeleteSchema = z.object({
	saveId: z.string().min(1, 'Save ID is required'),
})

export const CreateDirectorySchema = z.object({
	path: z.string().min(1, 'Directory path is required'),
})

export const SetFlagsSchema = z.object({
	filePath: z.string().min(1, 'File path is required'),
	flags: z.string().min(1, 'Flags are required'),
})

export const ClearFlagsSchema = z.object({
	filePath: z.string().min(1, 'File path is required'),
})

export const AddFileSchema = z.object({
	sourceFilePath: z.string().min(1, 'Source file path is required'),
	targetPath: z.string().optional(),
})

export const ExtractFileSchema = z.object({
	sourcePath: z.string().min(1, 'Source path is required'),
})

