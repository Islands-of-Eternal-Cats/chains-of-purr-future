## Why

The laboratory now has a complete economy but no explicit PoC completion moment, and the credit readout exposes only net income without explaining recurring costs. Players need a visible objective that exercises the full loop and a compact way to understand upkeep while retaining the open-ended sandbox.

## What Changes

- Add a one-time autonomous-laboratory objective gated by flight, 25 cumulative data sales, and non-negative current net income.
- Show objective progress in the control panel and pause for an acknowledgement dialog when the objective is first achieved.
- Keep play state intact and resume at ×1 after acknowledgement.
- Add a top-bar stacked upkeep visualization broken down by module type and cats.
- Replace save schema and local-storage key v1 with v2; old saves are unsupported and are not migrated.

## Capabilities

### New Capabilities

- `poc-autonomy-objective`: Progress, one-time completion, acknowledgement, and continued sandbox play.
- `recurring-upkeep-visualization`: Current recurring expense breakdown in the economy HUD.

### Modified Capabilities

- `versioned-local-saves`: Persist cumulative sales and objective state in required schema v2 without v1 migration.

## Impact

- Extends core snapshots and saves with cumulative sales, upkeep categories, and objective state.
- Updates the main Vue interface, styling, Russian rules, core tests, and component tests.
- Adds no runtime dependencies.
