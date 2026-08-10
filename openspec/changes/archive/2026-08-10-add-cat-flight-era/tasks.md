## 1. Simulation transport modes

- [x] 1.1 Add node-position and flight-unlock state to the public simulation snapshot and transport types.
- [x] 1.2 Implement science-gated flight journey creation, continuation, and stranded-cat recovery.
- [x] 1.3 Keep road and hub construction available after unlock without coupling it back to cat travel.

## 2. Interface transition

- [x] 2.1 Synchronize canvas positions into the simulation and expose the flight-era state in the controls and status text.
- [x] 2.2 Render temporary direct airborne trajectories and cat tokens without persistent worker links.

## 3. Verification

- [x] 3.1 Add simulation coverage for unlock threshold, direct timing, transitions, legacy-road deletion, and stranded recovery.
- [x] 3.2 Run tests, production build, and OpenSpec validation.
