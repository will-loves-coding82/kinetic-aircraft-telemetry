/**
 * Cloudflare Worker: transparent relay to OpenSky Network.
 *
 * Why this exists: Vercel's serverless egress IPs (AWS datacenter ranges)
 * appear to be blocked or dropped by OpenSky at the network level (connect
 * timeouts even from a Frankfurt region, close to OpenSky's Swiss servers,
 * while the same request succeeds instantly from a residential IP). This
 * Worker runs on Cloudflare's network instead and simply forwards requests
 * to OpenSky, so Vercel talks to this Worker instead of opensky-network.org
 * directly.
 *
 * Only forwards to the two OpenSky hosts this app actually needs — not an
 * open proxy to arbitrary destinations.
 */

const ALLOWED_HOSTS = new Set([
  "opensky-network.org",
  "auth.opensky-network.org",
]);

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Target host/path is passed via the `upstream` query param, e.g.
    // /relay?upstream=https://opensky-network.org/api/states/all&extended=1
    const upstream = url.searchParams.get("upstream");
    if (!upstream) {
      return new Response("Missing ?upstream=", { status: 400 });
    }

    let target;
    try {
      target = new URL(upstream);
    } catch {
      return new Response("Invalid upstream URL", { status: 400 });
    }
    if (!ALLOWED_HOSTS.has(target.hostname)) {
      return new Response("Host not allowed", { status: 403 });
    }

    const init = {
      method: request.method,
      headers: request.headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    };

    const res = await fetch(target.toString(), init);
    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  },
};
