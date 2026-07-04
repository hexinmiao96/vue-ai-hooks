import { readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const changelog = readFileSync('CHANGELOG.md', 'utf8')
const vitestConfig = readFileSync('vitest.config.ts', 'utf8')
const failures = []
const normalizedChangelog = normalizeWhitespace(changelog)
const coverageThresholds = readCoverageThresholds(vitestConfig)
const coverageThresholdPhrase = coverageThresholds
  ? `${coverageThresholds.statements}% statements, ${coverageThresholds.branches}% branches, ${coverageThresholds.functions}% functions, and ${coverageThresholds.lines}% lines`
  : ''
const allowedChangeTypes = new Set([
  'Added',
  'Changed',
  'Deprecated',
  'Removed',
  'Fixed',
  'Security'
])
const forbiddenStalePhrases = [
  '`prepublishOnly` now delegates to `pnpm check`',
  'The branch coverage threshold is now 65%',
  '92% statements, 80% branches, 90%'
]

expect(changelog.startsWith('# Changelog\n'), 'CHANGELOG.md must start with # Changelog')
expect(
  changelog.includes('https://keepachangelog.com/en/1.1.0/'),
  'CHANGELOG.md must reference Keep a Changelog'
)
expect(
  changelog.includes('https://semver.org/spec/v2.0.0.html'),
  'CHANGELOG.md must reference Semantic Versioning'
)
expect(changelog.includes('## [Unreleased]'), 'CHANGELOG.md must keep an Unreleased section')
const unreleasedSection = getSection(changelog, '## [Unreleased]')
expect(
  Boolean(unreleasedSection) && /^- /m.test(unreleasedSection),
  'CHANGELOG.md Unreleased section must include a placeholder or change bullet'
)

for (const phrase of forbiddenStalePhrases) {
  expect(
    !normalizedChangelog.includes(phrase),
    `CHANGELOG.md must not contain stale phrase: ${phrase}`
  )
}

const currentHeading = new RegExp(
  `^## \\[${escapeRegex(packageJson.version)}\\] - \\d{4}-\\d{2}-\\d{2}$`,
  'm'
)
expect(
  currentHeading.test(changelog),
  `CHANGELOG.md must include a dated section for package version ${packageJson.version}`
)

const currentSection = getSection(changelog, `## [${packageJson.version}]`)
expect(
  Boolean(currentSection),
  `CHANGELOG.md must contain a readable ${packageJson.version} section`
)

if (currentSection) {
  const changeTypeHeadings = [...currentSection.matchAll(/^### (.+)$/gm)].map((match) => match[1])
  expect(
    changeTypeHeadings.length > 0,
    `CHANGELOG.md ${packageJson.version} section must include at least one change type`
  )

  for (const heading of changeTypeHeadings) {
    expect(
      allowedChangeTypes.has(heading),
      `CHANGELOG.md contains unsupported change type: ${heading}`
    )
  }

  expect(
    /^- /m.test(currentSection),
    `CHANGELOG.md ${packageJson.version} section must include at least one bullet`
  )
  expect(
    currentSection.includes('`prepublishOnly` now delegates to `release:check`'),
    `CHANGELOG.md ${packageJson.version} section must document current prepublishOnly behavior`
  )
  expect(
    currentSection.includes('empty Unreleased sections'),
    `CHANGELOG.md ${packageJson.version} section must document the Unreleased placeholder guard`
  )
  expect(
    Boolean(coverageThresholdPhrase) &&
      normalizeWhitespace(currentSection).includes(coverageThresholdPhrase),
    `CHANGELOG.md ${packageJson.version} section must document current coverage thresholds: ${coverageThresholdPhrase || 'missing thresholds in vitest.config.ts'}`
  )
}

for (const [, heading] of changelog.matchAll(/^### (.+)$/gm)) {
  expect(
    allowedChangeTypes.has(heading),
    `CHANGELOG.md contains unsupported change type: ${heading}`
  )
}

if (failures.length) {
  console.error(`Changelog check failed:\n${failures.map((line) => `- ${line}`).join('\n')}`)
  process.exit(1)
}

console.log(`Changelog check passed for version ${packageJson.version}.`)

function getSection(content, heading) {
  const start = content.indexOf(heading)

  if (start === -1) {
    return ''
  }

  const next = content.indexOf('\n## ', start + heading.length)

  return next === -1 ? content.slice(start) : content.slice(start, next)
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readCoverageThresholds(config) {
  const match = config.match(
    /thresholds:\s*{\s*statements:\s*(\d+),\s*branches:\s*(\d+),\s*functions:\s*(\d+),\s*lines:\s*(\d+)/m
  )

  expect(Boolean(match), 'vitest.config.ts must define numeric coverage thresholds')

  if (!match) {
    return null
  }

  return {
    statements: Number(match[1]),
    branches: Number(match[2]),
    functions: Number(match[3]),
    lines: Number(match[4])
  }
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message)
  }
}
