import type { Cat, CommandResult, Connection, NodeType, SimNode, SimulationSnapshot, WorkSlot } from './types'

const REST_ID = 'rest-1'
const CAT_NAMES = ['Мира', 'Нокс', 'Север', 'Иней', 'Пиксель']
const CAT_VARIANTS = ['◕', '◔', '◑', '◒', '◐']

function slots(nodeId: string, amount: number): WorkSlot[] {
  return Array.from({ length: amount }, (_, index) => ({ id: `${nodeId}-slot-${index + 1}`, catId: null }))
}

export class Simulation {
  private readonly nodes = new Map<string, SimNode>()
  private readonly cats = new Map<string, Cat>()
  private readonly connections = new Map<string, Connection>()
  private nodeCounter = 0
  private catCounter = 0

  constructor() {
    this.nodes.set(REST_ID, {
      id: REST_ID,
      type: 'rest',
      name: 'Комната отдыха',
      slots: slots(REST_ID, 3),
      scienceBuffer: 0,
      scienceReceived: 0,
      productionRate: 0,
      inputRate: 0,
    })
    this.hireCat()
  }

  snapshot(): SimulationSnapshot {
    return {
      nodes: [...this.nodes.values()].map((node) => ({
        ...node,
        slots: node.slots.map((slot) => ({ ...slot })),
      })),
      cats: [...this.cats.values()].map((cat) => ({ ...cat })),
      connections: [...this.connections.values()].map((connection) => ({ ...connection })),
    }
  }

  createNode(type: Exclude<NodeType, 'rest'>): CommandResult<SimNode> {
    if ([...this.nodes.values()].some((node) => node.type === type)) {
      return { ok: false, reason: type === 'research' ? 'Узел исследований уже создан.' : 'Сервер данных уже создан.' }
    }

    this.nodeCounter += 1
    const id = `${type}-${this.nodeCounter}`
    const node: SimNode = {
      id,
      type,
      name: type === 'research' ? 'Исследования' : 'Сервер данных',
      slots: slots(id, type === 'research' ? 2 : 1),
      scienceBuffer: 0,
      scienceReceived: 0,
      productionRate: 0,
      inputRate: 0,
    }
    this.nodes.set(id, node)
    return { ok: true, value: { ...node, slots: node.slots.map((slot) => ({ ...slot })) } }
  }

  hireCat(): CommandResult<Cat> {
    const rest = this.nodes.get(REST_ID)!
    const freeSlot = rest.slots.find((slot) => slot.catId === null)
    if (!freeSlot) return { ok: false, reason: 'В комнате отдыха нет свободных мест.' }

    this.catCounter += 1
    const index = this.catCounter - 1
    const cat: Cat = {
      id: `cat-${this.catCounter}`,
      name: CAT_NAMES[index % CAT_NAMES.length],
      variant: CAT_VARIANTS[index % CAT_VARIANTS.length],
      nodeId: REST_ID,
      slotId: freeSlot.id,
    }
    freeSlot.catId = cat.id
    this.cats.set(cat.id, cat)
    return { ok: true, value: { ...cat } }
  }

  assignCat(catId: string, nodeId: string, slotId: string): CommandResult<void> {
    const cat = this.cats.get(catId)
    const node = this.nodes.get(nodeId)
    const slot = node?.slots.find((candidate) => candidate.id === slotId)
    if (!cat) return { ok: false, reason: 'Кот не найден.' }
    if (!slot) return { ok: false, reason: 'Рабочий слот не найден.' }
    if (slot.catId !== null) return { ok: false, reason: 'Этот слот уже занят.' }

    const previousNode = this.nodes.get(cat.nodeId)
    const previousSlot = previousNode?.slots.find((candidate) => candidate.id === cat.slotId)
    if (!previousSlot) return { ok: false, reason: 'Назначение кота повреждено.' }

    previousSlot.catId = null
    slot.catId = cat.id
    cat.nodeId = nodeId
    cat.slotId = slotId
    return { ok: true, value: undefined }
  }

  releaseCat(catId: string): CommandResult<void> {
    const cat = this.cats.get(catId)
    if (!cat) return { ok: false, reason: 'Кот не найден.' }
    if (cat.nodeId === REST_ID) return { ok: false, reason: 'Кот уже отдыхает.' }

    const rest = this.nodes.get(REST_ID)!
    const freeSlot = rest.slots.find((slot) => slot.catId === null)
    if (!freeSlot) return { ok: false, reason: 'В комнате отдыха нет свободных мест.' }
    const currentSlot = this.nodes.get(cat.nodeId)?.slots.find((slot) => slot.id === cat.slotId)
    if (!currentSlot) return { ok: false, reason: 'Назначение кота повреждено.' }

    currentSlot.catId = null
    freeSlot.catId = cat.id
    cat.nodeId = REST_ID
    cat.slotId = freeSlot.id
    return { ok: true, value: undefined }
  }

  connect(sourceId: string, targetId: string): CommandResult<Connection> {
    const source = this.nodes.get(sourceId)
    const target = this.nodes.get(targetId)
    if (source?.type !== 'research' || target?.type !== 'server') {
      return { ok: false, reason: 'Разрешена только связь: Исследования → Сервер данных.' }
    }
    if ([...this.connections.values()].some((connection) => connection.sourceId === sourceId)) {
      return { ok: false, reason: 'Выход исследований уже подключён.' }
    }

    const connection = {
      id: `science-${sourceId}-${targetId}`,
      sourceId,
      targetId,
      resource: 'scienceData' as const,
    }
    this.connections.set(connection.id, connection)
    return { ok: true, value: { ...connection } }
  }

  disconnect(connectionId: string): CommandResult<void> {
    if (!this.connections.has(connectionId)) {
      return { ok: false, reason: 'Канал данных не найден.' }
    }
    this.connections.delete(connectionId)
    return { ok: true, value: undefined }
  }

  tick(deltaSeconds: number): CommandResult<void> {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      return { ok: false, reason: 'Время симуляции должно быть неотрицательным числом.' }
    }

    for (const node of this.nodes.values()) {
      node.productionRate = 0
      node.inputRate = 0
      if (node.type === 'research' && node.slots.some((slot) => slot.catId !== null)) {
        node.productionRate = 1
        node.scienceBuffer += deltaSeconds
      }
    }

    const server = [...this.nodes.values()].find((node) => node.type === 'server')
    if (!server || deltaSeconds === 0) return { ok: true, value: undefined }

    let remainingCapacity = (server.slots.some((slot) => slot.catId !== null) ? 1 : 0.5) * deltaSeconds
    for (const connection of this.connections.values()) {
      if (connection.targetId !== server.id || remainingCapacity <= 0) continue
      const source = this.nodes.get(connection.sourceId)
      if (!source) continue
      const transferred = Math.min(source.scienceBuffer, remainingCapacity)
      source.scienceBuffer -= transferred
      server.scienceReceived += transferred
      server.inputRate += transferred / deltaSeconds
      remainingCapacity -= transferred
    }

    return { ok: true, value: undefined }
  }
}
