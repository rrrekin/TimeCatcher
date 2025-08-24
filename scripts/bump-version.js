#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const os = require('os')
const { execSync } = require('child_process')

// Configuration
const PACKAGE_JSON_PATH = path.join(__dirname, '../package.json')

/**
 * Executes a git command and returns the output
 * @param {string} command - Git command to execute
 * @returns {string} Command output
 */
function execGit(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf-8', stdio: 'pipe' }).trim()
  } catch (error) {
    throw new Error(`Git command failed: ${command}\n${error.message}`)
  }
}

/**
 * Reads and parses package.json
 * @returns {object} Parsed package.json content
 */
function readPackageJson() {
  try {
    const content = fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8')
    return JSON.parse(content)
  } catch (error) {
    throw new Error(`Failed to read package.json: ${error.message}`)
  }
}

/**
 * Writes updated package.json
 * @param {object} packageData - Updated package.json content
 */
function writePackageJson(packageData) {
  try {
    const content = JSON.stringify(packageData, null, 2) + '\n'
    fs.writeFileSync(PACKAGE_JSON_PATH, content)
  } catch (error) {
    throw new Error(`Failed to write package.json: ${error.message}`)
  }
}

/**
 * Parses semantic version string
 * @param {string} version - Version string (e.g., "1.2.3")
 * @returns {object} Version components {major, minor, patch}
 */
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) {
    throw new Error(`Invalid version format: ${version}`)
  }
  return {
    major: parseInt(match[1]),
    minor: parseInt(match[2]),
    patch: parseInt(match[3])
  }
}

/**
 * Formats version components into string
 * @param {object} version - Version components {major, minor, patch}
 * @returns {string} Formatted version string
 */
function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`
}

/**
 * Gets the major.minor tag name from version
 * @param {object} version - Version components {major, minor, patch}
 * @returns {string} Tag name (e.g., "0.20")
 */
function getMajorMinorTag(version) {
  return `${version.major}.${version.minor}`
}

/**
 * Creates a git commit with a message using a temporary file to avoid shell injection
 * @param {string} message - Commit message
 */
function commitWithMessage(message) {
  let tmpFile = null
  try {
    // Create temporary file in system temp directory
    tmpFile = path.join(os.tmpdir(), `commit-msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`)

    // Write message to temporary file
    fs.writeFileSync(tmpFile, message + '\n', 'utf-8')

    // Commit using the file
    execGit(`commit -F "${tmpFile}"`)
  } finally {
    // Always clean up the temporary file
    if (tmpFile && fs.existsSync(tmpFile)) {
      try {
        fs.unlinkSync(tmpFile)
      } catch (cleanupError) {
        console.warn(`Warning: Failed to clean up temporary file ${tmpFile}: ${cleanupError.message}`)
      }
    }
  }
}

/**
 * Bumps version in package.json and creates commit
 * @param {string} bumpType - 'major', 'minor', or 'patch'
 * @param {string} [commitMessage] - Optional commit message
 */
function bumpVersion(bumpType, commitMessage) {
  console.log(`🚀 Bumping ${bumpType} version...`)

  // Read current version
  const packageData = readPackageJson()
  const currentVersion = parseVersion(packageData.version)

  console.log(`📋 Current version: ${formatVersion(currentVersion)}`)

  // Calculate new version
  let newVersion
  switch (bumpType) {
    case 'major':
      newVersion = { major: currentVersion.major + 1, minor: 0, patch: 0 }
      break
    case 'minor':
      newVersion = { major: currentVersion.major, minor: currentVersion.minor + 1, patch: 0 }
      break
    case 'patch':
      newVersion = { major: currentVersion.major, minor: currentVersion.minor, patch: currentVersion.patch + 1 }
      break
    default:
      throw new Error(`Invalid bump type: ${bumpType}. Use 'major', 'minor', or 'patch'.`)
  }

  const newVersionString = formatVersion(newVersion)

  console.log(`📈 New version: ${newVersionString}`)

  // Update package.json
  packageData.version = newVersionString
  writePackageJson(packageData)
  console.log(`✅ Updated package.json to ${newVersionString}`)

  // Stage package.json for commit
  execGit('add package.json')

  // Create commit
  const defaultMessage = `chore: bump version to ${newVersionString}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>`

  const finalMessage = commitMessage || defaultMessage
  commitWithMessage(finalMessage)
  console.log(`✅ Created commit with version bump`)

  console.log(
    `🎉 Version bump complete: ${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch} → ${newVersionString}`
  )
  console.log(`📝 Note: Git tags will be created manually during release process`)
}

/**
 * Determines version bump type from PR title
 * @param {string} prTitle - Pull request title
 * @returns {string} Bump type: 'major', 'minor', or 'patch'
 */
function getBumpTypeFromPRTitle(prTitle) {
  if (!prTitle) return 'patch'

  const title = prTitle.toLowerCase()

  if (title.includes('[major]') || title.includes('major:')) {
    return 'major'
  }

  if (title.includes('[minor]') || title.includes('minor:')) {
    return 'minor'
  }

  return 'patch'
}

/**
 * Main function - handles command line arguments
 */
function main() {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.log(`
Usage: node bump-version.js <bump-type> [commit-message]
       node bump-version.js --pr-title "<title>"

Bump types:
  major  - Increment major version (1.0.0 → 2.0.0), creates new major.minor tag
  minor  - Increment minor version (1.2.0 → 1.3.0), creates new major.minor tag
  patch  - Increment patch version (1.2.3 → 1.2.4), moves existing major.minor tag

PR title mode:
  --pr-title - Determines bump type from PR title ([MAJOR], [MINOR], or default patch)

Examples:
  node bump-version.js patch
  node bump-version.js minor "feat: add new feature"
  node bump-version.js --pr-title "feat: [MINOR] add user authentication"
`)
    process.exit(1)
  }

  try {
    if (args[0] === '--pr-title') {
      if (args.length < 2) {
        throw new Error('PR title is required when using --pr-title flag')
      }
      const prTitle = args[1]
      const bumpType = getBumpTypeFromPRTitle(prTitle)
      console.log(`📝 PR Title: "${prTitle}"`)
      console.log(`🎯 Detected bump type: ${bumpType}`)
      bumpVersion(bumpType, args[2])
    } else {
      const bumpType = args[0]
      const commitMessage = args[1]
      bumpVersion(bumpType, commitMessage)
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    process.exit(1)
  }
}

// Export functions for testing
module.exports = {
  parseVersion,
  formatVersion,
  getMajorMinorTag,
  getBumpTypeFromPRTitle,
  bumpVersion
}

// Run if called directly
if (require.main === module) {
  main()
}
