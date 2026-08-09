# Uncovr admin portal implementation plan

Last updated: 2026-08-09

This plan owns all implementation work for the authenticated Uncovr admin
portal. Cross-repository sequencing and mobile planning live in the
[workspace roadmap](https://github.com/oddedodd/Uncovr2-implentation-docs/blob/main/IMPLEMENTATION_PLAN.md).
Laravel/API work lives in the
[backend plan](https://github.com/oddedodd/uncovr2-backend/blob/main/docs/IMPLEMENTATION_PLAN.md).

## How we use this plan

- `[x]` means implemented and verified.
- `[ ]` means not completed.
- Work starts at the first unchecked item in the active milestone.
- Checkboxes are updated only after relevant checks and acceptance criteria pass.
- Task IDs remain stable so they can be referenced in issues, commits and prompts.

## Portal architecture

- The portal is a React and TypeScript single-page application built with Vite.
- React Router Data Mode owns client-side routing and route-level data states.
- TanStack Query owns server-state fetching, caching and mutations.
- Laravel is the only backend. The portal calls its versioned API directly and
  does not duplicate authentication, authorization, validation or domain logic.
- Local development uses `http://localhost:5173` for the portal and
  `http://localhost:8000` for Laravel. Do not mix `localhost` and `127.0.0.1`.
- Production uses `https://admin.uncovr.no` for the statically hosted portal and
  `https://api.uncovr.no` for Laravel.
- Authentication uses Laravel Sanctum's stateful HTTP-only session cookie and
  CSRF flow. The portal never stores access or refresh tokens in browser storage.
- Credentialed CORS allows only the exact portal origin for each environment.
- Static hosting must fall back to `index.html` for direct navigation to client routes.
- Laravel Policies remain the authorization boundary; UI visibility is only a
  usability concern and never proof of permission.

Portal feature work begins after the backend-to-portal gate for B0 through B6 passes.

## P0 — Portal foundation

- [x] `P0.1` Use a separate sibling Git repository named `uncover-portal`.
- [ ] `P0.2` Scaffold current stable React and TypeScript with Vite and pin dependencies.
- [ ] `P0.3` Add React Router in Data Mode and TanStack Query without introducing a frontend server layer.
- [ ] `P0.4` Add formatting, linting, unit tests and CI.
- [ ] `P0.5` Validate environment variables and configure the Laravel API base URL as
  `http://localhost:8000` locally and `https://api.uncovr.no` in production.
- [ ] `P0.6` Build a typed API client with credentialed requests, CSRF support,
  consistent API errors and request IDs.
- [ ] `P0.7` Configure local development on `http://localhost:5173` and document
  that portal and API must use the same `localhost` hostname.
- [ ] `P0.8` Configure static SPA hosting at `https://admin.uncovr.no`, including
  history fallback so direct navigation to client routes serves `index.html`.
- [ ] `P0.9` Align Laravel CORS, Sanctum stateful domains and session-cookie settings
  with the exact local and production portal origins.
- [ ] `P0.10` Establish accessible layout, forms, feedback and responsive breakpoints.

## P1 — Authentication and role-aware shell

- [ ] `P1.1` Build registration, login, verification and password-reset screens.
- [ ] `P1.2` Initialize CSRF through `/sanctum/csrf-cookie`, authenticate with
  Laravel's secure HTTP-only session cookie and send credentials on every API request.
- [ ] `P1.3` Build account, active-session and logout screens.
- [ ] `P1.4` Load the current user's memberships and available workspaces.
- [ ] `P1.5` Build role-aware navigation without treating hidden UI as authorization.
- [ ] `P1.6` Add forbidden, expired-session, empty and error states.

## P2 — Superadmin workflow

- [ ] `P2.1` Build platform overview and operational status.
- [ ] `P2.2` Build user, organization, artist and release search.
- [ ] `P2.3` Build organization creation, approval, suspension and correction flows.
- [ ] `P2.4` Show user memberships and resource hierarchy.
- [ ] `P2.5` Build role correction and account suspension with confirmation and audit context.
- [ ] `P2.6` Verify that superadmin operations use protected Laravel endpoints only.

### P2 gate

- [ ] A superadmin can establish a label and its first administrator entirely in the portal.

## P3 — Label workflow

- [ ] `P3.1` Build label dashboard and profile editor.
- [ ] `P3.2` Build team listing, invitations, role changes and removals.
- [ ] `P3.3` Build artist listing and artist creation.
- [ ] `P3.4` Assign an Artist Admin during artist onboarding.
- [ ] `P3.5` Show all permitted releases across label artists.
- [ ] `P3.6` Verify Label User restrictions for owned and assigned work.

### P3 gate

- [ ] Label Admin can manage its label, team and artists without developer help.
- [ ] Label User cannot administer team members or unrestricted content.

## P4 — Artist workflow

- [ ] `P4.1` Build artist dashboard and profile editor.
- [ ] `P4.2` Build artist team invitations, roles and removal.
- [ ] `P4.3` Build release listing with status, ownership and assignment filters.
- [ ] `P4.4` Build release creation and basic metadata editing.
- [ ] `P4.5` Verify Artist User restrictions for owned and assigned work.

### P4 gate

- [ ] Artist Admin can manage its profile, team and releases.
- [ ] Artist User cannot administer roles or alter another user's unassigned work.

## P5 — Release builder

- [ ] `P5.1` Build release metadata, artist and date forms.
- [ ] `P5.2` Build sortable track management.
- [ ] `P5.3` Build page management for releases and tracks.
- [ ] `P5.4` Build the first accessible block-editor interface.
- [ ] `P5.5` Build media upload, selection, replacement and removal.
- [ ] `P5.6` Build streaming-link and credit editors.
- [ ] `P5.7` Build responsive preview using the public release representation.
- [ ] `P5.8` Build review, approval, scheduling, publishing and unpublishing controls.
- [ ] `P5.9` Preserve unsaved-work warnings and actionable validation feedback.

## P6 — Portal quality and demo readiness

- [ ] `P6.1` Add aggregate statistics without exposing listener identities.
- [ ] `P6.2` Add loading, empty, offline and recoverable error states.
- [ ] `P6.3` Verify keyboard navigation and screen-reader fundamentals.
- [ ] `P6.4` Verify phone, tablet and desktop layouts.
- [ ] `P6.5` Add end-to-end tests for superadmin, label and artist journeys.
- [ ] `P6.6` Run an authorization-focused security review.
- [ ] `P6.7` Deploy a production-like portal connected to a safe environment.

## Portal phase gate

- [ ] Superadmin creates or approves a label and its administrator.
- [ ] Label Admin invites team members and creates an artist with an Artist Admin.
- [ ] Artist Admin creates a release with tracks, media, credits and rich content.
- [ ] The release is previewed, approved and published entirely through the portal.
- [ ] Lower-privileged users are blocked from forbidden actions in both UI and API.
- [ ] The complete workflow passes automated end-to-end tests.

Only after this gate passes do we schedule listener-specific backend and Expo work.
