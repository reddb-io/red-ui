import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/**
 * reddb doesn't send CORS headers, so browser fetches against
 * http://localhost:5055 from http://localhost:1420 fail.
 * This middleware accepts /_red/* requests with an X-Red-Target
 * header naming the target base URL, and proxies the request to
 * that URL with the original method/body/auth headers.
 */
function redProxy(): Plugin {
  return {
    name: 'red-proxy',
    configureServer(server) {
      server.middlewares.use('/_red', async (req, res) => {
        const target = (req.headers['x-red-target'] as string | undefined)?.replace(/\/$/, '')
        if (!target) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: 'missing X-Red-Target header' }))
          return
        }
        const path = req.url ?? '/'
        const upstream = target + path

        const chunks: Buffer[] = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', async () => {
          const body = chunks.length ? Buffer.concat(chunks) : undefined
          try {
            const upstreamRes = await fetch(upstream, {
              method: req.method,
              headers: {
                ...(req.headers['content-type'] ? { 'content-type': String(req.headers['content-type']) } : {}),
                ...(req.headers['authorization'] ? { authorization: String(req.headers['authorization']) } : {}),
              },
              body: body && body.length ? body : undefined,
            })
            res.statusCode = upstreamRes.status
            upstreamRes.headers.forEach((v, k) => {
              if (k.toLowerCase().startsWith('access-control')) return
              res.setHeader(k, v)
            })
            const buf = Buffer.from(await upstreamRes.arrayBuffer())
            res.end(buf)
          } catch (e) {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: (e as Error).message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [tailwindcss(), redProxy(), sveltekit()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
