## 1. Balance and public state

- [x] 1.1 Add the terminal node type, economy, data inventory, progress, and versioned-save interfaces.
- [x] 1.2 Create and export the typed immutable `GAME_BALANCE`, then replace existing gameplay constants with it.

## 2. Core production and routing

- [x] 2.1 Produce cumulative science and sellable data directly from active research work and unlock flight from science progress.
- [x] 2.2 Implement compatible data ports, server output connectors, single terminal inputs, duplicate/self/cycle rejection, and safe disconnection.
- [x] 2.3 Implement fair multi-source server transfer, conserved server relay storage, and automatic terminal sales.
- [x] 2.4 Allow server output fan-out to multiple servers and terminals while preserving receiver-driven throughput and save compatibility.

## 3. Core economy and lifecycle

- [x] 3.1 Charge construction, hiring, continuous upkeep, and terminal revenue while exposing current economic rates.
- [x] 3.2 Add demolition refunds, safe paid cat dismissal, starter-cat protection, and recoverable debt state.

## 4. Persistence

- [x] 4.1 Implement strict version-1 simulation export, validation, and atomic restoration with reference integrity checks.
- [x] 4.2 Add debounced local autosave, JSON export/import, reset, and early-development save warnings.

## 5. Interface

- [x] 5.1 Render the trade terminal, server output port, compatible data connections, stored data, progress, and economy HUD.
- [x] 5.2 Show prices and upkeep from `GAME_BALANCE`, add dismissal and persistence controls, and surface debt/import errors.
- [x] 5.3 Hide ×100 behind the brand-mark interaction while preserving pause, ×1, ×5, and ×10.

## 6. Verification

- [x] 6.1 Add core tests for balance coverage, science/data separation, topology validation, fairness, conservation, trade, economy, dismissal, and debt.
- [x] 6.2 Add persistence and component coverage for round trips, invalid versions, prices, terminal rendering, and diagnostic speed.
- [x] 6.3 Run the complete test suite, production build, and strict OpenSpec validation.
