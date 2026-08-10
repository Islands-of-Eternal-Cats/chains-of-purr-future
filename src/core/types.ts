export type NodeType = 'rest' | 'research' | 'server' | 'hub' | 'terminal'
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
  dataBuffer: number
  dataStored: number
  dataSold: number
  productionRate: number
  inputRate: number
  outputRate: number
}

export interface Connection {
  id: string
  sourceId: string
  targetId: string
  resource: 'data'
}

export interface EconomySnapshot {
  credits: number
  totalEarned: number
  totalSpent: number
  upkeepPerMinute: number
  revenuePerMinute: number
  debtWarning: boolean
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
  scienceProgress: number
  economy: EconomySnapshot
}

export interface PersistedEconomyV1 {
  credits: number
  totalEarned: number
  totalSpent: number
}

export interface SimulationStateV1 {
  nodes: SimNode[]
  cats: Cat[]
  connections: Connection[]
  workerLinks: WorkerLink[]
  nodeCounter: number
  catCounter: number
  flightUnlocked: boolean
  scienceProgress: number
  economy: PersistedEconomyV1
}

export interface GameSaveV1 {
  version: 1
  simulation: SimulationStateV1
}

export type CommandResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; reason: string }
