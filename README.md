# Chains of Purr-future

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

## Versioning

The project follows [Semantic Versioning](https://semver.org/) in the
`MAJOR.MINOR.PATCH` format. Every completed change must include a version bump:

- increment `MAJOR` for incompatible changes to public behavior, APIs, or save
  formats;
- increment `MINOR` for backward-compatible features and gameplay changes;
- increment `PATCH` for backward-compatible fixes, documentation, tests, and
  other maintenance changes.

Use the highest applicable level for a cohesive change set and bump the version
once for that set. Keep the root versions in `package.json` and
`package-lock.json` synchronized. The application reads this value at build
time and displays it in the header.
