import { describe, it, expect } from 'vitest'

// Import JS module functions
const bump = require('./bump-version.js')

describe('getBumpTypeFromPRTitle', () => {
  const { getBumpTypeFromPRTitle } = bump

  it('defaults to patch when title is empty', () => {
    expect(getBumpTypeFromPRTitle('')).toBe('patch')
    expect(getBumpTypeFromPRTitle(undefined as any)).toBe('patch')
  })

  it('detects MAJOR via [MAJOR] and major:', () => {
    expect(getBumpTypeFromPRTitle('feat: [MAJOR] switch engine')).toBe('major')
    expect(getBumpTypeFromPRTitle('major: overhaul api')).toBe('major')
  })

  it('detects MAJOR via Conventional Commits bang', () => {
    expect(getBumpTypeFromPRTitle('feat!: drop deprecated api')).toBe('major')
    expect(getBumpTypeFromPRTitle('refactor(core)!: remove legacy code')).toBe('major')
  })

  it('detects MAJOR via breaking change phrases and aliases', () => {
    expect(getBumpTypeFromPRTitle('breaking change: remove config')).toBe('major')
    expect(getBumpTypeFromPRTitle('docs: mention BREAKING CHANGE in title')).toBe('major')
    expect(getBumpTypeFromPRTitle('semver-major: adjust public api')).toBe('major')
    expect(getBumpTypeFromPRTitle('chore: semver: major release')).toBe('major')
    expect(getBumpTypeFromPRTitle('feat: [breaking] change behavior')).toBe('major')
  })

  it('detects MINOR via [MINOR] and minor:', () => {
    expect(getBumpTypeFromPRTitle('feat: [MINOR] add csv export')).toBe('minor')
    expect(getBumpTypeFromPRTitle('minor: add onboarding flow')).toBe('minor')
  })

  it('treats feat: as MINOR (policy)', () => {
    expect(getBumpTypeFromPRTitle('feat: add new theme')).toBe('minor')
    expect(getBumpTypeFromPRTitle('FEAT(UI): introduce new palette')).toBe('minor')
  })

  it('ensures precedence: type! overrides feat minor', () => {
    expect(getBumpTypeFromPRTitle('feat!: breaking API change')).toBe('major')
    expect(getBumpTypeFromPRTitle('feat(ui)!: change public props')).toBe('major')
  })

  it('falls back to patch for other types', () => {
    expect(getBumpTypeFromPRTitle('fix: correct timezone handling')).toBe('patch')
    expect(getBumpTypeFromPRTitle('chore: deps')).toBe('patch')
    expect(getBumpTypeFromPRTitle('refactor: internal code cleanup')).toBe('patch')
  })
})
