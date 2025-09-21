import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServer } from 'net'
import { httpServerManager } from './httpServer'
import { dbService } from './database'

// Mock the database service
vi.mock('./database', () => ({
  dbService: {
    getDefaultCategory: vi.fn(),
    addTaskRecord: vi.fn()
  }
}))

/**
 * Helper function to find an available ephemeral port
 */
async function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()

    server.listen(0, () => {
      const address = server.address()
      if (address && typeof address !== 'string') {
        const port = address.port
        server.close(() => {
          resolve(port)
        })
      } else {
        server.close()
        reject(new Error('Failed to get port from server address'))
      }
    })

    server.on('error', err => {
      reject(err)
    })
  })
}

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
      // Probe for an actually free ephemeral port
      const testPort = await getAvailablePort()
      const result = await httpServerManager.start(testPort)

      expect(result.success).toBe(true)
      expect(result.port).toBe(testPort)
      expect(httpServerManager.getStatus().running).toBe(true)
    })
  })

  describe('server lifecycle', () => {
    it('should start and stop server correctly', async () => {
      const testPort = await getAvailablePort()

      // Initially not running
      expect(httpServerManager.getStatus().running).toBe(false)

      // Start server
      const startResult = await httpServerManager.start(testPort)
      expect(startResult.success).toBe(true)
      expect(httpServerManager.getStatus().running).toBe(true)
      expect(httpServerManager.getStatus().port).toBe(testPort)

      // Stop server
      await httpServerManager.stop()
      expect(httpServerManager.getStatus().running).toBe(false)
      expect(httpServerManager.getStatus().port).toBeUndefined()
    })

    it('should handle starting server on occupied port', async () => {
      const testPort = await getAvailablePort()
      let occupyingServer: any = null

      try {
        // Create a separate server to occupy the port
        occupyingServer = createServer()
        await new Promise<void>((resolve, reject) => {
          occupyingServer.listen(testPort, '127.0.0.1', () => {
            resolve()
          })
          occupyingServer.on('error', reject)
        })

        // Set up error handler to catch the emitted error event and prevent unhandled error
        const errorHandler = vi.fn()
        httpServerManager.on('error', errorHandler)

        // Now try to start httpServerManager on the same occupied port
        const result = await httpServerManager.start(testPort)
        expect(result.success).toBe(false)
        expect(result.error).toMatch(/Failed to start server.*EADDRINUSE/)

        // Verify error handler was called
        expect(errorHandler).toHaveBeenCalled()

        // Clean up error listener
        httpServerManager.removeListener('error', errorHandler)
      } finally {
        // Clean up the occupying server
        if (occupyingServer) {
          await new Promise<void>(resolve => {
            occupyingServer.close(() => resolve())
          })
        }
      }
    }, 10000) // Increase timeout to 10 seconds
  })

  describe('status reporting', () => {
    it('should report correct status when stopped', () => {
      const status = httpServerManager.getStatus()
      expect(status.running).toBe(false)
      expect(status.port).toBeUndefined()
      expect(status.error).toBeUndefined()
    })

    it('should report correct status when running', async () => {
      const testPort = await getAvailablePort()
      const result = await httpServerManager.start(testPort)

      expect(result.success).toBe(true)
      const status = httpServerManager.getStatus()
      expect(status.running).toBe(true)
      expect(status.port).toBe(testPort)
      expect(status.error).toBeUndefined()
    })
  })

  describe('event emission', () => {
    it('should emit started event when server starts', async () => {
      const testPort = await getAvailablePort()
      const startedHandler = vi.fn()

      httpServerManager.on('started', startedHandler)

      const result = await httpServerManager.start(testPort)
      expect(result.success).toBe(true)
      expect(startedHandler).toHaveBeenCalledWith(testPort)

      httpServerManager.removeListener('started', startedHandler)
    })

    it('should emit stopped event when server stops', async () => {
      const testPort = await getAvailablePort()
      const stoppedHandler = vi.fn()

      const result = await httpServerManager.start(testPort)
      expect(result.success).toBe(true)

      httpServerManager.on('stopped', stoppedHandler)
      await httpServerManager.stop()
      expect(stoppedHandler).toHaveBeenCalled()
      httpServerManager.removeListener('stopped', stoppedHandler)
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

    it('should create task via HTTP request and emit taskCreated event', async () => {
      const testPort = await getAvailablePort()
      const taskCreatedHandler = vi.fn()

      httpServerManager.on('taskCreated', taskCreatedHandler)

      const result = await httpServerManager.start(testPort)
      expect(result.success).toBe(true)

      // Make actual HTTP request to create a task
      const response = await fetch(`http://127.0.0.1:${testPort}/create-task?task=Integration%20Test&category=Default`)

      // Verify HTTP response
      expect(response.status).toBe(204)
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')

      // Verify database service was called
      expect(vi.mocked(dbService.addTaskRecord)).toHaveBeenCalledTimes(1)
      const dbCall = vi.mocked(dbService.addTaskRecord).mock.calls[0][0]
      expect(dbCall.task_name).toBe('Integration Test')
      expect(dbCall.category_name).toBe('Default')
      expect(dbCall.task_type).toBe('normal')
      expect(dbCall.date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
      expect(dbCall.start_time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) // ISO timestamp

      // Verify taskCreated event was emitted
      expect(taskCreatedHandler).toHaveBeenCalledTimes(1)
      const eventData = taskCreatedHandler.mock.calls[0][0]
      expect(eventData.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(eventData.taskRecord).toBeDefined()

      httpServerManager.removeListener('taskCreated', taskCreatedHandler)
    })

    it('should handle missing task parameter', async () => {
      const testPort = await getAvailablePort()

      const result = await httpServerManager.start(testPort)
      expect(result.success).toBe(true)

      // Make request without task parameter
      const response = await fetch(`http://127.0.0.1:${testPort}/create-task`)

      expect(response.status).toBe(400)
      expect(await response.text()).toBe('Missing required parameter: task')
      expect(vi.mocked(dbService.addTaskRecord)).not.toHaveBeenCalled()
    })

    it('should use default category when category parameter is missing', async () => {
      const testPort = await getAvailablePort()
      const taskCreatedHandler = vi.fn()

      httpServerManager.on('taskCreated', taskCreatedHandler)

      const result = await httpServerManager.start(testPort)
      expect(result.success).toBe(true)

      // Make request without category parameter
      const response = await fetch(`http://127.0.0.1:${testPort}/create-task?task=No%20Category%20Test`)

      expect(response.status).toBe(204)
      expect(vi.mocked(dbService.getDefaultCategory)).toHaveBeenCalledTimes(1)
      expect(vi.mocked(dbService.addTaskRecord)).toHaveBeenCalledTimes(1)

      const dbCall = vi.mocked(dbService.addTaskRecord).mock.calls[0][0]
      expect(dbCall.task_name).toBe('No Category Test')
      expect(dbCall.category_name).toBe('Default')

      httpServerManager.removeListener('taskCreated', taskCreatedHandler)
    })

    it('should handle database errors gracefully', async () => {
      const testPort = await getAvailablePort()

      // Mock database error
      vi.mocked(dbService.addTaskRecord).mockRejectedValueOnce(new Error('Database error'))

      const result = await httpServerManager.start(testPort)
      expect(result.success).toBe(true)

      const response = await fetch(`http://127.0.0.1:${testPort}/create-task?task=Error%20Test`)

      expect(response.status).toBe(500)
      expect(await response.text()).toBe('Internal server error')
    })

    it('should handle root endpoint', async () => {
      const testPort = await getAvailablePort()

      const result = await httpServerManager.start(testPort)
      expect(result.success).toBe(true)

      const response = await fetch(`http://127.0.0.1:${testPort}/`)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/plain')
      expect(await response.text()).toBe('TimeCatcher HTTP Server is running')
    })

    it('should handle unknown endpoints', async () => {
      const testPort = await getAvailablePort()

      const result = await httpServerManager.start(testPort)
      expect(result.success).toBe(true)

      const response = await fetch(`http://127.0.0.1:${testPort}/unknown`)

      expect(response.status).toBe(404)
      expect(await response.text()).toBe('Not found')
    })

    it('should reject non-GET methods', async () => {
      const testPort = await getAvailablePort()

      const result = await httpServerManager.start(testPort)
      expect(result.success).toBe(true)

      const response = await fetch(`http://127.0.0.1:${testPort}/create-task?task=Test`, {
        method: 'POST'
      })

      expect(response.status).toBe(405)
      expect(await response.text()).toBe('Method not allowed')
    })
  })
})
