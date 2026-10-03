import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function localLlmProxyPlugin() {
  return {
    name: 'local-llm-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/local-llm')) {
          return next();
        }

        const targetBaseUrl = req.headers['x-target-url'] || 'http://localhost:1234';
        const subPath = req.url.replace(/^\/api\/local-llm/, '') || '/chat/completions';
        
        // Clean subpath to ensure standard /v1/... format
        let targetSubPath = subPath.startsWith('/') ? subPath : `/${subPath}`;
        if (!targetSubPath.startsWith('/v1')) {
          targetSubPath = `/v1${targetSubPath}`;
        }
        
        const targetUrl = `${targetBaseUrl.replace(/\/+$/, '')}${targetSubPath}`;

        // Read body for POST/PUT requests
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const bodyBuffer = Buffer.concat(chunks);

        try {
          const fetchOptions = {
            method: req.method,
            headers: {
              'Content-Type': 'application/json'
            }
          };

          if (['POST', 'PUT', 'PATCH'].includes(req.method) && bodyBuffer.length > 0) {
            fetchOptions.body = bodyBuffer.toString('utf-8');
          }

          const response = await fetch(targetUrl, fetchOptions);
          const responseData = await response.text();

          res.statusCode = response.status;
          res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
          res.end(responseData);
        } catch (err) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ 
            error: { 
              message: `Could not reach Local LLM at ${targetBaseUrl}. Ensure LM Studio or Ollama is running. (${err.message})` 
            } 
          }));
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localLlmProxyPlugin()],
  server: {
    watch: {
      ignored: ['**/scratch/**']
    }
  }
})
