import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const svgPath = path.join(__dirname, '../app/assets/favicons/favicon.svg')
const appAssetsDir = path.join(__dirname, '../app/assets/favicons')
const publicFaviconsDir = path.join(__dirname, '../public/favicons')
const publicDir = path.join(__dirname, '../public')

// Ensure directories exist
if (!fs.existsSync(appAssetsDir)) {
	fs.mkdirSync(appAssetsDir, { recursive: true })
}
if (!fs.existsSync(publicFaviconsDir)) {
	fs.mkdirSync(publicFaviconsDir, { recursive: true })
}

async function convertSvgToPng() {
	try {
		const svgBuffer = fs.readFileSync(svgPath)
		
		// Generate apple-touch-icon.png (180x180) for app/assets
		const appleTouchIconPath = path.join(appAssetsDir, 'apple-touch-icon.png')
		await sharp(svgBuffer)
			.resize(180, 180, {
				fit: 'contain',
				background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
			})
			.png()
			.toFile(appleTouchIconPath)
		console.log(`✓ Generated ${appleTouchIconPath}`)
		
		// Generate android-chrome-192x192.png for public/favicons
		// Note: Android icons should not have transparent backgrounds
		const android192Path = path.join(publicFaviconsDir, 'android-chrome-192x192.png')
		await sharp(svgBuffer)
			.resize(192, 192, {
				fit: 'contain',
				background: { r: 31, g: 32, b: 40 } // Match background_color from manifest
			})
			.png()
			.toFile(android192Path)
		console.log(`✓ Generated ${android192Path}`)
		
		// Generate android-chrome-512x512.png for public/favicons
		// Note: Android icons should not have transparent backgrounds
		const android512Path = path.join(publicFaviconsDir, 'android-chrome-512x512.png')
		await sharp(svgBuffer)
			.resize(512, 512, {
				fit: 'contain',
				background: { r: 31, g: 32, b: 40 } // Match background_color from manifest
			})
			.png()
			.toFile(android512Path)
		console.log(`✓ Generated ${android512Path}`)
		
		// Generate favicon.ico (48x48) for public folder
		const faviconIcoPath = path.join(publicDir, 'favicon.ico')
		await sharp(svgBuffer)
			.resize(48, 48, {
				fit: 'contain',
				background: { r: 255, g: 255, b: 255, alpha: 0 }
			})
			.png()
			.toFile(faviconIcoPath)
		console.log(`✓ Generated ${faviconIcoPath}`)
		
		console.log('\n✅ All favicons generated successfully!')
	} catch (error) {
		console.error('Error converting SVG to PNG:', error)
		process.exit(1)
	}
}

convertSvgToPng()
