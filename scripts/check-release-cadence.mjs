import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const releaseTimeZone = 'Asia/Shanghai'
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const packageName = packageJson.name
const packageVersion = process.env.RELEASE_CADENCE_PACKAGE_VERSION ?? packageJson.version
const requireUnpublished = process.env.RELEASE_CADENCE_REQUIRE_UNPUBLISHED === 'true'
const now = process.env.RELEASE_CADENCE_NOW ? new Date(process.env.RELEASE_CADENCE_NOW) : new Date()
const today = formatDay(now)
const registry = readRegistryInfo(packageName)
const publishedTimes = registry.time && typeof registry.time === 'object' ? registry.time : {}
const currentPublishedAt = parseDate(publishedTimes[packageVersion])

if (currentPublishedAt) {
  if (requireUnpublished) {
    console.error(
      [
        `Release cadence check failed: ${packageName}@${packageVersion} is already published.`,
        `Published at: ${currentPublishedAt.toISOString()}.`,
        `Bump package.json before publishing a new npm version.`
      ].join('\n')
    )
    process.exit(1)
  }
  console.log(
    `Release cadence check passed: ${packageName}@${packageVersion} is already published.`
  )
  process.exit(0)
}

const publishedToday = Object.entries(publishedTimes)
  .map(([version, publishedAt]) => [version, parseDate(publishedAt)])
  .filter(
    ([version, publishedAt]) =>
      isVersionKey(version) && publishedAt && formatDay(publishedAt) === today
  )
  .sort(([, left], [, right]) => left.getTime() - right.getTime())

if (publishedToday.length > 0) {
  if (canPromotePrereleaseToStable(packageVersion, publishedToday)) {
    const prereleases = publishedToday.map(([version]) => version).join(', ')
    console.log(
      `Release cadence check passed: promoting same-day prerelease ${prereleases} to stable ${packageVersion}.`
    )
    process.exit(0)
  }

  const versions = publishedToday.map(([version, publishedAt]) => {
    const time = publishedAt.toISOString()
    return `${version} at ${time}`
  })
  console.error(
    [
      `Release cadence check failed: ${packageName} already published on ${today} (${releaseTimeZone}).`,
      `Published versions today: ${versions.join(', ')}.`,
      `Do not publish ${packageVersion} until the next ${releaseTimeZone} calendar day.`
    ].join('\n')
  )
  process.exit(1)
}

console.log(
  `Release cadence check passed: no ${packageName} version was published on ${today} (${releaseTimeZone}).`
)

function readRegistryInfo(name) {
  if (process.env.RELEASE_CADENCE_REGISTRY_JSON) {
    return JSON.parse(process.env.RELEASE_CADENCE_REGISTRY_JSON)
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
