import type { Cat, CommandResult, Connection, NodeType, SimNode, SimulationSnapshot, TravelLeg, WorkerLink, WorkSlot } from './types'

const REST_ID = 'rest-1'
const CAT_NAMES = ['Мира', 'Нокс', 'Север', 'Иней', 'Пиксель']
const CAT_VARIANTS = ['◕', '◔', '◑', '◒', '◐']
const EPSILON = 0.000001
const MAX_VIGOR = 100
const WORK_VIGOR_DRAIN_PER_SECOND = 10
const REST_VIGOR_RECOVERY_PER_SECOND = 20

function slots(nodeId: string, amount: number): WorkSlot[] {
  return Array.from({ length: amount }, (_, index) => ({ id: `${nodeId}-slot-${index + 1}`, catId: null, reservedByCatId: null, assignedCatId: null }))
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
    this.addCat(MAX_VIGOR)
  }

  snapshot(): SimulationSnapshot {
    return {
      nodes: [...this.nodes.values()].map(copyNode),
      cats: [...this.cats.values()].map(copyCat),
      connections: [...this.connections.values()].map((connection) => ({ ...connection })),
      workerLinks: [...this.workerLinks.values()].map((link) => ({ ...link })),
    }
  }

  createNode(type: NodeType): CommandResult<SimNode> {
    let id: string
    do {
      this.nodeCounter += 1
      id = `${type}-${this.nodeCounter}`
    } while (this.nodes.has(id))
    const node: SimNode = {
      id, type, name: type === 'rest' ? 'Комната отдыха' : type === 'research' ? 'Исследования' : 'Сервер данных',
      slots: slots(id, type === 'rest' ? 3 : type === 'research' ? 2 : 1),
      scienceBuffer: 0, scienceReceived: 0, productionRate: 0, inputRate: 0,
    }
    this.nodes.set(id, node)
    return { ok: true, value: copyNode(node) }
  }

  deleteNode(nodeId: string): CommandResult<void> {
    const node = this.nodes.get(nodeId)
    if (!node) return { ok: false, reason: 'Модуль не найден.' }
    if (nodeId === REST_ID) return { ok: false, reason: 'Базовую комнату отдыха удалить нельзя.' }

    const linkedWorkerIds = new Set(
      [...this.workerLinks.values()]
        .filter((link) => link.nodeAId === nodeId || link.nodeBId === nodeId)
        .map((link) => link.id),
    )
    const catUsingNode = [...this.cats.values()].find((cat) =>
      cat.nodeId === nodeId
      || cat.travel?.targetNodeId === nodeId
      || cat.travel?.path.some((leg) => leg.fromNodeId === nodeId || leg.toNodeId === nodeId || linkedWorkerIds.has(leg.linkId)),
    )
    if (catUsingNode) return { ok: false, reason: `${catUsingNode.name} находится в модуле или следует через него.` }

    for (const connection of this.connections.values()) {
      if (connection.sourceId === nodeId || connection.targetId === nodeId) this.connections.delete(connection.id)
    }
    for (const linkId of linkedWorkerIds) this.workerLinks.delete(linkId)
    this.nodes.delete(nodeId)
    return { ok: true, value: undefined }
  }

  hireCat(): CommandResult<Cat> {
    return this.addCat(0)
  }

  private addCat(vigor: number): CommandResult<Cat> {
    this.catCounter += 1
    const index = this.catCounter - 1
    const cat: Cat = {
      id: `cat-${this.catCounter}`, name: CAT_NAMES[index % CAT_NAMES.length], variant: CAT_VARIANTS[index % CAT_VARIANTS.length],
      nodeId: REST_ID, slotId: null, status: 'idle', travel: null,
      vigor,
    }
    this.cats.set(cat.id, cat)
    this.seatWaitingCats()
    return { ok: true, value: copyCat(cat) }
  }

  assignCat(catId: string, nodeId: string, slotId: string): CommandResult<void> {
    const cat = this.cats.get(catId)
    const node = this.nodes.get(nodeId)
    const targetSlot = node?.slots.find((slot) => slot.id === slotId)
    if (!cat) return { ok: false, reason: 'Кот не найден.' }
    if (cat.status === 'travelling') return { ok: false, reason: 'Кот уже находится в пути.' }
    if (cat.vigor < MAX_VIGOR - EPSILON) return { ok: false, reason: 'Кот должен полностью восстановить бодрость перед работой.' }
    if (node?.type === 'rest') return { ok: false, reason: 'Для отдыха используйте возврат кота в комнату отдыха.' }
    if (!targetSlot) return { ok: false, reason: 'Рабочий слот не найден.' }
    if (targetSlot.catId || targetSlot.reservedByCatId) return { ok: false, reason: 'Этот слот уже занят или зарезервирован.' }
    if (cat.nodeId === nodeId) return { ok: false, reason: 'Кот уже находится в этом модуле.' }
    const result = this.startTravel(cat, nodeId, targetSlot.id)
    if (!result.ok) return result
    this.clearWorkAssignmentForCat(cat.id)
    targetSlot.assignedCatId = cat.id
    this.seatWaitingCats()
    return result
  }

  clearWorkAssignment(nodeId: string, slotId: string): CommandResult<void> {
    const node = this.nodes.get(nodeId)
    if (!node || node.type === 'rest') return { ok: false, reason: 'Рабочий слот не найден.' }
    const slot = node.slots.find((candidate) => candidate.id === slotId)
    if (!slot) return { ok: false, reason: 'Рабочий слот не найден.' }
    if (slot.catId || slot.reservedByCatId) return { ok: false, reason: 'Нельзя снять назначение с занятого слота.' }
    if (!slot.assignedCatId) return { ok: false, reason: 'У этого слота нет назначения.' }
    slot.assignedCatId = null
    return { ok: true, value: undefined }
  }

  releaseCat(catId: string): CommandResult<void> {
    const cat = this.cats.get(catId)
    if (!cat) return { ok: false, reason: 'Кот не найден.' }
    if (cat.status === 'travelling') return { ok: false, reason: 'Кот уже находится в пути.' }
    if (this.nodes.get(cat.nodeId)?.type === 'rest') return { ok: false, reason: 'Кот уже отдыхает.' }
    const restSlot = this.findRestSeat()
    if (!restSlot) return { ok: false, reason: 'В комнате отдыха нет доступного кресла.' }
    return this.startTravel(cat, restSlot.node.id, restSlot.slot.id)
  }

  connect(sourceId: string, targetId: string): CommandResult<Connection> {
    const source = this.nodes.get(sourceId)
    const target = this.nodes.get(targetId)
    if (source?.type !== 'research' || target?.type !== 'server') {
      return { ok: false, reason: 'Разрешена только связь: Исследования → Сервер данных.' }
    }
    const connection = { id: `science-${sourceId}-${targetId}`, sourceId, targetId, resource: 'scienceData' as const }
    if (this.connections.has(connection.id)) {
      return { ok: false, reason: 'Этот канал данных уже существует.' }
    }
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
      if (activeSeconds <= 0) continue
      if (this.nodes.get(cat.nodeId)?.type === 'rest') {
        if (!cat.slotId) continue
        cat.vigor = Math.min(MAX_VIGOR, cat.vigor + activeSeconds * REST_VIGOR_RECOVERY_PER_SECOND)
        continue
      }
      const workSeconds = Math.min(activeSeconds, cat.vigor / WORK_VIGOR_DRAIN_PER_SECOND)
      if (workSeconds > 0) {
        activeSecondsByNode.set(cat.nodeId, Math.max(activeSecondsByNode.get(cat.nodeId) ?? 0, workSeconds))
        cat.vigor = Math.max(0, cat.vigor - workSeconds * WORK_VIGOR_DRAIN_PER_SECOND)
      }
      if (cat.vigor <= EPSILON) {
        this.returnTiredCat(cat)
      }
    }
    this.seatWaitingCats()
    this.returnRecoveredCatsToAssignedSlots()
    for (const node of this.nodes.values()) {
      node.productionRate = 0
      node.inputRate = 0
      const activeSeconds = activeSecondsByNode.get(node.id) ?? 0
      if (node.type === 'research' && activeSeconds > 0) {
        node.productionRate = 1
        node.scienceBuffer += activeSeconds
      }
    }
    if (deltaSeconds === 0) return { ok: true, value: undefined }
    for (const server of this.nodes.values()) {
      if (server.type !== 'server') continue
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
    }
    return { ok: true, value: undefined }
  }

  private startTravel(cat: Cat, targetNodeId: string, targetSlotId: string): CommandResult<void> {
    const path = this.findPath(cat.nodeId, targetNodeId)
    if (!path) return { ok: false, reason: 'Нет маршрута для кота. Создайте двунаправленные переходы.' }
    const currentSlot = cat.slotId ? this.nodes.get(cat.nodeId)?.slots.find((slot) => slot.id === cat.slotId) : null
    const targetSlot = this.nodes.get(targetNodeId)?.slots.find((slot) => slot.id === targetSlotId)
    if (!targetSlot) return { ok: false, reason: 'Назначение кота повреждено.' }
    if (currentSlot) currentSlot.catId = null
    targetSlot.reservedByCatId = cat.id
    cat.slotId = null
    cat.status = 'travelling'
    cat.travel = { targetNodeId, targetSlotId, path, legIndex: 0, legProgress: 0 }
    return { ok: true, value: undefined }
  }

  private returnTiredCat(cat: Cat) {
    const restSlot = this.findRestSeat()
    if (restSlot) this.startTravel(cat, restSlot.node.id, restSlot.slot.id)
  }

  private returnRecoveredCatsToAssignedSlots() {
    for (const cat of this.cats.values()) {
      if (cat.status !== 'idle' || this.nodes.get(cat.nodeId)?.type !== 'rest' || cat.vigor < MAX_VIGOR - EPSILON) continue
      const assignment = this.findWorkAssignment(cat.id)
      if (!assignment || assignment.slot.catId || assignment.slot.reservedByCatId) continue
      this.startTravel(cat, assignment.node.id, assignment.slot.id)
    }
  }

  private findWorkAssignment(catId: string): { node: SimNode; slot: WorkSlot } | null {
    for (const node of this.nodes.values()) {
      if (node.type === 'rest') continue
      const slot = node.slots.find((candidate) => candidate.assignedCatId === catId)
      if (slot) return { node, slot }
    }
    return null
  }

  private findRestSeat(): { node: SimNode; slot: WorkSlot } | null {
    for (const node of this.nodes.values()) {
      if (node.type !== 'rest') continue
      const slot = node.slots.find((candidate) => !candidate.catId && !candidate.reservedByCatId)
      if (slot) return { node, slot }
    }
    return null
  }

  private seatWaitingCats() {
    for (const cat of this.cats.values()) {
      if (cat.status !== 'idle' || this.nodes.get(cat.nodeId)?.type !== 'rest' || cat.slotId) continue
      const restSeat = this.findRestSeat()
      if (!restSeat) break
      restSeat.slot.catId = cat.id
      cat.nodeId = restSeat.node.id
      cat.slotId = restSeat.slot.id
    }
  }

  private clearWorkAssignmentForCat(catId: string) {
    for (const node of this.nodes.values()) {
      if (node.type === 'rest') continue
      for (const slot of node.slots) {
        if (slot.assignedCatId === catId) slot.assignedCatId = null
      }
    }
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
