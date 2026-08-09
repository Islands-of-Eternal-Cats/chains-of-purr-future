# Chains of Purr-fect Catmand

Browser PoC for a node-based cat-operator simulation. Build a small data graph,
assign cats to work slots, and route science data into a server.

## Development

```bash
npm install
npm run dev
```

Run the checks with `npm test` and create a production build with `npm run build`.

The rules live in `src/core` and do not depend on Vue or browser APIs. The Vue
application only translates player interactions into core commands and renders
the resulting snapshot through Vue Flow.
