import { EventEmitter } from 'node:events'
import { afterEach, expect, it, vi } from 'vitest'
import { fileURLToPath } from 'node:url'
import { localMapBuild } from './mapBuild'

const { spawn } = vi.hoisted(() => ({ spawn: vi.fn() }))
vi.mock('node:child_process', () => ({ spawn }))
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks() })

it('builds on startup, coalesces source edits, refreshes only after success, and closes cleanly', async () => {
  vi.useFakeTimers()
  const jobs: EventEmitter[] = []
  spawn.mockImplementation(() => {
    const job = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() })
    jobs.push(job)
    return job
  })
  const server = {
    watcher: Object.assign(new EventEmitter(), { add: vi.fn() }),
    httpServer: new EventEmitter(), ws: { send: vi.fn() },
    config: { logger: { info: vi.fn(), error: vi.fn() } },
  }
  const plugin = localMapBuild()
  ;(plugin.configureServer as Function)(server)
  await vi.advanceTimersByTimeAsync(400)
  expect(spawn).toHaveBeenCalledTimes(1)
  expect(spawn.mock.calls[0][1]).toEqual(['-u', 'make_all_tiles.py', '--dev'])
  const source = fileURLToPath(new URL('../../maps-sources/kovyalo/ziemund/background.png', import.meta.url))
  server.watcher.emit('all', 'change', source)
  server.watcher.emit('all', 'change', source)
  await vi.advanceTimersByTimeAsync(400)
  expect(spawn).toHaveBeenCalledTimes(1)
  jobs[0].emit('close', 0)
  expect(server.ws.send).toHaveBeenCalledWith({ type: 'full-reload', path: '*' })
  expect(spawn).toHaveBeenCalledTimes(2)
  jobs[1].emit('close', 1)
  expect(server.ws.send).toHaveBeenCalledTimes(1)
  expect(server.config.logger.error).toHaveBeenCalledOnce()
  server.watcher.emit('all', 'change', source)
  server.httpServer.emit('close')
  await vi.advanceTimersByTimeAsync(500)
  expect(spawn).toHaveBeenCalledTimes(2)
})
