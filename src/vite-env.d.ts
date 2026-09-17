/// <reference types="vite/client" />

/** Short git commit hash, injected at build time (see vite.config.ts). */
declare const __COMMIT_HASH__: string
/** Committer date of that commit, ISO 8601 — empty string if unavailable. */
declare const __COMMIT_DATE__: string
