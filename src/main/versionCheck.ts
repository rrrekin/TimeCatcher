import { app } from 'electron'

export interface ReleaseInfo {
  version: string
  publishedAt: string
  htmlUrl: string
  downloadUrl?: string
  body?: string
}

export interface UpdateCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion?: string
  releaseInfo?: ReleaseInfo
  error?: string
}

class VersionCheckService {
  private readonly GITHUB_API_URL = 'https://api.github.com/repos/rrrekin/TimeCatcher/releases/latest'
  private readonly CACHE_DURATION = 2 * 60 * 60 * 1000 // 2 hours in milliseconds
  private cache: { data: ReleaseInfo; timestamp: number } | null = null

  /**
   * Check for updates by comparing current version with latest GitHub release
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    const currentVersion = app.getVersion()

    try {
      const latestRelease = await this.getLatestRelease()

      if (!latestRelease) {
        return {
          hasUpdate: false,
          currentVersion,
          error: 'Unable to fetch release information'
        }
      }

      const hasUpdate = this.isNewerVersion(latestRelease.version, currentVersion)

      return {
        hasUpdate,
        currentVersion,
        latestVersion: latestRelease.version,
        releaseInfo: hasUpdate ? latestRelease : undefined
      }
    } catch (error) {
      console.warn('Failed to check for updates:', error)
      return {
        hasUpdate: false,
        currentVersion,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get latest release information from GitHub API with caching
   */
  private async getLatestRelease(): Promise<ReleaseInfo | null> {
    // Check cache first
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_DURATION) {
      return this.cache.data
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

      const response = await fetch(this.GITHUB_API_URL, {
        signal: controller.signal,
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': `TimeCatcher/${app.getVersion()}`
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`GitHub API responded with status ${response.status}`)
      }

      const data = (await response.json()) as any

      // Validate response structure
      if (!data.tag_name || !data.published_at || !data.html_url) {
        throw new Error('Invalid release data structure')
      }

      // Skip prereleases and drafts
      if (data.prerelease || data.draft) {
        console.log('Skipping prerelease or draft:', data.tag_name)
        return null
      }

      // Extract version from tag (remove 'v' prefix if present)
      const version = data.tag_name.replace(/^v/, '')

      // Find macOS ARM64 download URL if available
      const downloadUrl = this.findMacARM64DownloadUrl(data.assets)

      const releaseInfo: ReleaseInfo = {
        version,
        publishedAt: data.published_at,
        htmlUrl: data.html_url,
        downloadUrl,
        body: data.body
      }

      // Update cache
      this.cache = {
        data: releaseInfo,
        timestamp: Date.now()
      }

      return releaseInfo
    } catch (error) {
      // Don't throw here, let the caller handle it gracefully
      console.warn('Error fetching latest release:', error)
      throw error
    }
  }

  /**
   * Find macOS ARM64 download URL from release assets
   */
  private findMacARM64DownloadUrl(assets: any[]): string | undefined {
    if (!Array.isArray(assets)) {
      return undefined
    }

    const macAsset = assets.find(
      asset => asset.name && asset.name.includes('mac') && asset.name.includes('arm64') && asset.name.endsWith('.dmg')
    )

    return macAsset?.browser_download_url
  }

  /**
   * Compare two semantic versions to determine if the first is newer
   * Returns true if latestVersion > currentVersion
   */
  private isNewerVersion(latestVersion: string, currentVersion: string): boolean {
    try {
      const parseVersion = (version: string): number[] => {
        return version.split('.').map(part => {
          const num = parseInt(part.replace(/[^0-9]/g, ''), 10)
          return isNaN(num) ? 0 : num
        })
      }

      const latest = parseVersion(latestVersion)
      const current = parseVersion(currentVersion)

      // Ensure both arrays have same length (pad with zeros)
      const maxLength = Math.max(latest.length, current.length)
      while (latest.length < maxLength) latest.push(0)
      while (current.length < maxLength) current.push(0)

      // Compare version parts
      for (let i = 0; i < maxLength; i++) {
        if (latest[i] > current[i]) return true
        if (latest[i] < current[i]) return false
      }

      return false // Versions are equal
    } catch (error) {
      console.warn('Error comparing versions:', error)
      return false
    }
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cache = null
  }
}

export const versionCheckService = new VersionCheckService()
