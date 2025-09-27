#!/usr/bin/env node

const { execSync } = require('child_process')
const path = require('path')

/**
 * Remove quarantine attributes from macOS app bundle after building
 * This script is called by electron-builder's afterPack hook
 */
async function removeQuarantine(context) {
  if (context.electronPlatformName !== 'darwin') {
    console.log('Skipping quarantine removal (not macOS)')
    return
  }

  const appPath = context.appOutDir
  console.log(`Removing quarantine attributes from: ${appPath}`)

  try {
    // Remove quarantine attributes recursively from the app bundle
    execSync(`xattr -cr "${appPath}"`, { stdio: 'inherit' })
    console.log('✅ Successfully removed quarantine attributes')
  } catch (error) {
    console.warn('⚠️  Warning: Could not remove quarantine attributes:', error.message)
    console.warn('This may cause Gatekeeper warnings for users')
  }
}

module.exports = removeQuarantine
