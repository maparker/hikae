export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let code, client_id;
    try {
      ({ code, client_id } = await request.json());
    } catch {
      return json({ error: 'Invalid request body' }, 400);
    }

    if (!code || !client_id) {
      return json({ error: 'Missing code or client_id' }, 400);
    }

    const secrets = {
      [env.GITHUB_DEV_CLIENT_ID]: env.GITHUB_DEV_CLIENT_SECRET,
      [env.GITHUB_PROD_CLIENT_ID]: env.GITHUB_PROD_CLIENT_SECRET,
    };

    const client_secret = secrets[client_id];
    if (!client_secret) {
      return json({ error: 'Unknown client_id' }, 400);
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ client_id, client_secret, code }),
    });

    const data = await response.json();
    return json(data, 200);
  },
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}
