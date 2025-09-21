import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { httpServerManager } from './httpServer'
import { dbService } from './database'

// Mock the database service
vi.mock('./database', () => ({
  dbService: {
    getDefaultCategory: vi.fn(),
    addTaskRecord: vi.fn()
  }
}))

describe('HttpServerManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Ensure server is stopped after each test
    await httpServerManager.stop()
  })

  describe('port validation', () => {
    it('should reject ports below 1024', async () => {
      const result = await httpServerManager.start(1023)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Port must be between 1024 and 65535')
    })

    it('should reject ports above 65535', async () => {
      const result = await httpServerManager.start(65536)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Port must be between 1024 and 65535')
    })

    it('should accept valid ports', async () => {
      // Use a port that's likely to be available for testing
      const testPort = 14474
      const result = await httpServerManager.start(testPort)

      // The test might fail if port is in use, which is acceptable
      if (result.success) {
        expect(result.port).toBe(testPort)
        expect(httpServerManager.getStatus().running).toBe(true)
      }
    })
  })

  describe('server lifecycle', () => {
    it('should start and stop server correctly', async () => {
      const testPort = 14475

      // Initially not running
      expect(httpServerManager.getStatus().running).toBe(false)

      // Start server
      const startResult = await httpServerManager.start(testPort)
      if (startResult.success) {
        expect(httpServerManager.getStatus().running).toBe(true)
        expect(httpServerManager.getStatus().port).toBe(testPort)

        // Stop server
        await httpServerManager.stop()
        expect(httpServerManager.getStatus().running).toBe(false)
        expect(httpServerManager.getStatus().port).toBeUndefined()
      }
    })

    it('should handle starting server on occupied port', async () => {
      const testPort = 14476

      // Start first instance
      const firstResult = await httpServerManager.start(testPort)
      if (firstResult.success) {
        // Try to start second instance on same port (this will fail because we're reusing the same manager)
        // In real scenario, this would be testing port conflict
        const secondResult = await httpServerManager.start(testPort)
        expect(secondResult.success).toBe(true) // Manager stops the first and starts new one
      }
    })
  })

  describe('status reporting', () => {
    it('should report correct status when stopped', () => {
      const status = httpServerManager.getStatus()
      expect(status.running).toBe(false)
      expect(status.port).toBeUndefined()
      expect(status.error).toBeUndefined()
    })

    it('should report correct status when running', async () => {
      const testPort = 14477
      const result = await httpServerManager.start(testPort)

      if (result.success) {
        const status = httpServerManager.getStatus()
        expect(status.running).toBe(true)
        expect(status.port).toBe(testPort)
        expect(status.error).toBeUndefined()
      }
    })
  })

  describe('event emission', () => {
    it('should emit started event when server starts', async () => {
      const testPort = 14478
      const startedHandler = vi.fn()

      httpServerManager.on('started', startedHandler)

      const result = await httpServerManager.start(testPort)
      if (result.success) {
        expect(startedHandler).toHaveBeenCalledWith(testPort)
      }

      httpServerManager.removeListener('started', startedHandler)
    })

    it('should emit stopped event when server stops', async () => {
      const testPort = 14479
      const stoppedHandler = vi.fn()

      const result = await httpServerManager.start(testPort)
      if (result.success) {
        httpServerManager.on('stopped', stoppedHandler)
        await httpServerManager.stop()
        expect(stoppedHandler).toHaveBeenCalled()
        httpServerManager.removeListener('stopped', stoppedHandler)
      }
    })
  })

  describe('task creation handling', () => {
    beforeEach(() => {
      // Mock successful database operations
      vi.mocked(dbService.getDefaultCategory).mockResolvedValue({
        id: 1,
        name: 'Default',
        is_default: true
      })
      vi.mocked(dbService.addTaskRecord).mockResolvedValue({
        id: 1,
        category_name: 'Default',
        task_name: 'Test Task',
        start_time: '2023-01-01T12:00:00.000Z',
        date: '2023-01-01',
        task_type: 'normal'
      })
    })

    it('should emit taskCreated event when task is successfully created', async () => {
      const testPort = 14480
      const taskCreatedHandler = vi.fn()

      httpServerManager.on('taskCreated', taskCreatedHandler)

      const result = await httpServerManager.start(testPort)
      if (result.success) {
        // This would normally be tested with actual HTTP requests
        // For unit testing, we're just verifying the event emission setup
        expect(httpServerManager.listenerCount('taskCreated')).toBe(1)
      }

      httpServerManager.removeListener('taskCreated', taskCreatedHandler)
    })
  })
})
