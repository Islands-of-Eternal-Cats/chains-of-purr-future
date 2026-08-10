## Purpose

Defines the recoverable credit economy that gives laboratory expansion an ongoing cost while preserving the open-ended, low-pressure sandbox.

## ADDED Requirements

### Requirement: Shared balance values govern the game
The system SHALL use one immutable balance definition for starting credits, debt threshold, node costs and slots, upkeep, cat costs and vigor, science production, trade rates, and transport rates. The interface MUST display prices from the same definition used to execute purchases.

#### Scenario: Displayed price matches charged price
- **WHEN** the player purchases a module whose displayed price comes from the balance definition
- **THEN** the credit balance decreases by exactly that displayed amount

### Requirement: Expansion spends credits and adds upkeep
The system SHALL start a new laboratory with 1000 credits, charge configured prices for modules and hired cats, and continuously charge configured module and cat upkeep while simulation time advances. A purchase MUST be rejected when the current balance is below its price.

#### Scenario: Unaffordable purchase is rejected
- **WHEN** the player attempts a purchase costing more than the current credit balance
- **THEN** the purchase is rejected without changing the laboratory or balance

#### Scenario: Paused laboratory has no upkeep
- **WHEN** no simulation time advances
- **THEN** the credit balance remains unchanged by upkeep

### Requirement: Data sales fund the laboratory
A trade terminal SHALL automatically consume stored data from its single connected server and credit the configured sale price. It SHALL sell at the base rate without an operator and add the configured operator capacity for active cat work.

#### Scenario: Staffed terminal sells faster
- **WHEN** equivalent data supplies are connected to an unstaffed terminal and a terminal with an active cat
- **THEN** the staffed terminal sells at the higher configured rate

### Requirement: Players can reduce operating costs
Deleting a purchased non-base module SHALL refund half its configured construction cost. The player SHALL be able to dismiss any non-starter cat for the configured compensation cost even while the cat works or travels, and dismissal MUST clear all occupancy, reservations, travel, and assignments belonging to that cat. The starter cat MUST NOT be dismissible.

#### Scenario: Module demolition refunds credits
- **WHEN** the player deletes an eligible purchased module
- **THEN** the module is removed and half its configured price is credited

#### Scenario: Travelling cat is dismissed safely
- **WHEN** the player dismisses a non-starter cat that is travelling to a reserved slot
- **THEN** the compensation is charged and no slot, route, or assignment references that cat

### Requirement: Debt is recoverable
The system SHALL permit upkeep and dismissal compensation to reduce credits below zero. Purchases MUST remain unavailable until affordable. Crossing the configured debt threshold of -500 credits SHALL display a laboratory-closed warning without stopping or resetting the simulation, and future sales SHALL still be able to restore the balance.

#### Scenario: Laboratory continues below the warning threshold
- **WHEN** the credit balance reaches or passes -500
- **THEN** the warning is shown while production, transfer, sale, demolition, and dismissal remain available

### Requirement: Diagnostic speed is hidden
The standard speed controls SHALL expose pause, ×1, ×5, and ×10. Clicking the brand mark SHALL reveal ×100 for the current page session, and this diagnostic unlock MUST NOT be persisted.

#### Scenario: Brand mark reveals diagnostic speed
- **WHEN** the player clicks the brand mark before ×100 is visible
- **THEN** the ×100 control appears until the page is reloaded

