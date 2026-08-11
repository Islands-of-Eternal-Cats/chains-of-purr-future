## Context

Scientific progress, per-terminal sales, current revenue, and aggregate upkeep already exist in deterministic core state. Terminal deletion currently removes its local sales counter, while UI-only objective state would not survive portable saves.

## Goals / Non-Goals

**Goals:**
- Keep objective evaluation and expense accounting deterministic and core-owned.
- Preserve completion after later economic decline or terminal demolition.
- Interrupt only once, then retain normal sandbox play.

**Non-Goals:**
- Timed profitability requirements, multiple objectives, save migration, expense history, or one-off purchase visualization.

## Decisions

### Persist cumulative sales and sticky objective state

The simulation owns `totalDataSold`, `achieved`, and `acknowledged`. Objective evaluation runs after each economic tick and becomes permanently true once flight is unlocked, cumulative sales reach 25, and current revenue per minute covers upkeep. Acknowledgement is a core command so exported saves do not replay the dialog.

### Expose upkeep categories in snapshots

The core calculates recurring upkeep for every module type and cats from the shared balance. The UI renders positive categories as a proportional stacked strip with textual totals and accessible labels. Construction, hiring, dismissal, and refunds remain cumulative spending only.

### Start save schema v2 without migration

The application reads only `catmand-save-v2`, exports version 2, and rejects imported version-1 files. The unused v1 local key is left untouched and a new laboratory starts when no v2 save exists.

### Pause until explicit acknowledgement

New or restored unacknowledged completion opens a modal at speed zero. Keyboard speed shortcuts are ignored while it is open. The single acknowledgement action persists immediately and resumes at ×1.

## Risks / Trade-offs

- Instantaneous profitability can briefly cross zero → Requiring 25 lifetime sales ensures the trade loop has already operated before completion.
- A stacked strip has little space for a legend → Each colored segment exposes a category tooltip and accessible label.
- v1 progress is lost → This is an accepted PoC constraint communicated by the existing early-development warning.
