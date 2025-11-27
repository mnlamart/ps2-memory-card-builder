import { spawn } from 'node:child_process'

if (process.env.NODE_ENV === 'production') {
	await import('../server-build/index.js')
} else {
	const command =
		'tsx watch --clear-screen=false --ignore ".cache/**" --ignore "app/**" --ignore "vite.config.ts.timestamp-*" --ignore "build/**" --ignore "node_modules/**" --inspect ./index.js'
	const child = spawn(command, {
		stdio: ['ignore', 'inherit', 'inherit'],
		shell: true,
		env: {
			FORCE_COLOR: 'true',
			...process.env,
		},
		windowsHide: false,
	})

	child.on('error', (error) => {
		console.error('Failed to start dev server:', error)
		process.exit(1)
	})
}
