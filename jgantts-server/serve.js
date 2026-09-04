// Compatibility entry point for the existing systemd service.
// Application code lives in TypeScript under src/ and is compiled to dist/.
require('./dist/server').startServer();
