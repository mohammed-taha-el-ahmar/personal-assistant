// CORS + JSON response helpers.

export function corsHeaders(origin, allowedOrigins) {
  const allow = allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || '';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export function errorJson(message, status, cors) {
  return json({ error: { message } }, status, cors);
}
