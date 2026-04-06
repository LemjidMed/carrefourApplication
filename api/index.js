import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDist = path.join(__dirname, '../../web/dist');

const app = express();
app.use(express.json());

// Read bundles
let jsBundle = '';
let cssBundle = '';
try {
  jsBundle = readFileSync(path.join(webDist, 'app.js'), 'utf8');
} catch (error) {
  console.warn('Warning: web/dist/app.js not found', error.message);
}
try {
  cssBundle = readFileSync(path.join(webDist, 'app.css'), 'utf8');
} catch (error) {
  console.warn('Warning: web/dist/app.css not found', error.message);
}

// MCP metadata
app.get(['/mcp/metadata', '/api/mcp/metadata'], (_req, res) => {
  res.json({
    schema_version: 'v1',
    name: 'Carrefour ChatGPT App',
    description: 'MCP server pour OpenAI Apps SDK',
    auth: { type: 'none' },
    api: {
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/mcp` : 'http://localhost:3000/mcp',
      endpoints: ['metadata', 'open', 'execute']
    },
    ui: {
      type: 'web',
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'
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

// MCP execute
app.post(['/mcp/execute', '/api/mcp/execute'], (req, res) => {
  const { action, input } = req.body;
  if (action !== 'send_message') {
    return res.status(400).json({ success: false, error: 'Action not supported' });
  }
  const userText = input?.text || '';
  res.json({
    success: true,
    data: {
      reply: `Réponse MCP: J'ai reçu "${userText}"`,
      timestamp: new Date().toISOString()
    }
  });
});

// MCP challenge verification
app.get('/.well-known/openai-apps-challenge', (_req, res) => {
  const challengePath = path.join(__dirname, '../../.well-known/openai-apps-challenge');
  let token = process.env.OPENAI_APPS_CHALLENGE || '';
  try {
    const fileValue = readFileSync(challengePath, 'utf8').trim();
    if (fileValue) token = fileValue;
  } catch (error) {
    // ignore if file not found
  }
  res.type('text').send(token);
});

// Static files
app.use(express.static(webDist));

// Fallback to index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(webDist, 'index.html'));
});

export default app;
