import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Middleware de desarrollo para ejecutar /api/analyze localmente durante `npm run dev`
function vercelApiDevPlugin() {
  return {
    name: 'vercel-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.statusCode = 200
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Método no permitido. Utiliza POST.' }))
          return
        }

        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })

        req.on('end', async () => {
          try {
            // Cargar variables de entorno locales desde .env.local sin exponerlas al cliente
            const env = loadEnv(server.config.mode, process.cwd(), '')
            if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY
            if (env.GEMINI_MODEL) process.env.GEMINI_MODEL = env.GEMINI_MODEL

            const { default: handler } = await import('./api/analyze.js')

            const mockReq = {
              method: req.method,
              body: body ? JSON.parse(body) : {},
              headers: req.headers,
            }

            const mockRes = {
              statusCode: 200,
              setHeader(k, v) {
                res.setHeader(k, v)
                return this
              },
              status(code) {
                res.statusCode = code
                return this
              },
              json(data) {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              },
              end(data) {
                res.end(data)
              },
            }

            await handler(mockReq, mockRes)
          } catch (err) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: err.message || 'Error interno en middleware de Vite' }))
          }
        })
      })
    },
  }
}

// `base: './'` => rutas relativas, necesario para WebView y despliegues estáticos.
export default defineConfig({
  base: './',
  plugins: [react(), vercelApiDevPlugin()],
  server: { port: 5173 },
})
