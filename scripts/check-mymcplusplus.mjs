#!/usr/bin/env node

import { spawn } from 'node:child_process'

const MYMCPLUSPLUS_CMD = process.env.MYMCPLUSPLUS_CMD || 'mymcplusplus'

function checkMymcplusplus() {
	return new Promise((resolve) => {
		const child = spawn(MYMCPLUSPLUS_CMD, ['--help'], {
			stdio: 'ignore',
		})

		child.on('close', (code) => {
			resolve(code === 0)
		})

		child.on('error', () => {
			resolve(false)
		})
	})
}

async function main() {
	const isInstalled = await checkMymcplusplus()

	if (!isInstalled) {
		console.error('\n❌ mymcplusplus is not installed or not in your PATH')
		console.error('\n📦 To install mymcplusplus, run:')
		console.error('   pip install mymcplusplus\n')
		console.error('💡 Alternatively, set MYMCPLUSPLUS_CMD environment variable')
		console.error('   to the full path of the mymcplusplus executable.\n')
		process.exit(1)
	} else {
		console.log('✅ mymcplusplus is installed and available')
	}
}

main()

