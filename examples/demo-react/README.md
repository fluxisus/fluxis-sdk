# demo-react

Temporary React playground for `@fluxisus/react`. Not published — for local manual testing only.

## Prerequisites

Build the SDK once (or run it in watch mode):

```bash
npm run build --workspace=packages/frontend/react
```

## Run

From the repo root:

```bash
npm install
npm run dev --workspace=examples/demo-react
```

Open http://localhost:5173

## What to try

- Paste a real NASPIP token from your backend into the textarea.
- Toggle **Force mobile** to preview deep-link buttons.
- Toggle **Force desktop** to preview the QR fallback layout.
- Adjust theme colors to verify `FluxisProvider` overrides.

## Cleanup

This folder is intentionally temporary. Delete `examples/demo-react/` when you no longer need the playground.
