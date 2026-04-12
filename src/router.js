/**
 * Minimal pattern-matching HTTP router.
 * Routes are { method, path, handler }. Path may contain :params.
 */

function compile(pattern) {
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern.replace(/:([a-zA-Z_]+)/g, (_, k) => {
        keys.push(k);
        return '([^/]+)';
      }) +
      '$'
  );
  return { regex, keys };
}

export function createRouter() {
  const routes = [];
  return {
    add(method, pattern, handler) {
      routes.push({ method, ...compile(pattern), handler });
    },
    addAll(routeList) {
      for (const r of routeList) this.add(r.method, r.path, r.handler);
    },
    match(method, pathname) {
      for (const r of routes) {
        if (r.method !== method) continue;
        const m = pathname.match(r.regex);
        if (!m) continue;
        const params = {};
        r.keys.forEach((k, i) => {
          params[k] = decodeURIComponent(m[i + 1]);
        });
        return { handler: r.handler, params };
      }
      return null;
    },
  };
}
