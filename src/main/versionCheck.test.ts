import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock electron app
vi.mock('electron', () => ({
  app: {
    getVersion: vi.fn()
  }
}))

import { versionCheckService } from './versionCheck'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('VersionCheckService', () => {
  beforeEach(async () => {
    const { app } = await import('electron')
    vi.mocked(app.getVersion).mockReturnValue('1.0.0')
    versionCheckService.clearCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('checkForUpdates', () => {
    it('should return no update when current version is latest', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: 'v1.0.0',
            published_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/repo/releases/tag/v1.0.0',
            prerelease: false,
            draft: false,
            body: 'Release notes',
            assets: []
          })
      })

      const result = await versionCheckService.checkForUpdates()

      expect(result.hasUpdate).toBe(false)
      expect(result.currentVersion).toBe('1.0.0')
      expect(result.latestVersion).toBe('1.0.0')
    })

    it('should return update available when newer version exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: 'v2.0.0',
            published_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/repo/releases/tag/v2.0.0',
            prerelease: false,
            draft: false,
            body: 'Release notes for v2.0.0',
            assets: [
              {
                name: 'TimeCatcher-2.0.0-mac-arm64.dmg',
                browser_download_url:
                  'https://github.com/test/repo/releases/download/v2.0.0/TimeCatcher-2.0.0-mac-arm64.dmg'
              }
            ]
          })
      })

      const result = await versionCheckService.checkForUpdates()

      expect(result.hasUpdate).toBe(true)
      expect(result.currentVersion).toBe('1.0.0')
      expect(result.latestVersion).toBe('2.0.0')
      expect(result.releaseInfo).toBeDefined()
      expect(result.releaseInfo?.downloadUrl).toBe(
        'https://github.com/test/repo/releases/download/v2.0.0/TimeCatcher-2.0.0-mac-arm64.dmg'
      )
    })

    it('should skip prereleases', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: 'v2.0.0-beta.1',
            published_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/repo/releases/tag/v2.0.0-beta.1',
            prerelease: true,
            draft: false,
            body: 'Beta release',
            assets: []
          })
      })

      const result = await versionCheckService.checkForUpdates()

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toBe('Unable to fetch release information')
    })

    it('should skip draft releases', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: 'v2.0.0',
            published_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/repo/releases/tag/v2.0.0',
            prerelease: false,
            draft: true,
            body: 'Draft release',
            assets: []
          })
      })

      const result = await versionCheckService.checkForUpdates()

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toBe('Unable to fetch release information')
    })

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403
      })

      const result = await versionCheckService.checkForUpdates()

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toContain('GitHub API responded with status 403')
    })

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await versionCheckService.checkForUpdates()

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('should handle invalid response structure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            invalid: 'response'
          })
      })

      const result = await versionCheckService.checkForUpdates()

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toBe('Invalid release data structure')
    })

    it('should timeout after 10 seconds', async () => {
      vi.useFakeTimers()

      // Mock a fetch that throws AbortError when signal is aborted
      mockFetch.mockImplementationOnce((_url, options) => {
        return new Promise((_resolve, reject) => {
          // Listen for abort signal
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const error = new Error('The operation was aborted')
              error.name = 'AbortError'
              reject(error)
            })
          }

          // Simulate the timeout by advancing timers
          setTimeout(() => {
            if (options?.signal && !options.signal.aborted) {
              // This shouldn't happen in real scenario as AbortController should abort first
            }
          }, 11000) // Longer than the 10s timeout
        })
      })

      // Start the check
      const checkPromise = versionCheckService.checkForUpdates()

      // Advance time to trigger the timeout
      await vi.advanceTimersByTimeAsync(10100) // Just over 10 seconds

      const result = await checkPromise

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toBeDefined()

      vi.useRealTimers()
    })

    it('should cache results for 2 hours', async () => {
      const mockResponse = {
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: 'v1.5.0',
            published_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/repo/releases/tag/v1.5.0',
            prerelease: false,
            draft: false,
            body: 'Release notes',
            assets: []
          })
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      // First call
      await versionCheckService.checkForUpdates()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Second call should use cache
      await versionCheckService.checkForUpdates()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('version comparison', () => {
    it('should correctly compare semantic versions', async () => {
      const testCases = [
        { current: '1.0.0', latest: '1.0.1', expected: true },
        { current: '1.0.0', latest: '1.1.0', expected: true },
        { current: '1.0.0', latest: '2.0.0', expected: true },
        { current: '1.0.1', latest: '1.0.0', expected: false },
        { current: '1.1.0', latest: '1.0.0', expected: false },
        { current: '2.0.0', latest: '1.0.0', expected: false },
        { current: '1.0.0', latest: '1.0.0', expected: false }
      ]

      for (const testCase of testCases) {
        const { app } = await import('electron')
        vi.mocked(app.getVersion).mockReturnValue(testCase.current)
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tag_name: `v${testCase.latest}`,
              published_at: '2023-01-01T00:00:00Z',
              html_url: 'https://github.com/test/repo/releases/tag/v' + testCase.latest,
              prerelease: false,
              draft: false,
              body: 'Release notes',
              assets: []
            })
        })

        const result = await versionCheckService.checkForUpdates()
        expect(result.hasUpdate).toBe(testCase.expected)

        // Clear cache for next iteration
        versionCheckService.clearCache()
      }
    })

    it('should handle version tags with and without v prefix', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: 'v2.0.0', // With 'v' prefix
            published_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/repo/releases/tag/v2.0.0',
            prerelease: false,
            draft: false,
            body: 'Release notes',
            assets: []
          })
      })

      const result = await versionCheckService.checkForUpdates()

      expect(result.latestVersion).toBe('2.0.0') // Should strip the 'v' prefix
      expect(result.hasUpdate).toBe(true)
    })
  })

  describe('asset finding', () => {
    it('should find macOS ARM64 download URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: 'v2.0.0',
            published_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/repo/releases/tag/v2.0.0',
            prerelease: false,
            draft: false,
            body: 'Release notes',
            assets: [
              {
                name: 'TimeCatcher-2.0.0-win-x64.exe',
                browser_download_url:
                  'https://github.com/test/repo/releases/download/v2.0.0/TimeCatcher-2.0.0-win-x64.exe'
              },
              {
                name: 'TimeCatcher-2.0.0-mac-arm64.dmg',
                browser_download_url:
                  'https://github.com/test/repo/releases/download/v2.0.0/TimeCatcher-2.0.0-mac-arm64.dmg'
              },
              {
                name: 'TimeCatcher-2.0.0-linux-x64.AppImage',
                browser_download_url:
                  'https://github.com/test/repo/releases/download/v2.0.0/TimeCatcher-2.0.0-linux-x64.AppImage'
              }
            ]
          })
      })

      const result = await versionCheckService.checkForUpdates()

      expect(result.releaseInfo?.downloadUrl).toBe(
        'https://github.com/test/repo/releases/download/v2.0.0/TimeCatcher-2.0.0-mac-arm64.dmg'
      )
    })

    it('should handle missing macOS ARM64 asset', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            tag_name: 'v2.0.0',
            published_at: '2023-01-01T00:00:00Z',
            html_url: 'https://github.com/test/repo/releases/tag/v2.0.0',
            prerelease: false,
            draft: false,
            body: 'Release notes',
            assets: [
              {
                name: 'TimeCatcher-2.0.0-win-x64.exe',
                browser_download_url:
                  'https://github.com/test/repo/releases/download/v2.0.0/TimeCatcher-2.0.0-win-x64.exe'
              }
            ]
          })
      })

      const result = await versionCheckService.checkForUpdates()

      expect(result.releaseInfo?.downloadUrl).toBeUndefined()
      expect(result.releaseInfo?.htmlUrl).toBe('https://github.com/test/repo/releases/tag/v2.0.0')
    })
  })
})
