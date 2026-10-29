import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { digestHtml } from './digest/html.js';
import { digestJson } from './digest/json.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const result = digestHtml(config, c.req.param('night'));
    if (result.status === 404) return c.body('Not Found', 404);
    return c.html(result.body);
  });

  app.get('/api/digest/:night', (c) => {
    const result = digestJson(config, c.req.param('night'));
    if (result.status === 404) return c.body('Not Found', 404);
    return c.json(result.body);
  });

  return app;
}
