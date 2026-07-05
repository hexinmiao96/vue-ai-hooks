import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const releaseTimeZone = 'Asia/Shanghai'
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const packageName = packageJson.name
const packageVersion = process.env.RELEASE_STATUS_PACKAGE_VERSION ?? packageJson.version
const now = process.env.RELEASE_STATUS_NOW ? new Date(process.env.RELEASE_STATUS_NOW) : new Date()
const today = formatDay(now)
const registry = readRegistryInfo(packageName)
const publishedTimes = registry.time && typeof registry.time === 'object' ? registry.time : {}
const latestVersion = registry['dist-tags.latest'] ?? registry.distTags?.latest ?? 'unknown'
const currentPublishedAt = parseDate(publishedTimes[packageVersion])
const publishedToday = Object.entries(publishedTimes)
  .map(([version, publishedAt]) => [version, parseDate(publishedAt)])
  .filter(
    ([version, publishedAt]) =>
      isVersionKey(version) && publishedAt && formatDay(publishedAt) === today
  )
  .sort(([, left], [, right]) => left.getTime() - right.getTime())

const lines = [
  `Current package: ${packageName}@${packageVersion}`,
  `Registry latest: ${latestVersion}`,
  `Today: ${today} (${releaseTimeZone})`
]

if (currentPublishedAt) {
  lines.push(
    `Registry status: current package version is already published at ${currentPublishedAt.toISOString()}.`,
    'Release window: local readiness checks may run, but publishing this version again is blocked.',
    'Next action: keep main as a release candidate; bump version on a future release day before publishing.'
  )
} else if (publishedToday.length > 0) {
  const versions = publishedToday.map(([version, publishedAt]) => {
    return `${version} at ${publishedAt.toISOString()}`
  })
  if (canPromotePrereleaseToStable(packageVersion, publishedToday)) {
    lines.push(
      `Registry status: ${packageName}@${packageVersion} is not published yet.`,
      `Release window: eligible; promoting same-day prerelease to stable ${packageVersion}.`,
      `Published prereleases today: ${versions.join(', ')}.`,
      'Next action: run pnpm release:check, tag the stable version, push the tag, and confirm the publish workflow.'
    )
  } else {
    lines.push(
      `Registry status: ${packageName}@${packageVersion} is not published yet.`,
      `Release window: blocked; ${packageName} already published on ${today}.`,
      `Published versions today: ${versions.join(', ')}.`,
      `Next action: wait for the next ${releaseTimeZone} calendar day before publishing.`
    )
  }
} else {
  lines.push(
    `Registry status: ${packageName}@${packageVersion} is not published yet.`,
    `Release window: eligible; no ${packageName} version has been published on ${today}.`,
    'Next action: run pnpm release:check, tag the version, push the tag, and confirm the publish workflow.'
  )
}

console.log(lines.join('\n'))

function readRegistryInfo(name) {
  if (process.env.RELEASE_STATUS_REGISTRY_JSON) {
    return JSON.parse(process.env.RELEASE_STATUS_REGISTRY_JSON)
  }

  try {
    const output = execFileSync('npm', ['view', name, 'time', 'dist-tags.latest', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    })
    return JSON.parse(output)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('E404')) {
      return {}
    }
    throw err
  }
}

function formatDay(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: releaseTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function parseDate(value) {
  if (typeof value !== 'string') return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date : null
}

function isVersionKey(value) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)
}

function canPromotePrereleaseToStable(version, publishedEntries) {
  return (
    isStableVersion(version) &&
    publishedEntries.length > 0 &&
    publishedEntries.every(([publishedVersion]) => isPrereleaseOf(publishedVersion, version))
  )
}

function isStableVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version)
}

function isPrereleaseOf(version, stableVersion) {
  return version.startsWith(`${stableVersion}-`) && isVersionKey(version)
}
