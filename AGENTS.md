# AGENTS.md

## Project

- This repository contains the Uncovr admin portal.
- Use React, TypeScript and Vite.
- Use React Router in Data Mode for routing and TanStack Query for server state.
- Laravel is the only backend and authorization boundary. Do not duplicate
  backend validation, authorization or domain logic in the portal.
- Use `http://localhost:5173` for the portal and `http://localhost:8000` for the
  API during local development. Do not mix `localhost` and `127.0.0.1`.

## Working conventions

- Read `IMPLEMENTATION_PLAN.md` before starting feature work and begin with the
  first unchecked item in the active milestone.
- Mark a plan item complete only after its implementation and relevant checks
  pass.
- Preserve the existing architecture, package manager and lockfile.
- Pin dependencies to exact versions.
- Keep changes focused. Do not modify unrelated files or overwrite user work.
- Use accessible semantic HTML, visible keyboard focus, labelled controls and
  actionable error messages.
- Support phone, tablet and desktop layouts.
- Never store access tokens, refresh tokens or secrets in browser storage or in
  `VITE_*` environment variables.
- Send credentialed API requests through the shared API client and preserve the
  Laravel error envelope and `X-Request-ID` behavior.

## Validation

- During development, use focused checks such as `npm run format:check`,
  `npm run lint` and `npm run test`.
- Never run `npm run build` during development. If a production build is
  necessary, stop and ask the user to run it manually.
- Do not run another command that invokes the build indirectly. In the current
  package configuration `npm run check` is safe: it runs formatting, lint,
  TypeScript type checking and tests without producing a production build.
- Add or update tests for changed behavior and fix relevant failures before
  handing work back.

## Git

- Do not commit, push, create branches or open pull requests unless the user
  explicitly asks.
- Before handoff, report changed files, checks run and any checks left for the
  user.
