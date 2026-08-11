## Purpose

Keeps all sidebar actions and instructional text readable and reachable at supported desktop and mobile viewport sizes.

## ADDED Requirements

### Requirement: Sidebar guidance does not obscure controls
The control panel SHALL lay out its network guidance after its interactive sections in the panel's scroll flow, and MUST NOT overlay crew or save controls.

#### Scenario: Desktop viewport has limited height
- **WHEN** the interface is displayed at 1280 by 720 pixels
- **THEN** crew, save, and guidance content remain separately readable and are reachable by scrolling the control panel

#### Scenario: Mobile layout is active
- **WHEN** the interface is displayed at or below the mobile breakpoint
- **THEN** the compact control grid remains free of overlapping guidance content

