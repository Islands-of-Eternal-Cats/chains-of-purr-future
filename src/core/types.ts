export type NodeType = 'rest' | 'research' | 'server'

export interface WorkSlot {
  id: string
  catId: string | null
}

export interface Cat {
  id: string
  name: string
  variant: string
  nodeId: string
  slotId: string
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

export interface SimulationSnapshot {
  nodes: SimNode[]
  cats: Cat[]
  connections: Connection[]
}

export type CommandResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; reason: string }
