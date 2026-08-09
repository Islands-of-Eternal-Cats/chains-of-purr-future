import type { Cat, CommandResult, Connection, NodeType, SimNode, SimulationSnapshot, TravelLeg, WorkerLink, WorkSlot } from './types'

const REST_ID = 'rest-1'
const CAT_NAMES = ['Мира', 'Нокс', 'Север', 'Иней', 'Пиксель']
const CAT_VARIANTS = ['◕', '◔', '◑', '◒', '◐']
const EPSILON = 0.000001

function slots(nodeId: string, amount: number): WorkSlot[] {
  return Array.from({ length: amount }, (_, index) => ({ id: `${nodeId}-slot-${index + 1}`, catId: null, reservedByCatId: null }))
}

function copyNode(node: SimNode): SimNode {
  return { ...node, slots: node.slots.map((slot) => ({ ...slot })) }
}

function copyCat(cat: Cat): Cat {
  return { ...cat, travel: cat.travel ? { ...cat.travel, path: cat.travel.path.map((leg) => ({ ...leg })) } : null }
}

export class Simulation {
  private readonly nodes = new Map<string, SimNode>()
  private readonly cats = new Map<string, Cat>()
  private readonly connections = new Map<string, Connection>()
  private readonly workerLinks = new Map<string, WorkerLink>()
  private nodeCounter = 0
  private catCounter = 0

  constructor() {
    this.nodes.set(REST_ID, {
      id: REST_ID, type: 'rest', name: 'Комната отдыха', slots: slots(REST_ID, 3),
      scienceBuffer: 0, scienceReceived: 0, productionRate: 0, inputRate: 0,
    })
    this.hireCat()
  }

  snapshot(): SimulationSnapshot {
    return {
      nodes: [...this.nodes.values()].map(copyNode),
      cats: [...this.cats.values()].map(copyCat),
      connections: [...this.connections.values()].map((connection) => ({ ...connection })),
      workerLinks: [...this.workerLinks.values()].map((link) => ({ ...link })),
    }
  }

  createNode(type: Exclude<NodeType, 'rest'>): CommandResult<SimNode> {
    if ([...this.nodes.values()].some((node) => node.type === type)) {
      return { ok: false, reason: type === 'research' ? 'Узел исследований уже создан.' : 'Сервер данных уже создан.' }
    }
    this.nodeCounter += 1
    const id = `${type}-${this.nodeCounter}`
    const node: SimNode = {
      id, type, name: type === 'research' ? 'Исследования' : 'Сервер данных',
      slots: slots(id, type === 'research' ? 2 : 1),
      scienceBuffer: 0, scienceReceived: 0, productionRate: 0, inputRate: 0,
    }
    this.nodes.set(id, node)
    return { ok: true, value: copyNode(node) }
  }

  hireCat(): CommandResult<Cat> {
    const rest = this.nodes.get(REST_ID)!
    const freeSlot = rest.slots.find((slot) => slot.catId === null && slot.reservedByCatId === null)
    if (!freeSlot) return { ok: false, reason: 'В комнате отдыха нет свободных мест.' }
    this.catCounter += 1
    const index = this.catCounter - 1
    const cat: Cat = {
      id: `cat-${this.catCounter}`, name: CAT_NAMES[index % CAT_NAMES.length], variant: CAT_VARIANTS[index % CAT_VARIANTS.length],
      nodeId: REST_ID, slotId: freeSlot.id, status: 'idle', travel: null,
    }
    freeSlot.catId = cat.id
    this.cats.set(cat.id, cat)
    return { ok: true, value: copyCat(cat) }
  }

  assignCat(catId: string, nodeId: string, slotId: string): CommandResult<void> {
    const cat = this.cats.get(catId)
    const node = this.nodes.get(nodeId)
    const targetSlot = node?.slots.find((slot) => slot.id === slotId)
    if (!cat) return { ok: false, reason: 'Кот не найден.' }
    if (cat.status === 'travelling') return { ok: false, reason: 'Кот уже находится в пути.' }
    if (!targetSlot) return { ok: false, reason: 'Рабочий слот не найден.' }
    if (targetSlot.catId || targetSlot.reservedByCatId) return { ok: false, reason: 'Этот слот уже занят или зарезервирован.' }
    if (cat.nodeId === nodeId) return { ok: false, reason: 'Кот уже находится в этом модуле.' }
    return this.startTravel(cat, nodeId, targetSlot.id)
  }

  releaseCat(catId: string): CommandResult<void> {
    const cat = this.cats.get(catId)
    if (!cat) return { ok: false, reason: 'Кот не найден.' }
    if (cat.status === 'travelling') return { ok: false, reason: 'Кот уже находится в пути.' }
    if (cat.nodeId === REST_ID) return { ok: false, reason: 'Кот уже отдыхает.' }
    const restSlot = this.nodes.get(REST_ID)!.slots.find((slot) => slot.catId === null && slot.reservedByCatId === null)
    if (!restSlot) return { ok: false, reason: 'В комнате отдыха нет свободных мест.' }
    return this.startTravel(cat, REST_ID, restSlot.id)
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
    const connection = { id: `science-${sourceId}-${targetId}`, sourceId, targetId, resource: 'scienceData' as const }
    this.connections.set(connection.id, connection)
    return { ok: true, value: { ...connection } }
  }

  disconnect(connectionId: string): CommandResult<void> {
    if (!this.connections.has(connectionId)) return { ok: false, reason: 'Канал данных не найден.' }
    this.connections.delete(connectionId)
    return { ok: true, value: undefined }
  }

  connectWorkerNodes(nodeAId: string, nodeBId: string, travelSeconds: number): CommandResult<WorkerLink> {
    if (!this.nodes.has(nodeAId) || !this.nodes.has(nodeBId)) return { ok: false, reason: 'Один из модулей не найден.' }
    if (nodeAId === nodeBId) return { ok: false, reason: 'Нельзя соединить модуль с самим собой.' }
    if (!Number.isFinite(travelSeconds) || travelSeconds <= 0) return { ok: false, reason: 'Время перехода должно быть положительным.' }
    const [first, second] = [nodeAId, nodeBId].sort()
    const id = `worker-${first}--${second}`
    if (this.workerLinks.has(id)) return { ok: false, reason: 'Переход между этими модулями уже существует.' }
    const link = { id, nodeAId: first, nodeBId: second, travelSeconds }
    this.workerLinks.set(id, link)
    return { ok: true, value: { ...link } }
  }

  disconnectWorkerLink(linkId: string): CommandResult<void> {
    if (!this.workerLinks.has(linkId)) return { ok: false, reason: 'Переход для котов не найден.' }
    if ([...this.cats.values()].some((cat) => cat.travel?.path.some((leg) => leg.linkId === linkId))) {
      return { ok: false, reason: 'Нельзя отключить переход, пока по нему идёт кот.' }
    }
    this.workerLinks.delete(linkId)
    return { ok: true, value: undefined }
  }

  updateWorkerLinkTravelTime(linkId: string, travelSeconds: number): CommandResult<void> {
    const link = this.workerLinks.get(linkId)
    if (!link) return { ok: false, reason: 'Переход для котов не найден.' }
    if (!Number.isFinite(travelSeconds) || travelSeconds <= 0) return { ok: false, reason: 'Время перехода должно быть положительным.' }
    link.travelSeconds = travelSeconds
    return { ok: true, value: undefined }
  }

  tick(deltaSeconds: number): CommandResult<void> {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) return { ok: false, reason: 'Время симуляции должно быть неотрицательным числом.' }
    const activeSecondsByNode = new Map<string, number>()
    for (const cat of this.cats.values()) {
      const activeSeconds = this.advanceCat(cat, deltaSeconds)
      if (activeSeconds > 0 && cat.status === 'idle') {
        activeSecondsByNode.set(cat.nodeId, Math.max(activeSecondsByNode.get(cat.nodeId) ?? 0, activeSeconds))
      }
    }
    for (const node of this.nodes.values()) {
      node.productionRate = 0
      node.inputRate = 0
      const activeSeconds = activeSecondsByNode.get(node.id) ?? 0
      if (node.type === 'research' && node.slots.some((slot) => slot.catId !== null)) {
        node.productionRate = 1
        node.scienceBuffer += activeSeconds
      }
    }
    const server = [...this.nodes.values()].find((node) => node.type === 'server')
    if (!server || deltaSeconds === 0) return { ok: true, value: undefined }
    const serverWorkerSeconds = activeSecondsByNode.get(server.id) ?? 0
    let remainingCapacity = 0.5 * deltaSeconds + 0.5 * serverWorkerSeconds
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

  private startTravel(cat: Cat, targetNodeId: string, targetSlotId: string): CommandResult<void> {
    const path = this.findPath(cat.nodeId, targetNodeId)
    if (!path) return { ok: false, reason: 'Нет маршрута для кота. Создайте двунаправленные переходы.' }
    const currentSlot = this.nodes.get(cat.nodeId)?.slots.find((slot) => slot.id === cat.slotId)
    const targetSlot = this.nodes.get(targetNodeId)?.slots.find((slot) => slot.id === targetSlotId)
    if (!currentSlot || !targetSlot) return { ok: false, reason: 'Назначение кота повреждено.' }
    currentSlot.catId = null
    targetSlot.reservedByCatId = cat.id
    cat.slotId = null
    cat.status = 'travelling'
    cat.travel = { targetNodeId, targetSlotId, path, legIndex: 0, legProgress: 0 }
    return { ok: true, value: undefined }
  }

  private findPath(startId: string, targetId: string): TravelLeg[] | null {
    const distances = new Map<string, number>([...this.nodes.keys()].map((id) => [id, Number.POSITIVE_INFINITY]))
    const paths = new Map<string, TravelLeg[]>()
    const visited = new Set<string>()
    distances.set(startId, 0)
    paths.set(startId, [])
    while (visited.size < this.nodes.size) {
      const current = [...this.nodes.keys()].filter((id) => !visited.has(id)).sort((a, b) => (distances.get(a)! - distances.get(b)!) || a.localeCompare(b))[0]
      if (!current || !Number.isFinite(distances.get(current)!)) break
      if (current === targetId) return paths.get(current) ?? []
      visited.add(current)
      const adjacent = [...this.workerLinks.values()].filter((link) => link.nodeAId === current || link.nodeBId === current).sort((a, b) => a.id.localeCompare(b.id))
      for (const link of adjacent) {
        const next = link.nodeAId === current ? link.nodeBId : link.nodeAId
        if (visited.has(next)) continue
        const candidateDistance = distances.get(current)! + link.travelSeconds
        const candidatePath = [...(paths.get(current) ?? []), { linkId: link.id, fromNodeId: current, toNodeId: next }]
        const oldPath = paths.get(next) ?? []
        const candidateKey = candidatePath.map((leg) => leg.linkId).join('|')
        const oldKey = oldPath.map((leg) => leg.linkId).join('|')
        if (candidateDistance < distances.get(next)! - EPSILON || (Math.abs(candidateDistance - distances.get(next)!) < EPSILON && candidateKey < oldKey)) {
          distances.set(next, candidateDistance)
          paths.set(next, candidatePath)
        }
      }
    }
    return null
  }

  private advanceCat(cat: Cat, deltaSeconds: number): number {
    if (cat.status !== 'travelling' || !cat.travel || deltaSeconds <= 0) return cat.status === 'idle' ? deltaSeconds : 0
    let remainingTime = deltaSeconds
    while (cat.travel && remainingTime > EPSILON) {
      const leg = cat.travel.path[cat.travel.legIndex]
      const link = leg && this.workerLinks.get(leg.linkId)
      if (!leg || !link) return 0
      const timeToFinish = link.travelSeconds * (1 - cat.travel.legProgress)
      if (remainingTime + EPSILON < timeToFinish) {
        cat.travel.legProgress += remainingTime / link.travelSeconds
        return 0
      }
      remainingTime -= timeToFinish
      cat.nodeId = leg.toNodeId
      cat.travel.legIndex += 1
      cat.travel.legProgress = 0
      if (cat.travel.legIndex < cat.travel.path.length) continue
      const targetSlot = this.nodes.get(cat.travel.targetNodeId)?.slots.find((slot) => slot.id === cat.travel?.targetSlotId)
      if (!targetSlot || targetSlot.reservedByCatId !== cat.id) return 0
      targetSlot.reservedByCatId = null
      targetSlot.catId = cat.id
      cat.nodeId = cat.travel.targetNodeId
      cat.slotId = targetSlot.id
      cat.status = 'idle'
      cat.travel = null
      return remainingTime
    }
    return 0
  }
}
