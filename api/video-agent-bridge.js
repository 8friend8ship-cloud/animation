const ALLOWED_ACTIONS = new Set([
  'STATUS',
  'QUEUE_APP_WORKFLOW',
  'QUEUE_TEMPLATE_AGENT',
  'REGISTER_ENGAGEMENT_CAMPAIGN',
  'INGEST_ENGAGEMENT_EVENT',
  'PROCESS_VIDEO_PROMO_QUEUE',
  'PROCESS_ENGAGEMENT_EVENTS'
]);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      bridge: 'video-agent-bridge',
      configured: Boolean(process.env.VIDEO_AGENT_APPS_SCRIPT_URL),
      mode: 'server-proxy',
      actions: Array.from(ALLOWED_ACTIONS)
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
  }

  const upstream = process.env.VIDEO_AGENT_APPS_SCRIPT_URL;
  if (!upstream) return res.status(503).json({ok:false,error:'VIDEO_AGENT_APPS_SCRIPT_URL_NOT_CONFIGURED'});

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = String(body.action || '').trim().toUpperCase();
  if (!ALLOWED_ACTIONS.has(action)) return res.status(400).json({ok:false,error:'UNSUPPORTED_ACTION'});

  // Public browser payload is deliberately narrowed here before forwarding.
  // Credentials/API keys are never accepted from the front end.
  const forbiddenKeys = ['apiKey','api_key','secret','password','authorization','cookie','accessToken','refreshToken'];
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) return res.status(400).json({ok:false,error:'FORBIDDEN_CLIENT_SECRET_FIELD'});
  }

  try {
    const headers = {'Content-Type':'application/json'};
    if (process.env.VIDEO_AGENT_BRIDGE_TOKEN) headers['X-Bridge-Token'] = process.env.VIDEO_AGENT_BRIDGE_TOKEN;

    const upstreamResponse = await fetch(upstream, {
      method: 'POST',
      headers,
      body: JSON.stringify({...body, action, source:'VERCEL_VIDEO_AGENT_BRIDGE'})
    });

    const text = await upstreamResponse.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : {}; }
    catch { parsed = {ok:false,error:'UPSTREAM_INVALID_JSON',raw:text.slice(0,500)}; }

    return res.status(upstreamResponse.ok ? 200 : 502).json(parsed);
  } catch (error) {
    return res.status(502).json({ok:false,error:'UPSTREAM_REQUEST_FAILED',message:String(error && error.message || error)});
  }
}
