import { execFileSync } from 'node:child_process'

const runGit = (args) => {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return ''
  }
}

const branch = runGit(['branch', '--show-current']) || 'detached HEAD'
const commit = runGit(['rev-parse', '--short', 'HEAD']) || 'unknown'
const latestRemote = runGit([
  'for-each-ref',
  '--sort=-committerdate',
  '--format=%(refname:short)|%(objectname:short)|%(committerdate:short)|%(subject)',
  'refs/remotes/origin',
])
  .split('\n')
  .filter(Boolean)
  .filter((line) => !line.startsWith('origin/HEAD'))
  .map((line) => {
    const [ref, remoteCommit, date, ...subjectParts] = line.split('|')
    return { ref, remoteCommit, date, subject: subjectParts.join('|') }
  })[0]

console.log(`[dev-context] branch=${branch} commit=${commit}`)

if (!latestRemote) {
  console.warn('[dev-context] remote branch information is unavailable; run: git fetch --prune origin')
  process.exit(0)
}

const latestBranch = latestRemote.ref.replace(/^origin\//, '')
console.log(
  `[dev-context] latest-origin=${latestBranch} commit=${latestRemote.remoteCommit} date=${latestRemote.date}`,
)

if (branch !== latestBranch) {
  console.warn(
    `[dev-context] WARNING: current branch is not the latest origin branch. Switch to ${latestBranch} before checking the latest app.`,
  )
}
