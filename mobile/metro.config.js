const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const originalEnhanceMiddleware = config.server.enhanceMiddleware;

config.server.enhanceMiddleware = (middleware, server) => {
  const metroMiddleware = originalEnhanceMiddleware
    ? originalEnhanceMiddleware(middleware, server)
    : middleware;

  return (req, res, next) => {
    // Tunnel proxies can append comma-separated forwarding values. Metro
    // expects a single protocol and host when constructing its request URL.
    for (const name of ['x-forwarded-proto', 'x-forwarded-host']) {
      const value = req.headers[name];
      if (value !== undefined) {
        const firstValue = (Array.isArray(value) ? value[0] : value)
          .split(',')[0]
          .trim();
        if (firstValue) {
          req.headers[name] = firstValue;
        } else {
          delete req.headers[name];
        }
      }
    }

    return metroMiddleware(req, res, next);
  };
};

module.exports = config;
