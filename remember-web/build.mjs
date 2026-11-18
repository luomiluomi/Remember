import { spawnSync } from 'node:child_process'
const result = spawnSync('rspack build -c rspack.config.ts', {
  shell: true,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
})
if (result.error) throw result.error
process.exitCode = result.status ?? 1
