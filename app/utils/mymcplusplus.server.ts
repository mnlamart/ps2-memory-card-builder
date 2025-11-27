import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import iconv from 'iconv-lite'
import sharp from 'sharp'
import { fileExists } from './file-handler.server.ts'

const MYMCPLUSPLUS_CMD = process.env.MYMCPLUSPLUS_CMD || 'mymcplusplus'

export interface CommandResult {
	stdout: string
	stderr: string
	exitCode: number
}

async function executeCommand(
	args: string[],
	input?: string,
	cwd?: string,
): Promise<CommandResult> {
	return new Promise((resolve) => {
		const spawnOptions: { stdio: ('pipe' | 'ignore')[]; cwd?: string } = {
			stdio: input ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
		}
		if (cwd) {
			spawnOptions.cwd = cwd
		}
		const child = spawn(MYMCPLUSPLUS_CMD, args, spawnOptions)

		let stdout = ''
		let stderr = ''

		child.stdout?.on('data', (data) => {
			stdout += data.toString()
		})

		child.stderr?.on('data', (data) => {
			stderr += data.toString()
		})

		if (input && child.stdin) {
			child.stdin.write(input)
			child.stdin.end()
		}

		child.on('close', (code) => {
			resolve({
				stdout: stdout.trim(),
				stderr: stderr.trim(),
				exitCode: code ?? 0,
			})
		})

		child.on('error', (error) => {
			let errorMessage = error.message
			
			// Provide helpful error message for ENOENT (command not found)
			if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
				errorMessage = `Command "${MYMCPLUSPLUS_CMD}" not found. Please ensure mymcplusplus is installed and available in your PATH, or set the MYMCPLUSPLUS_CMD environment variable to the full path of the mymcplusplus executable.\n\nInstallation: pip install mymcplusplus`
			}
			
			resolve({
				stdout: '',
				stderr: errorMessage,
				exitCode: 1,
			})
		})
	})
}

/**
 * Formats a memory card by creating a new empty memory card file.
 * Note: mymcplusplus format creates a NEW file, so we need to delete
 * the existing file first if it exists, then create a new formatted one.
 */
export async function format(memoryCardPath: string): Promise<void> {
	// Delete the existing file if it exists (mymcplusplus format creates a new file)
	if (await fileExists(memoryCardPath)) {
		await fs.unlink(memoryCardPath)
	}

	// Create a new formatted memory card at the same path
	const result = await executeCommand(['-i', memoryCardPath, 'format'])
	if (result.exitCode !== 0) {
		const errorMsg = result.stderr || result.stdout
		// Check if it's a command not found error
		if (errorMsg.includes('not found') || errorMsg.includes('ENOENT')) {
			throw new Error(
				`mymcplusplus is not installed or not in your PATH. ` +
				`Please install it with: pip install mymcplusplus\n\n` +
				`Alternatively, set the MYMCPLUSPLUS_CMD environment variable to the full path of the mymcplusplus executable.`
			)
		}
		throw new Error(`Format failed: ${errorMsg}`)
	}
}

export interface DfResult {
	free: number
	used: number
	total: number
	unit: string
}

export async function df(memoryCardPath: string): Promise<DfResult> {
	const result = await executeCommand(['-i', memoryCardPath, 'df'])
	if (result.exitCode !== 0) {
		throw new Error(`DF failed: ${result.stderr || result.stdout}`)
	}

	// Parse output - mymcplusplus df outputs: "filename: X bytes free."
	const output = result.stdout.trim()
	
	// Standard PS2 memory card size is 8MB = 8388608 bytes
	const TOTAL_BYTES = 8 * 1024 * 1024 // 8388608 bytes
	
	// Extract free space in bytes from output like: "filename: 8247296 bytes free."
	const bytesMatch = output.match(/(\d+)\s*bytes?\s*free/i)
	
	if (bytesMatch) {
		const freeBytes = parseInt(bytesMatch[1] ?? '0', 10)
		const usedBytes = TOTAL_BYTES - freeBytes
		
		// Convert to KB for consistency with the interface
		return {
			free: Math.floor(freeBytes / 1024),
			used: Math.floor(usedBytes / 1024),
			total: Math.floor(TOTAL_BYTES / 1024), // 8192 KB
			unit: 'KB',
		}
	}

	// Fallback: return default values
	return {
		free: 0,
		used: 0,
		total: 8192,
		unit: 'KB',
	}
}

export interface SaveFile {
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

/**
 * Extracts game title from icon.sys file.
 * icon.sys contains the title at offset 0xC0 in Shift-JIS encoding.
 */
async function extractIconSys(
	memoryCardPath: string,
	savePath: string,
): Promise<string | null> {
	const tmpDir = os.tmpdir()
	const tmpPath = path.join(tmpDir, `icon-sys-${Date.now()}-${Math.random().toString(36).slice(2)}`)
	
	try {
		// Extract icon.sys to temporary file
		const result = await executeCommand([
			'-i',
			memoryCardPath,
			'extract',
			'-o',
			tmpPath,
			`${savePath}/icon.sys`,
		])
		
		if (result.exitCode !== 0) {
			return null
		}
		
		// Read the binary file
		const buffer = await fs.readFile(tmpPath)
		
		// Check for PS2D magic number at the start
		if (buffer.length < 0xC0 + 64) {
			return null
		}
		
		// Extract title from offset 0xC0 (up to 64 bytes)
		const titleBuffer = buffer.subarray(0xC0, 0xC0 + 64)
		
		// Find null terminator
		let nullIndex = titleBuffer.indexOf(0)
		if (nullIndex === -1) {
			nullIndex = titleBuffer.length
		}
		
		const titleBytes = titleBuffer.subarray(0, nullIndex)
		
		// Decode Shift-JIS encoding
		const title = iconv.decode(titleBytes, 'shift_jis').trim()
		
		return title || null
	} catch {
		return null
	} finally {
		// Clean up temporary file
		try {
			await fs.unlink(tmpPath)
		} catch {
			// Ignore cleanup errors
		}
	}
}

/**
 * Extracts view.ico file with caching support.
 * Converts .ico to PNG for better browser compatibility.
 * Checks cache first, extracts only if not cached.
 */
async function extractViewIco(
	memoryCardPath: string,
	savePath: string,
	saveId: string,
): Promise<string | null> {
	const extractsDir = path.join(process.cwd(), 'uploads', 'extracts', saveId)
	const cachedIconPath = path.join(extractsDir, 'view.png')
	const tempIcoPath = path.join(extractsDir, 'view.ico')
	
	// Check cache first (PNG version)
	if (await fileExists(cachedIconPath)) {
		// Return route path for serving
		return `/resources/extracts/${saveId}/view.png`
	}
	
	try {
		// Create directory if needed
		await fs.mkdir(extractsDir, { recursive: true })
		
		// Extract view.ico to temporary location
		const result = await executeCommand([
			'-i',
			memoryCardPath,
			'extract',
			'-o',
			tempIcoPath,
			`${savePath}/view.ico`,
		])
		
		if (result.exitCode !== 0) {
			return null
		}
		
		// Verify .ico file was created
		if (!(await fileExists(tempIcoPath))) {
			return null
		}
		
		// Convert .ico to PNG using sharp
		await sharp(tempIcoPath)
			.png()
			.toFile(cachedIconPath)
		
		// Clean up temporary .ico file
		try {
			await fs.unlink(tempIcoPath)
		} catch {
			// Ignore cleanup errors
		}
		
		// Verify PNG file was created
		if (await fileExists(cachedIconPath)) {
			return `/resources/extracts/${saveId}/view.png`
		}
		
		return null
	} catch {
		// Clean up temporary .ico file on error
		try {
			await fs.unlink(tempIcoPath)
		} catch {
			// Ignore cleanup errors
		}
		return null
	}
}

/**
 * Extracts region code from product code prefix.
 */
function extractRegion(productCode: string): string | undefined {
	if (productCode.startsWith('BESLES')) {
		return 'Europe (PAL)'
	}
	if (productCode.startsWith('BASLUS')) {
		return 'USA (NTSC-U)'
	}
	if (productCode.startsWith('BISLPM')) {
		return 'Japan (NTSC-J)'
	}
	return undefined
}

export async function listContents(memoryCardPath: string): Promise<SaveFile[]> {
	const result = await executeCommand(['-i', memoryCardPath, 'ls'])
	if (result.exitCode !== 0) {
		throw new Error(`List failed: ${result.stderr || result.stdout}`)
	}

	// Parse ls output format: [permissions] [number] [date] [time] [name]
	// Example: rwx--d----+----       5 2025-11-16 19:26:03 BESLES-51044
	const lines = result.stdout.trim().split('\n').filter((line) => line.trim())
	
	const saves: SaveFile[] = []
	
	for (const line of lines) {
		const trimmed = line.trim()
		
		// Filter out "." and ".." entries
		if (trimmed.endsWith(' .') || trimmed.endsWith(' ..')) {
			continue
		}
		
		// Split by whitespace
		const parts = trimmed.split(/\s+/)
		
		if (parts.length < 5) {
			continue
		}
		
		const mode = parts[0] || ''
		const fileCount = parseInt(parts[1] || '0', 10)
		const date = parts[2] || ''
		const time = parts[3] || ''
		const name = parts.slice(4).join(' ') // Product code (may contain spaces, but typically doesn't)
		
		// Skip "." and ".." entries
		if (name === '.' || name === '..') {
			continue
		}
		
		// Extract product code and region
		const productCode = name.trim()
		const region = extractRegion(productCode)
		
		// Parse date and time into ISO string
		let dateTime: string | undefined
		if (date && time) {
			try {
				// Format: YYYY-MM-DD HH:MM:SS
				const dateTimeStr = `${date} ${time}`
				const parsedDate = new Date(dateTimeStr)
				if (!isNaN(parsedDate.getTime())) {
					dateTime = parsedDate.toISOString()
				}
			} catch {
				// Ignore date parsing errors
			}
		}
		
		// Extract game title from icon.sys
		let gameTitle: string | null = null
		try {
			gameTitle = await extractIconSys(memoryCardPath, name)
		} catch {
			// Continue if icon.sys extraction fails
		}
		
		// Extract view.ico for thumbnail
		let iconPath: string | undefined
		try {
			const extractedIcon = await extractViewIco(memoryCardPath, name, name)
			if (extractedIcon) {
				iconPath = extractedIcon
			}
		} catch {
			// Continue if view.ico extraction fails
		}
		
		saves.push({
			name,
			path: name,
			productCode,
			region,
			mode,
			fileCount,
			date: dateTime,
			gameTitle: gameTitle || undefined,
			iconPath,
		})
	}
	
	return saves
}

export async function getSaveDetails(
	memoryCardPath: string,
	saveId: string,
): Promise<Record<string, unknown>> {
	// Run dir command (works at root level, shows first save)
	const result = await executeCommand([
		'-i',
		memoryCardPath,
		'dir',
	])
	
	if (result.exitCode !== 0) {
		throw new Error(`Dir failed: ${result.stderr || result.stdout}`)
	}

	// Parse multi-line dir output
	// Line 0: BESLES-51044                     Ｂｕｒｎｏｕｔ　２ (product code + spaces + game title)
	// Line 1:   79KB Not Protected (size + protection status)
	// Line 2: (empty)
	// Line 3: 8,054 KB Free (free space info)
	const lines = result.stdout.trim().split('\n')
	
	let productCode: string | undefined
	let gameTitle: string | undefined
	let sizeKB: number | undefined
	let protectionStatus: string | undefined
	
	if (lines.length > 0) {
		// Parse line 0: product code and game title
		const line0 = lines[0]?.trim() || ''
		// Split by multiple spaces to separate product code from title
		const parts = line0.split(/\s{2,}/)
		if (parts.length >= 1) {
			productCode = parts[0]?.trim()
		}
		if (parts.length >= 2) {
			gameTitle = parts.slice(1).join(' ').trim()
		}
	}
	
	if (lines.length > 1) {
		// Parse line 1: size and protection status
		const line1 = lines[1]?.trim() || ''
		// Extract size (e.g., "79KB")
		const sizeMatch = line1.match(/(\d+)\s*KB/i)
		if (sizeMatch) {
			sizeKB = parseInt(sizeMatch[1] || '0', 10)
		}
		// Extract protection status
		if (line1.includes('Protected')) {
			protectionStatus = 'Protected'
		} else if (line1.includes('Not Protected')) {
			protectionStatus = 'Not Protected'
		}
	}
	
	// If game title not found in dir output, try extracting from icon.sys
	if (!gameTitle) {
		try {
			const extractedTitle = await extractIconSys(memoryCardPath, saveId)
			if (extractedTitle) {
				gameTitle = extractedTitle
			}
		} catch {
			// Fallback to product code if extraction fails
		}
	}
	
	// Extract view.ico for thumbnail
	let iconPath: string | undefined
	try {
		const extractedIcon = await extractViewIco(memoryCardPath, saveId, saveId)
		if (extractedIcon) {
			iconPath = extractedIcon
		}
	} catch {
		// Continue if view.ico extraction fails
	}
	
	// Extract region from product code
	const region = productCode ? extractRegion(productCode) : undefined
	
	return {
		id: saveId,
		productCode,
		gameTitle: gameTitle || productCode,
		region,
		sizeKB,
		protectionStatus,
		iconPath,
		details: result.stdout,
	}
}

export async function importSave(
	memoryCardPath: string,
	saveFilePath: string,
): Promise<void> {
	const result = await executeCommand([
		'-i',
		memoryCardPath,
		'import',
		saveFilePath,
	])
	if (result.exitCode !== 0) {
		const errorMessage = result.stderr || result.stdout
		
		// Check if the error is about a directory already existing
		if (errorMessage.includes('directory exists')) {
			// Extract the save ID from the error message (format: "/SAVEID: directory exists")
			const match = errorMessage.match(/[/\\]([^/:\\]+):\s*directory exists/i)
			const saveId = match ? match[1] : 'the save'
			
			throw new Error(
				`Save file "${saveId}" already exists on this memory card. ` +
				`Please delete the existing save first or use a different memory card.`
			)
		}
		
		throw new Error(`Import failed: ${errorMessage}`)
	}
}

export async function exportSave(
	memoryCardPath: string,
	saveId: string,
	format: string = 'max',
): Promise<string> {
	const outputDir = path.join(process.cwd(), 'uploads', 'exports')
	await fs.mkdir(outputDir, { recursive: true })

	// mymcplusplus export creates the file in the current working directory
	// with the name <saveId>.psu, not at the specified path
	// So we need to run the command from the output directory
	const finalPath = path.join(outputDir, `${saveId}.${format}`)
	const psuPath = path.join(outputDir, `${saveId}.psu`)
	
	// Delete existing files if they exist (mymcplusplus export doesn't overwrite)
	if (await fileExists(psuPath)) {
		await fs.unlink(psuPath)
	}
	if (await fileExists(finalPath)) {
		await fs.unlink(finalPath)
	}
	
	// Use absolute path for memory card to avoid issues with cwd change
	const absoluteMemoryCardPath = path.isAbsolute(memoryCardPath)
		? memoryCardPath
		: path.join(process.cwd(), memoryCardPath)
	
	const commandArgs = [
		'-i',
		absoluteMemoryCardPath,
		'export',
		saveId,
		// Note: mymcplusplus export creates <saveId>.psu in the current working directory
		// It doesn't accept an output path argument, so we rely on cwd
	]
	
	// Run export command from output directory
	// mymcplusplus will create <saveId>.psu in the outputDir
	const result = await executeCommand(
		commandArgs,
		undefined,
		outputDir, // Set working directory to output directory
	)

	if (result.exitCode !== 0) {
		throw new Error(`Export failed: ${result.stderr || result.stdout}`)
	}

	// mymcplusplus creates <saveId>.psu by default
	// Check if the .psu file was created and rename it to the requested format
	if (await fileExists(psuPath)) {
		if (format !== 'psu') {
			// Rename to requested format
			await fs.rename(psuPath, finalPath)
			return finalPath
		} else {
			// Format is psu, use the file as-is
			return psuPath
		}
	} else if (await fileExists(finalPath)) {
		// File already has correct name (maybe from a previous export with same format)
		return finalPath
	} else {
		throw new Error(`Export file not found: expected ${saveId}.psu or ${saveId}.${format}`)
	}
}

export async function deleteSave(
	memoryCardPath: string,
	saveId: string,
): Promise<void> {
	const result = await executeCommand([
		'-i',
		memoryCardPath,
		'delete',
		saveId,
	])
	if (result.exitCode !== 0) {
		throw new Error(`Delete failed: ${result.stderr || result.stdout}`)
	}
}

export async function addFile(
	memoryCardPath: string,
	sourceFilePath: string,
	targetPath?: string,
): Promise<void> {
	const args = ['-i', memoryCardPath, 'add', sourceFilePath]
	if (targetPath) {
		args.push(targetPath)
	}

	const result = await executeCommand(args)
	if (result.exitCode !== 0) {
		throw new Error(`Add failed: ${result.stderr || result.stdout}`)
	}
}

export async function extractFile(
	memoryCardPath: string,
	sourcePath: string,
): Promise<string> {
	const outputDir = path.join(process.cwd(), 'uploads', 'extracts')
	await fs.mkdir(outputDir, { recursive: true })

	const fileName = path.basename(sourcePath)
	const outputPath = path.join(outputDir, fileName)

	const result = await executeCommand([
		'-i',
		memoryCardPath,
		'extract',
		sourcePath,
		outputPath,
	])

	if (result.exitCode !== 0) {
		throw new Error(`Extract failed: ${result.stderr || result.stdout}`)
	}

	return outputPath
}

export async function mkdir(
	memoryCardPath: string,
	dirPath: string,
): Promise<void> {
	const result = await executeCommand([
		'-i',
		memoryCardPath,
		'mkdir',
		dirPath,
	])
	if (result.exitCode !== 0) {
		throw new Error(`Mkdir failed: ${result.stderr || result.stdout}`)
	}
}

export interface CheckResult {
	errors: string[]
	warnings: string[]
	clean: boolean
}

export async function check(memoryCardPath: string): Promise<CheckResult> {
	const result = await executeCommand(['-i', memoryCardPath, 'check'])

	const errors: string[] = []
	const warnings: string[] = []

	if (result.exitCode !== 0) {
		errors.push(result.stderr || result.stdout)
	} else {
		// Parse check output for warnings
		const output = result.stdout.toLowerCase()
		if (output.includes('warning')) {
			warnings.push(result.stdout)
		}
	}

	return {
		errors,
		warnings,
		clean: errors.length === 0 && warnings.length === 0,
	}
}

export async function setFlags(
	memoryCardPath: string,
	filePath: string,
	flags: string,
): Promise<void> {
	const result = await executeCommand([
		'-i',
		memoryCardPath,
		'set',
		filePath,
		flags,
	])
	if (result.exitCode !== 0) {
		throw new Error(`Set flags failed: ${result.stderr || result.stdout}`)
	}
}

export async function clearFlags(
	memoryCardPath: string,
	filePath: string,
): Promise<void> {
	const result = await executeCommand([
		'-i',
		memoryCardPath,
		'clear',
		filePath,
	])
	if (result.exitCode !== 0) {
		throw new Error(`Clear flags failed: ${result.stderr || result.stdout}`)
	}
}

