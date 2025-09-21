import { createServer, IncomingMessage, ServerResponse, Server } from 'http'
import { URL } from 'url'
import { EventEmitter } from 'events'
import { dbService } from './database'
import type { TaskRecordInsert, HttpServerStatus, HttpServerStartResult } from '../shared/types'

export class HttpServerManager extends EventEmitter {
  private server: Server | null = null
  private port: number | null = null
  private error: string | null = null

  /**
   * Start the HTTP server on the specified port
   */
  async start(port: number): Promise<HttpServerStartResult> {
    // Stop existing server if running
    if (this.server) {
      await this.stop()
    }

    // Validate port range (unprivileged ports)
    if (!this.isValidPort(port)) {
      const error = 'Port must be between 1024 and 65535'
      this.error = error
      return { success: false, error }
    }

    return new Promise(resolve => {
      this.server = createServer((req, res) => this.handleRequest(req, res))

      // Handle server errors
      this.server.on('error', (err: any) => {
        const error = `Failed to start server: ${err.message}`
        this.error = error
        this.emit('error', error)
        resolve({ success: false, error })
      })

      // Start listening on localhost only
      this.server.listen(port, '127.0.0.1', () => {
        this.port = port
        this.error = null
        this.emit('started', port)
        resolve({ success: true, port })
      })
    })
  }

  /**
   * Stop the HTTP server
   */
  async stop(): Promise<void> {
    if (!this.server) {
      return
    }

    return new Promise(resolve => {
      this.server!.close(() => {
        this.server = null
        this.port = null
        this.error = null
        this.emit('stopped')
        resolve()
      })
    })
  }

  /**
   * Get current server status
   */
  getStatus(): HttpServerStatus {
    return {
      running: this.server !== null && this.port !== null,
      port: this.port || undefined,
      error: this.error || undefined
    }
  }

  /**
   * Validate port number
   */
  private isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1024 && port <= 65535
  }

  /**
   * Handle incoming HTTP requests
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Set CORS headers for localhost requests
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    // Only handle GET requests
    if (req.method !== 'GET') {
      this.sendError(res, 405, 'Method not allowed')
      return
    }

    // Parse URL and query parameters
    const url = new URL(req.url || '', `http://127.0.0.1:${this.port}`)

    // Handle /create-task endpoint
    if (url.pathname === '/create-task') {
      await this.handleCreateTask(url.searchParams, res)
      return
    }

    // Handle root path with simple response
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end('TimeCatcher HTTP Server is running')
      return
    }

    // Unknown endpoint
    this.sendError(res, 404, 'Not found')
  }

  /**
   * Handle create task endpoint
   */
  private async handleCreateTask(params: URLSearchParams, res: ServerResponse): Promise<void> {
    try {
      // Get required task parameter
      const taskName = params.get('task')
      if (!taskName || taskName.trim() === '') {
        this.sendError(res, 400, 'Missing required parameter: task')
        return
      }

      // Get optional category parameter or use default
      let categoryName = params.get('category')
      if (!categoryName || categoryName.trim() === '') {
        const defaultCategory = await dbService.getDefaultCategory()
        if (!defaultCategory) {
          this.sendError(res, 400, 'No category specified and no default category set')
          return
        }
        categoryName = defaultCategory.name
      }

      // Create current timestamp and date
      const now = new Date()
      const startTime = now.toISOString()
      const date = now.toISOString().split('T')[0] // YYYY-MM-DD format

      // Create task record
      const taskRecord: TaskRecordInsert = {
        category_name: categoryName.trim(),
        task_name: taskName.trim(),
        start_time: startTime,
        date,
        task_type: 'normal'
      }

      // Add to database
      await dbService.addTaskRecord(taskRecord)

      // Emit event for UI refresh
      this.emit('taskCreated', { date, taskRecord })

      // Send success response (204 No Content)
      res.writeHead(204)
      res.end()
    } catch (error) {
      console.error('Error creating task via HTTP:', error)
      this.sendError(res, 500, 'Internal server error')
    }
  }

  /**
   * Send error response
   */
  private sendError(res: ServerResponse, statusCode: number, message: string): void {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain' })
    res.end(message)
  }
}

// Export singleton instance
export const httpServerManager = new HttpServerManager()
