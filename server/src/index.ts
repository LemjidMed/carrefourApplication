import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'node:fs';

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDist = path.join(__dirname, '../../web/dist');

let jsBundle = '';
let cssBundle = '';

try {
  jsBundle = readFileSync(path.join(webDist, 'app.js'), 'utf8');
} catch (error) {
  console.warn('Warning: web dist app.js not found, MCP resource will return empty script', error);
}

try {
  cssBundle = readFileSync(path.join(webDist, 'app.css'), 'utf8');
} catch (error) {
  console.warn('Warning: web dist app.css not found, MCP resource will return empty styles', error);
}

app.use(express.json());

// MCP metadata
app.get(['/mcp/metadata', '/api/mcp/metadata'], (_req, res) => {
  res.json({
    schema_version: 'v1',
    name: 'Carrefour ChatGPT App exemple',
    description: 'MCP server minimal pour OpenAI Apps SDK',
    auth: {
      type: 'none'
    },
    api: {
      url: 'http://localhost:' + port,
      endpoints: ['mcp/metadata', 'mcp/open', 'mcp/execute']
    },
    ui: {
      type: 'web',
      url: 'http://localhost:' + port
    }
  });
});

// MCP open
app.post(['/mcp/open', '/api/mcp/open'], (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'MCP Open OK',
      context: req.body.context || null
    }
  });
});

// MCP execute (tool call)
app.post(['/mcp/execute', '/api/mcp/execute'], async (req, res) => {
  const { action, input } = req.body;

  if (!action || action !== 'send_message') {
    return res.status(400).json({
      success: false,
      error: 'Action non supportée. Doit être send_message.'
    });
  }

  const userText = input?.text || '';
  const replyText = `Réponse MCP: J'ai reçu "${userText}" et traité via Carrefour App.`;

  return res.json({
    success: true,
    data: {
      reply: replyText,
      timestamp: new Date().toISOString(),
    }
  });
});

// MCP resource (widget HTML)
app.get(['/mcp/resource/carrefour-widget', '/api/mcp/resource/carrefour-widget'], (_req, res) => {
  const html = `
<div id="root"></div>
<style>${cssBundle}</style>
<script type="module">${jsBundle}</script>
  `.trim();

  res.set('Content-Type', 'text/html;profile=mcp-app');
  res.send(html);
});

// MCP tool list
app.get(['/mcp/tools', '/api/mcp/tools'], (_req, res) => {
  res.json({
    tools: [
      {
        name: 'send_message',
        title: 'Send Message to Carrefour App',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'The message text' }
          },
          required: ['text']
        },
        _meta: {
          ui: { resourceUri: 'ui://widget/carrefour-chat.html' }
        }
      }
    ]
  });
});

// Serve static files from web/dist
app.use(express.static(webDist));

// Fallback to index.html for SPA
app.get('*', (_req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

app.listen(port, () => {
  console.log(`MCP Server running on http://localhost:${port}`);
});