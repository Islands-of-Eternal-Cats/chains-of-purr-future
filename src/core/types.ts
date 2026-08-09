export type NodeType = 'rest' | 'research' | 'server'

export interface WorkSlot {
  id: string
  catId: string | null
  reservedByCatId: string | null
}

export interface TravelLeg {
  linkId: string
  fromNodeId: string
  toNodeId: string
}

export interface CatTravel {
  targetNodeId: string
  targetSlotId: string
  path: TravelLeg[]
  legIndex: number
  legProgress: number
}

export interface Cat {
  id: string
  name: string
  variant: string
  nodeId: string
  slotId: string | null
  status: 'idle' | 'travelling'
  travel: CatTravel | null
}

export interface SimNode {
  id: string
  type: NodeType
  name: string
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
  travelSeconds: number
}

export interface SimulationSnapshot {
  nodes: SimNode[]
  cats: Cat[]
  connections: Connection[]
  workerLinks: WorkerLink[]
}

export type CommandResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; reason: string }
