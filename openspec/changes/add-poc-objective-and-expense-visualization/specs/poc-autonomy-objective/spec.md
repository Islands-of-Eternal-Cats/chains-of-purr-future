## Purpose

Defines a visible, one-time PoC completion milestone while preserving open-ended sandbox play.

## ADDED Requirements

### Requirement: The autonomous laboratory objective uses the complete game loop

The system SHALL begin objective timing only when flight is unlocked, at least two research modules exist, every research module is unblocked, and both work slots in every research module retain cat assignments. An assigned cat MAY be resting or travelling. The system SHALL accumulate 300 continuous simulation seconds only while current revenue per minute is strictly greater than current upkeep per minute. A positive-duration tick that fails any condition MUST reset incomplete timing to zero. A zero-duration tick MUST leave timing unchanged. Reaching 300 seconds SHALL preserve that completed milestone. The system SHALL independently persist the maximum historical net income per minute and satisfy the peak milestone when that value reaches at least 500. Later income changes MUST NOT reduce the stored maximum. Overall completion SHALL require both milestones and valid current infrastructure, and MUST remain achieved after any later decline, overlap, or demolition.

#### Scenario: Five profitable minutes complete the laboratory
- **WHEN** all research modules are clear and fully assigned, at least two exist, flight is available, positive net income lasts 300 continuous simulation seconds, and the 500-per-minute peak has been reached
- **THEN** the objective becomes achieved exactly once

#### Scenario: One condition is missing
- **WHEN** flight is locked, fewer than two research modules exist, any research slot lacks an assignment, any research module is blocked, or net income is zero or negative during a running tick
- **THEN** incomplete profitable timing is zero

#### Scenario: Assigned researcher is resting
- **WHEN** a cat assigned to a research slot temporarily rests or travels while the assignment remains
- **THEN** that research slot remains staffed for objective infrastructure

#### Scenario: Peak income later falls
- **WHEN** net income reaches 500 credits per minute and later falls below it
- **THEN** the stored maximum remains at least 500 and the peak-income milestone remains achieved

#### Scenario: Simulation is paused
- **WHEN** no simulation time advances after partial profitable progress
- **THEN** the accumulated duration remains unchanged

### Requirement: Objective progress remains visible

The control panel SHALL show the fully staffed research-module count, flight state, maximum historical net income against the 500-per-minute target, and profitable duration formatted against 5:00 with a progress bar and reset explanation. The displayed peak MUST NOT follow a lower current income. The separate flight research project SHALL continue to show numeric science progress. After acknowledgement the objective card SHALL identify the laboratory as an achieved continuing sandbox.

#### Scenario: Player checks incomplete progress
- **WHEN** the objective has not been achieved
- **THEN** the player can see full staffing, flight state, peak-income state, and profitable timer progress

### Requirement: Completion pauses once and permits continued play

The application SHALL pause and show an acknowledgement dialog for newly achieved or restored unacknowledged completion. Speed shortcuts, Escape, and backdrop clicks MUST NOT dismiss it. Acknowledgement SHALL persist immediately, close the dialog, and resume at ×1 without changing laboratory state.

#### Scenario: Player continues after completion
- **WHEN** the player activates “Продолжить играть”
- **THEN** the objective is acknowledged, the simulation resumes at ×1, and the sandbox remains playable

#### Scenario: Acknowledged save reloads
- **WHEN** a save with acknowledged completion is restored
- **THEN** the completion dialog is not shown again
