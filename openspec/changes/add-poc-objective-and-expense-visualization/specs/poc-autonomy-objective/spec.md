## Purpose

Defines a visible, one-time PoC completion milestone while preserving open-ended sandbox play.

## ADDED Requirements

### Requirement: The autonomous laboratory objective uses the complete game loop

The system SHALL achieve the objective when flight is unlocked, cumulative lifetime data sales reach 25 units, and current revenue per minute is at least current upkeep per minute. Completion MUST remain achieved after any later decline or demolition.

#### Scenario: Final sale completes a profitable laboratory
- **WHEN** flight is unlocked, lifetime sales increase to 25, and current revenue covers upkeep
- **THEN** the objective becomes achieved exactly once

#### Scenario: One condition is missing
- **WHEN** any one of flight, 25 lifetime sales, or current self-sufficiency is absent
- **THEN** the objective remains incomplete

### Requirement: Objective progress remains visible

The control panel SHALL show progress for flight science, cumulative data sales, and current net income. After acknowledgement it SHALL identify the laboratory as an achieved continuing sandbox.

#### Scenario: Player checks incomplete progress
- **WHEN** the objective has not been achieved
- **THEN** the player can see the current value and completion state of all three conditions

### Requirement: Completion pauses once and permits continued play

The application SHALL pause and show an acknowledgement dialog for newly achieved or restored unacknowledged completion. Speed shortcuts, Escape, and backdrop clicks MUST NOT dismiss it. Acknowledgement SHALL persist immediately, close the dialog, and resume at ×1 without changing laboratory state.

#### Scenario: Player continues after completion
- **WHEN** the player activates “Продолжить играть”
- **THEN** the objective is acknowledged, the simulation resumes at ×1, and the sandbox remains playable

#### Scenario: Acknowledged save reloads
- **WHEN** a save with acknowledged completion is restored
- **THEN** the completion dialog is not shown again
