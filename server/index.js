
import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.API_PORT || 3001;

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'Lumora API',
    database: process.env.SUPABASE_URL ? 'configured' : 'not_configured',
  });
});

app.get('/api/business/summary', async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: 'Sign in required' });
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return res.status(503).json({ error: 'Supabase is not configured yet' });
  }

  try {
    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: { user }, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const { data: events, error: eventsError } = await supabase
  .from('business_events')
  .select('id, event_type, amount, description, occurred_on, created_at')
  .eq('user_id', user.id)
  .order('occurred_on', { ascending: false });

if (eventsError) {
  console.error('Business events query failed:', eventsError.message);
  return res.status(500).json({ error: 'Unable to load business events' });
}

return res.json({
  userId: user.id,
  events: events ?? [],
});
  } catch {
    return res.status(500).json({ error: 'Unable to verify session' });
  }
});

app.listen(PORT, () => {
  console.log(`Lumora API running at http://localhost:${PORT}`);
});
