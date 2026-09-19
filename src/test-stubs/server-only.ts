// Stub for the `server-only` package during unit tests. The real module throws
// when imported outside a React Server environment; under Node/Vitest we alias
// it here so server-side modules (tools, store) can be exercised directly.
export {};
