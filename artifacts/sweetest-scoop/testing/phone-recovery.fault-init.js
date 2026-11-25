// Test-only browser fault injection for the phone recovery journey (not product code).
// Install ONCE per browser context, before the first navigation:
//   await context.addInitScript(fs.readFileSync('.../phone-recovery.fault-init.js', 'utf8'));
// Then toggle faults from the test page (survives reloads in the same tab):
//   await page.evaluate(() => window.__faultControl.set({ offline: true }));
//   await page.evaluate(() => window.__faultControl.set({ offline: false }));
//   await page.evaluate(() => window.__faultControl.reset());
//   const log = await page.evaluate(() => window.__faultControl.log());
// Flags (stored in sessionStorage['__faults'], read on every fetch):
//   offline:            every /api/* request rejects with TypeError (documents/assets untouched)
//   room503:            GET /api/rooms/:code returns 503 (POST/PUT untouched)
//   dropAnswerResponse: next PUT /api/rooms/:code/answer is FORWARDED to the real server,
//                       then only its response is replaced with a network error (one-shot; clears itself)
(() => {
  if (window.__faultInstalled) return;
  window.__faultInstalled = true;
  const realFetch = window.fetch.bind(window);
  const KEY = '__faults';
  const readFlags = () => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; } };
  const writeFlags = (f) => sessionStorage.setItem(KEY, JSON.stringify(f));
  window.__faultLog = window.__faultLog || [];
  window.__faultControl = {
    set(patch) { const next = { ...readFlags(), ...patch }; writeFlags(next); return next; },
    get() { return readFlags(); },
    reset() { writeFlags({}); window.__faultLog = []; return {}; },
    log() { return window.__faultLog.slice(); },
  };
  window.fetch = async (input, init = {}) => {
    const req = typeof Request !== 'undefined' && input instanceof Request ? input : null;
    const url = new URL(req ? req.url : String(input), location.href);
    const method = String(init.method || (req && req.method) || 'GET').toUpperCase();
    const f = readFlags();
    const entry = { t: Date.now(), method, path: url.pathname };
    const isApi = url.pathname.startsWith('/api/');
    if (isApi && f.offline) {
      window.__faultLog.push({ ...entry, fault: 'offline' });
      throw new TypeError('Failed to fetch');
    }
    if (isApi && f.room503 && method === 'GET' && /^\/api\/rooms\/[A-Za-z0-9]+$/.test(url.pathname)) {
      window.__faultLog.push({ ...entry, fault: 'room503' });
      return new Response(JSON.stringify({ error: 'Service unavailable' }), { status: 503, headers: { 'content-type': 'application/json' } });
    }
    if (isApi && f.dropAnswerResponse && method === 'PUT' && /\/answer$/.test(url.pathname)) {
      const res = await realFetch(input, init);
      writeFlags({ ...readFlags(), dropAnswerResponse: false });
      window.__faultLog.push({ ...entry, fault: 'response-aborted-after-forward', serverStatus: res.status });
      throw new TypeError('Failed to fetch');
    }
    return realFetch(input, init);
  };
})();
