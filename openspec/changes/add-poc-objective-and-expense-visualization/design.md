## Context

Scientific progress, current revenue, aggregate upkeep, and blocked module state already exist in the deterministic core. The earlier instantaneous objective completes too quickly and does not prove that an expanded laboratory can sustain its economy.

## Goals / Non-Goals

**Goals:**
- Keep objective evaluation and expense accounting deterministic and core-owned.
- Require a continuous profitable operating period after the infrastructure and science prerequisites are complete.
- Preserve completion after later economic decline or terminal demolition.
- Interrupt only once, then retain normal sandbox play.

**Non-Goals:**
- Real-time or offline timer accrual, multiple objectives, save migration, expense history, or one-off purchase visualization.

## Decisions

### Persist continuous progress and sticky objective state

The simulation owns `profitableSeconds`, historical `peakNetIncomePerMinute`, `achieved`, and `acknowledged`. Every economic tick raises the stored peak to the greater of its previous value and current net income; later declines never lower it. Timing begins only after flight unlocks, at least two research modules exist, every research module is unblocked, and both slots in every research module retain an assignment. Each positive-duration tick adds time only when revenue per minute is strictly greater than upkeep. Any failed running tick resets partial progress; `tick(0)` leaves it unchanged. Reaching 300 seconds preserves the completed timing milestone. A stored peak at or above 500 credits per minute satisfies the independent peak milestone. Overall completion requires both milestones and valid current infrastructure. Acknowledgement remains a core command so exported saves do not replay the dialog.

### Expose upkeep categories in snapshots

The core calculates recurring upkeep for every module type and cats from the shared balance. The UI renders positive categories as a proportional stacked strip with textual totals and accessible labels. Construction, hiring, dismissal, and refunds remain cumulative spending only.

### Start save schema v5 without migration

The application reads only `catmand-save-v5`, exports version 5, and rejects imported version-4 files. The unused v4 local key is left untouched and a new laboratory starts when no v5 save exists.

### Pause until explicit acknowledgement

New or restored unacknowledged completion opens a modal at speed zero. Keyboard speed shortcuts are ignored while it is open. The single acknowledgement action persists immediately and resumes at ×1.

## Risks / Trade-offs

- Five minutes can feel like passive waiting → Simulation speed applies normally, so ×10 completes the timer in 30 real seconds while any economic failure still resets it.
- A stacked strip has little space for a legend → Each colored segment exposes a category tooltip and accessible label.
- v4 progress is lost → This is an accepted PoC constraint communicated by the existing early-development warning.
