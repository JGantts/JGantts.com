import { spawn, type ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { relative, sep } from 'node:path'
import type { Plugin } from 'vite'

// Reuse the production incremental builder, targeting the local public folder.
export function localMapBuild(): Plugin {
  const sources = fileURLToPath(new URL('../../maps-sources/', import.meta.url))
  const python = fileURLToPath(new URL('../../python/', import.meta.url))
  return {
    name: 'local-map-build',
    apply: 'serve',
    configureServer(server) {
      let child: ChildProcess | undefined
      let timer: ReturnType<typeof setTimeout> | undefined
      let pending = false
      let closed = false
      const inside = (root: string, file: string) => {
        const path = relative(root, file)
        return path !== '..' && !path.startsWith(`..${sep}`) && !path.startsWith(sep)
      }
      const build = () => {
        if (closed || child || !pending) return
        pending = false
        server.config.logger.info('[maps] Building local map assets…')
        let errors = ''
        const job = spawn(process.env.PYTHON ?? 'python3', ['-u', 'make_all_tiles.py', '--dev'], {
          cwd: python,
          detached: process.platform !== 'win32',
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        child = job
        job.stdout?.on('data', data => server.config.logger.info(String(data).trimEnd()))
        job.stderr?.on('data', data => { errors = (errors + String(data)).slice(-6000) })
        job.on('error', error => { errors += error.message })
        job.on('close', code => {
          child = undefined
          if (closed) return
          if (code === 0) {
            server.config.logger.info('[maps] Local map assets ready. Refreshing preview.')
            server.ws.send({ type: 'full-reload', path: '*' })
          } else {
            server.config.logger.error(`[maps] Local build failed. Fix the error and save a map source to retry.\n${errors}`)
          }
          if (pending) build()
        })
      }
      const schedule = () => {
        pending = true
        clearTimeout(timer)
        timer = setTimeout(build, 400)
      }
      const changed = (event: string, file: string) => {
        if (!['add', 'change', 'unlink'].includes(event)) return
        if ((inside(sources, file) && /\.(png|json)$/i.test(file)) ||
            (inside(python, file) && /\.py$/i.test(file))) schedule()
      }
      server.watcher.add([sources, python])
      server.watcher.on('all', changed)
      schedule()
      server.httpServer?.once('close', () => {
        closed = true
        clearTimeout(timer)
        server.watcher.off('all', changed)
        if (child?.pid) {
          try {
            if (process.platform === 'win32') child.kill()
            else process.kill(-child.pid, 'SIGTERM')
          } catch { /* Build may already have exited. */ }
        }
      })
    },
  }
}
