const { serve } = require('@hono/node-server');
const { serveStatic } = require('@hono/node-server/serve-static');
const { Hono } = require('hono');
const fs = require('fs');
const path = require('path');

const app = new Hono();

app.use('/static/*', serveStatic({ root: './' }));

app.get('/', (c) => {
  const html = fs.readFileSync(path.join(__dirname, 'templates', 'index.html'), 'utf-8');
  return c.html(html);
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});
