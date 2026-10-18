# CineBox Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Protect user-edited equipment lists, safely restore/import project data, remove the mobile navigation obstruction, and reduce the initial client bundle.

**Architecture:** Add a small pure `project-state` module that owns runtime sanitization and merge behavior, then call it from the existing single-page client. Keep recommendation rules unchanged. Load Excel-only code on demand and make the mobile toast respect the fixed navigation safe area.

**Tech Stack:** React 19, TypeScript, Vinext/Vite, Node test runner, CSS.

---

## Design decision

Three approaches were considered. A confirmation-only solution before regeneration is simple, but still forces users to choose between new recommendations and their work. Persisting every old row avoids loss but causes obsolete recommendations to accumulate. The selected hybrid merge keeps manual, confirmed, pending-test, and annotated rows; preserves quantity, note, and status when a newly generated row has the same ID; and allows untouched recommendations to be replaced normally.

Imported and locally restored data will pass through the same runtime sanitizer. It accepts the current export format, fills missing optional strings safely, clamps quantities, rejects unknown equipment without a valid custom definition, normalizes forms against the default schema, repairs duplicate IDs, and ignores invalid records. This prevents render-time assumptions from turning malformed backups into a broken workspace.

Excel generation will use dynamic imports inside the existing export action. This keeps behavior and output identical while moving the spreadsheet dependency out of the initial page chunk. The mobile toast will be raised above the bottom navigation using the existing safe-area inset.

### Task 1: Add state safety helpers and tests

**Files:**
- Create: `app/project-state.ts`
- Create: `tests/project-state.test.mjs`

1. Write tests for safe project restoration, malformed kit rows, duplicate IDs, quantity clamping, and merge preservation.
2. Run the focused test and confirm it fails before the helper exists.
3. Implement typed sanitization and regeneration merge helpers.
4. Run the focused test and confirm it passes.

### Task 2: Integrate safe restore, import, and regeneration

**Files:**
- Modify: `app/page.tsx`
- Modify: `tests/rendered-html.test.mjs`

1. Replace ad-hoc localStorage and backup filtering with the shared sanitizer.
2. Merge generated rows with user-owned work and report the preserved count.
3. Add a rendered-shell assertion for the updated preservation message where applicable.
4. Run the relevant tests.

### Task 3: Reduce initial load and repair mobile feedback placement

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

1. Move `write-excel-file` and workbook-builder imports into `exportExcel`.
2. Move the mobile toast above the fixed navigation and safe-area inset.
3. Build and confirm the Excel dependency is emitted as a separate lazy chunk.

### Task 4: Full verification and release

**Files:**
- Verify: all changed files

1. Run lint and the full test suite.
2. Confirm the worktree contains only intended changes.
3. Commit the validated source, package the exact build, save a new Sites version, and deploy it to production.
