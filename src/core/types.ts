export type NodeType = 'rest' | 'research' | 'server' | 'hub'
export type RoadPort = 'road' | 'north' | 'east' | 'south' | 'west'

export interface Point {
  x: number
  y: number
}

export interface WorkSlot {
  id: string
  catId: string | null
  reservedByCatId: string | null
  assignedCatId: string | null
}

export interface TravelLeg {
  linkId: string
  fromNodeId: string
  toNodeId: string
}

interface CatTravelBase {
  targetNodeId: string
  targetSlotId: string
  sourceNodeId: string
}

export interface RoadTravel extends CatTravelBase {
  kind: 'road'
  leg: TravelLeg
  legProgress: number
}

export interface FlightTravel extends CatTravelBase {
  kind: 'flight'
  fromNodeId: string
  fromSlotId: string | null
  flightDurationSeconds: number
  flightProgress: number
}

export type CatTravel = RoadTravel | FlightTravel

export interface StrandedTravel {
  targetNodeId: string
  targetSlotId: string
  sourceNodeId: string
}

export interface Cat {
  id: string
  name: string
  variant: string
  nodeId: string
  slotId: string | null
  status: 'idle' | 'travelling' | 'stranded'
  travel: CatTravel | null
  stranded?: StrandedTravel | null
  vigor: number
}

export interface SimNode {
  id: string
  type: NodeType
  name: string
  blocked?: boolean
  position?: Point
  slots: WorkSlot[]
  scienceBuffer: number
  scienceReceived: number
  productionRate: number
  inputRate: number
}

export interface Connection {
  id: string
  sourceId: string
  targetId: string
  resource: 'scienceData'
}

export interface WorkerLink {
  id: string
  nodeAId: string
  nodeBId: string
  nodeAPort: RoadPort
  nodeBPort: RoadPort
  travelSeconds: number
}

export interface SimulationSnapshot {
  nodes: SimNode[]
  cats: Cat[]
  connections: Connection[]
  workerLinks: WorkerLink[]
  flightUnlocked: boolean
}

export type CommandResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; reason: string }
