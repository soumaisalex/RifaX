import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) => c.json({ status: 'ok', service: 'rifa-x-api' }));

export default app;
