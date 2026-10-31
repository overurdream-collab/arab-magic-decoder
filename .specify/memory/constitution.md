# Qitaa (AutoParts Yemen) Constitution

## Core Principles

### I. Spec-First Lifecycle

Every meaningful feature, multi-component bug fix, schema/API change, or workflow change MUST
follow the sequence: clarify unresolved requirements → specify → plan → tasks → implement →
analyze/checklist → verify. No work may jump directly to implementation. The only exception is
a tiny, isolated text or typo fix, and even then the rationale for skipping the lifecycle MUST
be recorded. Rationale: disciplined specification prevents rework and keeps the platform's
many actor roles consistent.

### II. Scope Discipline

Work MUST implement only the approved feature and its acceptance criteria. Scope expansion,
unrelated refactoring, speculative features, parallel duplicate implementations, and
unapproved redesign are prohibited. Out-of-scope ideas MUST be listed separately for explicit
approval rather than implemented opportunistically.

### III. Source of Truth and Evidence

The live repository — actual code, schema, migrations, branches, tests, and CI — is the only
source of truth. Every capability MUST be inspected before being described and MUST be
classified as implemented, partial, mocked, or not implemented. Contributors and agents
MUST NOT fabricate capabilities, evidence, test results, data, credentials, integrations, or
completion claims.
Rationale: the target-documents describe capabilities that do not exist; only verified reality
may be reported.

### IV. Preservation of Data and Behavior

Existing sound components, tables, and records MUST be reused and preserved. Destructive
migrations, data resets, production data mutation, force pushes, and history rewrites are
prohibited without explicit owner approval and a verified recovery plan. Working behavior MUST
NOT be regressed by new work.

### V. Security and Tenant Isolation

Authorization MUST be enforced server-side and in PostgreSQL row-level security; client-side
role checks alone are never sufficient. Roles MUST be explicit and stored in protected
structures; users MUST NOT be able to self-grant or escalate privileges. Cross-tenant
read/write isolation MUST be tested. Secrets, service-role credentials, and personal
customer/seller data MUST NOT be exposed, logged, or committed.

### VI. Automotive Data Truth

The canonical master catalog product is separate from seller offers; the two MUST NOT be
conflated. OEM numbers, alternates, prices, stock, warranties, seller verification, and
fitment claims MUST NOT be invented. Heuristic VIN decoding or model/fitment matching MUST be
labeled unverified and MUST request user confirmation; a part may only be called "verified
compatible" when backed by authoritative, traceable data.

### VII. Database Discipline

Schema and migration history MUST be inspected before any database change. Migrations MUST be
small, forward-only, and additive, with constraints, tests, and rollback/recovery notes.
Dropping or renaming columns, rewriting production records, or changing auth/RLS semantics
requires explicit approval plus a migration, backfill, and test plan.

### VIII. Test-First Quality Gates

Acceptance criteria and tests MUST be defined before implementation. Targeted tests, then the
relevant CI, security, browser, and database checks, MUST run before completion is claimed.
Already-passing suites MUST NOT be rerun without a code/environment change or a specific
reason. A PASS claim MUST cite the command or workflow, result counts, and run link or commit
SHA when available; skipped tests MUST be reported separately from passed tests.

### IX. Arabic RTL and Mobile Quality

Arabic-first right-to-left behavior, responsive mobile layouts, accessible controls, and clear
loading/empty/error states MUST be preserved in every change, unless an approved spec
explicitly modifies them. Rationale: the platform's primary audience is Arabic-speaking users
in Yemen, largely on mobile devices.

### X. Cost and Integration Control

Existing, free, and local capabilities MUST be preferred and validated before any spend. Paid
subscriptions, credential requests, live external integrations, and external spend are
prohibited without explicit owner approval. Integrations MUST be planned behind feature flags
with documented operational limits, and MUST NOT be claimed working without verified
credentials and integration tests.

### XI. Documentation and Traceability

Every requirement MUST be traceable: requirement → spec → plan → task → code → test evidence.
Substantive decisions, changes, tests, failures, and known limitations MUST be recorded in
repository docs/worklog and GitHub PR/commit context, including changed files, behavior, test
evidence, commit SHA, deployment status, remaining risks, and next steps.

### XII. Release Safety

Publishing, deployment, live payments, real notifications, and public production activation
are prohibited without explicit owner approval. Synthetic test data MUST be isolated and
labeled as synthetic; a successful build or CI run MUST NOT be equated with commercial
readiness.

### XIII. Technical Ownership

Approved feasible work MUST be inspected and executed, not merely planned. For material
ambiguity, one concise clarifying question MUST be asked before proceeding. When blocked, the
exact blocker and a safe alternative MUST be stated; completion MUST NOT be pretended.

## Source of Truth and Technology Baseline

The only implemented system is this React/TanStack Start + Supabase/PostgreSQL project. Target
documents describing Laravel, Flutter apps, payment/SMS providers, AI agents, or other
integrations are specifications, not existing capabilities, and MUST NOT be treated as
implemented. Any technology migration (for example to Flutter or Laravel) requires an
architecture decision record with explicit tradeoffs and owner approval before work begins.
Project knowledge files and docs/PROJECT_BASELINE.md carry the detailed current-state baseline
and MUST be kept consistent with reality.

## Quality Gates and Review Process

Every specification, plan, task list, code review, and implementation MUST be checked for
compliance with this constitution. Complexity beyond the approved spec MUST be justified and
approved. Reviews MUST verify: server-side and RLS authorization, tenant isolation tests,
non-destructive migrations, traceable test evidence, and honest status labeling. The Spec Kit
workflow artifacts (.specify/memory/constitution.md, specs/<feature>/spec.md, plan.md,
tasks.md) are mandatory for all non-trivial work.

## Governance

This constitution supersedes all other development practices and habits. Amendments require a
documented proposal, explicit owner approval, and a migration/compliance note for affected
in-flight work. Versioning follows semantic rules: MAJOR for backward-incompatible principle
removals or redefinitions, MINOR for new principles or materially expanded guidance, PATCH for
clarifications and non-semantic refinements. All PRs and reviews MUST verify constitutional
compliance; conflicts between a request and this constitution MUST be surfaced and explained,
never silently overridden.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date unknown — replace with the owner's formal ratification date | **Last Amended**: 2026-10-31
