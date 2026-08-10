<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ConnectionMode, MarkerType, VueFlow, type Connection as FlowConnection, type Edge, type EdgeMouseEvent, type Node, type NodeDragEvent, type NodeMouseEvent } from '@vue-flow/core'
import { GAME_BALANCE, Simulation, type Cat, type CommandResult, type NodeType, type RoadPort, type SimNode } from './core'
import GameNode from './components/GameNode.vue'
import CatFlightEdge from './components/CatFlightEdge.vue'
import WorkerTransitEdge from './components/WorkerTransitEdge.vue'

type Point = { x: number; y: number }
type Size = { width: number; height: number }
type SimulationSpeed = 0 | 1 | 5 | 10 | 100

const SAVE_KEY = 'catmand-save-v1'
const SAVE_WARNING_KEY = 'catmand-save-warning-acknowledged'
let initialSaveError = ''
let invalidStoredSave = ''
let simulation = new Simulation()
if (typeof window !== 'undefined') {
  const stored = window.localStorage.getItem(SAVE_KEY)
  if (stored) {
    try {
      const restored = Simulation.fromSave(JSON.parse(stored))
      if (restored.ok) simulation = restored.value
      else {
        initialSaveError = restored.reason
        invalidStoredSave = stored
      }
    } catch {
      initialSaveError = 'Локальное сохранение повреждено. Экспортируйте его или начните заново.'
      invalidStoredSave = stored
    }
  }
}
const nodeTypes = { game: markRaw(GameNode) }
const edgeTypes = { workerTransit: markRaw(WorkerTransitEdge), flightTransit: markRaw(CatFlightEdge) }
const snapshot = ref(simulation.snapshot())
const selectedCatId = ref<string | null>(null)
const selectedSlot = ref<{ nodeId: string; slotId: string } | null>(null)
const selectedConnection = ref<{ id: string; kind: 'data' | 'worker' } | null>(null)
const selectedModuleId = ref<string | null>(null)
const status = ref(initialSaveError || 'Создайте лабораторию и назначьте кота на исследование.')
const saveError = ref(initialSaveError)
const showEarlyWarning = ref(typeof window !== 'undefined' && window.localStorage.getItem(SAVE_WARNING_KEY) !== '1')
const simulationSpeed = ref<SimulationSpeed>(1)
const diagnosticSpeedUnlocked = ref(false)
const normalSpeedOptions: Array<{ value: SimulationSpeed; label: string }> = [
  { value: 0, label: 'Пауза' },
  { value: 1, label: '×1' },
  { value: 5, label: '×5' },
  { value: 10, label: '×10' },
]
const speedOptions = computed(() => diagnosticSpeedUnlocked.value ? [...normalSpeedOptions, { value: 100 as const, label: '×100' }] : normalSpeedOptions)
const positions = ref<Record<string, Point>>(Object.fromEntries(simulation.snapshot().nodes.map((node) => [node.id, node.position ?? { x: 0, y: 0 }])))

const catIndex = computed<Record<string, Cat>>(() => Object.fromEntries(snapshot.value.cats.map((cat) => [cat.id, cat])))
const assignedCatIds = computed(() => new Set(snapshot.value.nodes.flatMap((node) => node.slots.flatMap((slot) => slot.assignedCatId ? [slot.assignedCatId] : []))))
const unassignedRestCatIds = computed(() => snapshot.value.cats.flatMap((cat) => {
  const currentNode = snapshot.value.nodes.find((node) => node.id === cat.nodeId)
  return cat.status === 'idle' && cat.slotId && currentNode?.type === 'rest' && !assignedCatIds.value.has(cat.id) ? [cat.id] : []
}))
const unreachableCatIds = computed(() => snapshot.value.nodes.flatMap((node) => node.type === 'rest' || node.type === 'hub' ? [] : node.slots.flatMap((slot) => {
  const cat = slot.assignedCatId ? catIndex.value[slot.assignedCatId] : undefined
  return !slot.catId
    && !slot.reservedByCatId
    && cat?.status === 'idle'
    && cat.vigor >= GAME_BALANCE.cats.maxVigor
    && cat.nodeId !== node.id
    ? [cat.id]
    : []
})))
const canHireCat = computed(() => snapshot.value.economy.credits >= GAME_BALANCE.economy.hireCatCost)
const totalScience = computed(() => snapshot.value.scienceProgress)
const totalData = computed(() => snapshot.value.nodes.reduce((total, node) => total + node.dataBuffer + node.dataStored, 0))
const selectedCat = computed(() => selectedCatId.value ? catIndex.value[selectedCatId.value] : undefined)
const canDismissSelectedCat = computed(() => Boolean(selectedCat.value && selectedCat.value.id !== 'cat-1'))

function nodePosition(node: SimNode): Point {
  if (positions.value[node.id]) return positions.value[node.id]
  return node.position && (node.position.x || node.position.y) ? node.position : defaultNodePosition(node.type)
}

function defaultNodePosition(type: NodeType): Point {
  const count = snapshot.value.nodes.filter((node) => node.type === type).length
  const offset = count * 55
  if (type === 'rest') return { x: 80 + offset, y: 270 + offset }
  if (type === 'research') return { x: 440 + offset, y: 150 + offset }
  if (type === 'server') return { x: 805 + offset, y: 300 + offset }
  if (type === 'terminal') return { x: 440 + offset, y: 450 + offset }
  return { x: 620 + offset, y: 500 + offset }
}

function nodeSize(type: NodeType): Size {
  return type === 'hub' ? { width: 76, height: 76 } : { width: 286, height: 220 }
}

function overlaps(first: Point, firstSize: Size, second: Point, secondSize: Size) {
  return first.x < second.x + secondSize.width
    && first.x + firstSize.width > second.x
    && first.y < second.y + secondSize.height
    && first.y + firstSize.height > second.y
}

function overlappingNodeIds() {
  const blocked = new Set<string>()
  for (let firstIndex = 0; firstIndex < snapshot.value.nodes.length; firstIndex += 1) {
    const first = snapshot.value.nodes[firstIndex]
    for (const second of snapshot.value.nodes.slice(firstIndex + 1)) {
      if (!overlaps(nodePosition(first), nodeSize(first.type), nodePosition(second), nodeSize(second.type))) continue
      blocked.add(first.id)
      blocked.add(second.id)
    }
  }
  return blocked
}

function syncBlockedNodes() {
  const blockedIds = overlappingNodeIds()
  for (const node of snapshot.value.nodes) simulation.setNodeBlocked(node.id, blockedIds.has(node.id))
  sync()
}

const flowNodes = computed<Node[]>(() => {
  const moduleNodes: Node[] = snapshot.value.nodes.map((node) => ({
    id: node.id,
    type: 'game',
    position: nodePosition(node),
    style: { width: `${nodeSize(node.type).width}px` },
    selected: selectedModuleId.value === node.id,
    data: {
      node,
      blocked: node.blocked,
      cats: catIndex.value,
      unreachableCatIds: unreachableCatIds.value,
      unassignedRestCatIds: unassignedRestCatIds.value,
      restWaitingCats: node.type === 'rest' ? snapshot.value.cats.filter((cat) => cat.nodeId === node.id && !cat.slotId && cat.status === 'idle') : [],
      strandedCats: snapshot.value.cats.filter((cat) => cat.nodeId === node.id && cat.status === 'stranded'),
      selectedCatId: selectedCatId.value,
      selectedSlotId: selectedSlot.value?.slotId ?? null,
      onCatClick: selectCat,
      onSlotClick: handleSlotClick,
    },
  }))
  return moduleNodes
})

const flowEdges = computed<Edge[]>(() => {
  const dataEdges: Edge[] = snapshot.value.connections.map((connection) => ({
    id: connection.id, source: connection.sourceId, target: connection.targetId, sourceHandle: 'data-out', targetHandle: 'data-in',
    type: 'smoothstep', animated: true, markerEnd: MarkerType.ArrowClosed, class: 'science-edge', selected: selectedConnection.value?.id === connection.id, data: { kind: 'data' },
  }))
  const workerEdges: Edge[] = snapshot.value.workerLinks.map((link) => ({
    id: link.id, source: link.nodeAId, target: link.nodeBId, sourceHandle: roadHandle(link.nodeAPort), targetHandle: roadHandle(link.nodeBPort),
    type: 'workerTransit', animated: false, markerStart: MarkerType.ArrowClosed, markerEnd: MarkerType.ArrowClosed, class: 'worker-edge',
    selected: selectedConnection.value?.id === link.id, label: `${link.travelSeconds.toFixed(1)}с`,
    data: { kind: 'worker', cats: snapshot.value.cats.filter((cat) => cat.travel?.kind === 'road' && cat.travel.leg.linkId === link.id) },
  }))
  const flightEdges: Edge[] = snapshot.value.cats.flatMap((cat) => {
    const travel = cat.travel
    if (travel?.kind !== 'flight') return []
    const fromNode = snapshot.value.nodes.find((node) => node.id === travel.fromNodeId)
    const targetNode = snapshot.value.nodes.find((node) => node.id === travel.targetNodeId)
    if (!fromNode || !targetNode) return []
    return [{
      id: `flight-${cat.id}`,
      source: fromNode.id,
      target: targetNode.id,
      type: 'flightTransit',
      class: 'flight-edge',
      zIndex: 1000,
      selectable: false,
      focusable: false,
      data: {
        kind: 'flight',
        cat,
        origin: flightSlotPoint(fromNode, travel.fromSlotId),
        targetPoint: flightSlotPoint(targetNode, travel.targetSlotId),
      },
    }]
  })
  return [...dataEdges, ...workerEdges, ...(simulationSpeed.value === 1 ? flightEdges : [])]
})

const renderedEdges = ref<Edge[]>([])
watch(flowEdges, (edges) => { renderedEdges.value = edges }, { immediate: true })

function roadHandle(port: RoadPort) {
  return port === 'road' ? 'road' : `hub-${port}`
}

function roadPort(handle: string | null | undefined): RoadPort | null {
  if (handle === 'road') return 'road'
  const match = handle?.match(/^hub-(north|east|south|west)$/)
  return match?.[1] as RoadPort | undefined ?? null
}

function workerTravelSeconds(firstId: string, secondId: string) {
  const first = nodePosition(snapshot.value.nodes.find((node) => node.id === firstId)!)
  const second = nodePosition(snapshot.value.nodes.find((node) => node.id === secondId)!)
  return Math.max(GAME_BALANCE.transport.minimumRoadTravelSeconds, Math.hypot(second.x - first.x, second.y - first.y) / GAME_BALANCE.transport.roadSpeedPixelsPerSecond)
}

function flightSlotPoint(node: SimNode, slotId: string | null): Point {
  const position = nodePosition(node)
  const slotIndex = slotId ? node.slots.findIndex((slot) => slot.id === slotId) : -1
  if (slotIndex < 0) return { x: position.x + nodeSize(node.type).width / 2, y: position.y + nodeSize(node.type).height / 2 }
  const columns = node.type === 'research' ? 2 : node.type === 'server' || node.type === 'terminal' ? 1 : 3
  const gridWidth = nodeSize(node.type).width - 32
  const gap = 7
  const cellWidth = (gridWidth - gap * (columns - 1)) / columns
  return {
    x: position.x + 16 + cellWidth * (slotIndex % columns + .5) + gap * (slotIndex % columns),
    y: position.y + 117,
  }
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null
let autosaveEnabled = !initialSaveError

function saveLocalNow() {
  if (!autosaveEnabled || typeof window === 'undefined') return
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(simulation.exportSave()))
}

function scheduleAutosave() {
  if (!autosaveEnabled || autosaveTimer) return
  autosaveTimer = setTimeout(() => {
    autosaveTimer = null
    saveLocalNow()
  }, 750)
}

function sync() {
  snapshot.value = simulation.snapshot()
  scheduleAutosave()
}

function report(result: CommandResult<unknown>, success: string) {
  if (result.ok) {
    status.value = success
    sync()
  } else {
    status.value = result.reason
  }
}

function createNode(type: NodeType) {
  const result = simulation.createNode(type)
  if (result.ok) {
    positions.value[result.value.id] = defaultNodePosition(type)
    simulation.setNodePosition(result.value.id, positions.value[result.value.id])
    sync()
    syncBlockedNodes()
  }
  report(result, type === 'rest' ? 'Комната отдыха развёрнута: добавлены три кресла для котов.' : type === 'research' ? 'Исследовательский модуль развёрнут.' : type === 'server' ? 'Сервер данных подключён к лаборатории.' : type === 'terminal' ? 'Торговый терминал готов продавать данные.' : 'Дорожный хаб развёрнут.')
}

function catPoint(cat: Cat): Point {
  if (cat.travel) {
    const fromId = cat.travel.kind === 'road' ? cat.travel.leg.fromNodeId : cat.travel.fromNodeId
    const toId = cat.travel.kind === 'road' ? cat.travel.leg.toNodeId : cat.travel.targetNodeId
    const progress = cat.travel.kind === 'road' ? cat.travel.legProgress : cat.travel.flightProgress
    const from = nodePosition(snapshot.value.nodes.find((node) => node.id === fromId)!)
    const to = nodePosition(snapshot.value.nodes.find((node) => node.id === toId)!)
    return { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress }
  }
  return nodePosition(snapshot.value.nodes.find((node) => node.id === cat.nodeId)!)
}

function rescueHubMap(hubId: string, catIds: string[]) {
  const hubs = snapshot.value.nodes.filter((node) => node.type === 'hub' && node.id !== hubId)
  return Object.fromEntries(catIds.flatMap((catId) => {
    const cat = catIndex.value[catId]
    if (!cat || !hubs.length) return []
    const point = catPoint(cat)
    const nearest = [...hubs].sort((first, second) => Math.hypot(point.x - nodePosition(first).x, point.y - nodePosition(first).y) - Math.hypot(point.x - nodePosition(second).x, point.y - nodePosition(second).y) || first.id.localeCompare(second.id))[0]
    return [[catId, nearest.id]]
  }))
}

function deleteSelectedNode() {
  const nodeId = selectedModuleId.value
  if (!nodeId) return
  const nodeName = snapshot.value.nodes.find((node) => node.id === nodeId)?.name ?? 'Модуль'
  const removesSelectedConnection = Boolean(
    selectedConnection.value
    && ([...snapshot.value.connections, ...snapshot.value.workerLinks] as Array<{ id: string; sourceId?: string; targetId?: string; nodeAId?: string; nodeBId?: string }>).some((connection) =>
      connection.id === selectedConnection.value?.id
      && (connection.sourceId === nodeId || connection.targetId === nodeId || connection.nodeAId === nodeId || connection.nodeBId === nodeId),
    ),
  )
  const selectedNode = snapshot.value.nodes.find((node) => node.id === nodeId)
  const impact = selectedNode?.type === 'hub' ? simulation.hubDeletionImpact(nodeId) : null
  const result = selectedNode?.type === 'hub' && impact?.ok
    ? simulation.deleteRoadHub(nodeId, rescueHubMap(nodeId, impact.value))
    : simulation.deleteNode(nodeId)
  if (result.ok) {
    delete positions.value[nodeId]
    if (selectedSlot.value?.nodeId === nodeId) selectedSlot.value = null
    if (removesSelectedConnection) selectedConnection.value = null
    selectedModuleId.value = null
  }
  report(result, selectedNode?.type === 'hub' ? `${nodeName} удалён; затронутые коты остановлены у ближайших хабов.` : `${nodeName} удалён вместе со всеми связанными каналами; затронутые коты эвакуированы или перенаправлены.`)
  if (result.ok) syncBlockedNodes()
}

function hireCat() {
  const result = simulation.hireCat()
  report(result, result.ok && !result.value.slotId ? `${result.value.name} ожидает свободное кресло для восстановления.` : 'Новый кот-оператор начал восстановление в комнате отдыха.')
}

function dismissSelectedCat() {
  if (!selectedCat.value) return
  const name = selectedCat.value.name
  const result = simulation.dismissCat(selectedCat.value.id)
  if (result.ok) selectedCatId.value = null
  report(result, `${name} получил компенсацию и покинул лабораторию.`)
}

function assignCatToWorkSlot(catId: string, nodeId: string, slotId: string) {
  const cat = catIndex.value[catId]
  const nodeName = snapshot.value.nodes.find((node) => node.id === nodeId)?.name ?? 'узел'
  const result = simulation.assignCat(catId, nodeId, slotId)
  const updatedCat = result.ok ? simulation.snapshot().cats.find((candidate) => candidate.id === catId) : undefined
  const activeTargetNode = updatedCat
    ? snapshot.value.nodes.find((node) => node.id === (updatedCat.travel?.targetNodeId ?? updatedCat.stranded?.targetNodeId))
    : undefined
  const success = activeTargetNode?.type === 'rest'
    ? `${cat?.name ?? 'Кот'} закреплён за местом в модуле «${nodeName}» и отправится туда после отдыха.`
    : updatedCat?.status === 'stranded'
    ? `${cat?.name ?? 'Кот'} переназначен, но путь к новому месту недоступен.`
    : updatedCat?.status === 'travelling'
    ? `${cat?.name ?? 'Кот'} закреплён за местом и идёт к модулю: ${nodeName}.`
    : updatedCat?.nodeId === nodeId && updatedCat.slotId === slotId
      ? `${cat?.name ?? 'Кот'} переназначен на новое место в этом модуле.`
    : (updatedCat?.vigor ?? 0) < GAME_BALANCE.cats.maxVigor
      ? `${cat?.name ?? 'Кот'} закреплён за местом и отправится после полного восстановления.`
      : `${cat?.name ?? 'Кот'} закреплён за местом, но пока не может дойти: слот отмечен красным.`
  report(result, success)
  return result.ok
}

function selectCat(catId: string) {
  const cat = catIndex.value[catId]
  if (selectedSlot.value) {
    const target = selectedSlot.value
    if (assignCatToWorkSlot(catId, target.nodeId, target.slotId)) {
      selectedSlot.value = null
      selectedCatId.value = null
    }
    return
  }
  selectedCatId.value = selectedCatId.value === catId ? null : catId
  const currentNode = snapshot.value.nodes.find((node) => node.id === cat.nodeId)
  const activeTargetNode = snapshot.value.nodes.find((node) => node.id === (cat.travel?.targetNodeId ?? cat.stranded?.targetNodeId))
  status.value = selectedCatId.value
    ? activeTargetNode?.type === 'rest'
      ? `${cat.name} выбран. Выберите рабочее место для назначения после отдыха.`
      : activeTargetNode && activeTargetNode.type !== 'hub'
        ? `${cat.name} выбран. Выберите новую рабочую цель или нажмите текущую цель ещё раз, чтобы отменить её.`
        : currentNode?.type !== 'rest' && currentNode?.type !== 'hub' && cat.slotId
      ? `${cat.name} выбран. Выберите новое рабочее место или нажмите текущий слот ещё раз, чтобы отправить кота отдыхать.`
      : `${cat.name} выбран. Кликните по рабочему слоту.`
    : 'Выбор кота отменён.'
}

function handleSlotClick(nodeId: string, slotId: string, occupiedCatId: string | null, reservedCatId: string | null, assignedCatId: string | null) {
  const targetNode = snapshot.value.nodes.find((node) => node.id === nodeId)
  const representedCatId = occupiedCatId ?? reservedCatId ?? assignedCatId
  if (representedCatId) {
    if (selectedCatId.value !== representedCatId) {
      selectCat(representedCatId)
      return
    }
    if (occupiedCatId && targetNode?.type !== 'rest' && targetNode?.type !== 'hub') {
      const cat = catIndex.value[representedCatId]
      const result = simulation.releaseCat(representedCatId)
      const updatedCat = result.ok ? simulation.snapshot().cats.find((candidate) => candidate.id === occupiedCatId) : undefined
      report(result, updatedCat?.status === 'travelling'
        ? `${cat?.name ?? 'Кот'} снят с работы и идёт отдыхать.`
        : `${cat?.name ?? 'Кот'} снят с работы, но путь к отдыху недоступен.`)
      if (result.ok) selectedCatId.value = null
      return
    }
    if (reservedCatId) {
      if (targetNode?.type === 'rest') {
        status.value = `${catIndex.value[representedCatId]?.name ?? 'Кот'} продолжает путь на отдых. Выберите рабочее место для будущего назначения.`
        return
      }
      const cat = catIndex.value[representedCatId]
      const result = simulation.cancelCatWorkDestination(representedCatId)
      report(result, `${cat?.name ?? 'Кот'} больше не следует к прежней цели и возвращается отдыхать.`)
      if (result.ok) selectedCatId.value = null
      return
    }
    if (assignedCatId && targetNode?.type !== 'rest' && targetNode?.type !== 'hub') {
      const cat = catIndex.value[representedCatId]
      const result = simulation.clearWorkAssignment(nodeId, slotId)
      report(result, `${cat?.name ?? 'Кот'} больше не закреплён за этим местом.`)
      if (result.ok) selectedCatId.value = null
      return
    }
    selectCat(representedCatId)
    return
  }
  if (targetNode?.type === 'rest') {
    status.value = 'Все кресла в комнате отдыха используются совместно.'
    return
  }
  if (!selectedCatId.value) {
    const wasSelected = selectedSlot.value?.slotId === slotId
    selectedSlot.value = wasSelected ? null : { nodeId, slotId }
    status.value = wasSelected ? 'Выбор слота отменён.' : 'Слот выбран. Теперь выберите кота.'
    return
  }
  if (assignCatToWorkSlot(selectedCatId.value, nodeId, slotId)) selectedCatId.value = null
}

function cancelCatSelection(event: KeyboardEvent) {
  if (event.key !== 'Escape' || (!selectedCatId.value && !selectedSlot.value)) return
  selectedCatId.value = null
  selectedSlot.value = null
  status.value = 'Выбор кота или слота отменён.'
}

function onConnect(connection: FlowConnection) {
  if (!connection.source || !connection.target) return
  const sourcePort = roadPort(connection.sourceHandle)
  const targetPort = roadPort(connection.targetHandle)
  if (sourcePort && targetPort) {
    report(simulation.connectWorkerNodes(connection.source, connection.target, workerTravelSeconds(connection.source, connection.target), sourcePort, targetPort), 'Двунаправленный переход для котов создан.')
    return
  }
  if (connection.sourceHandle === 'data-out' && connection.targetHandle === 'data-in') {
    report(simulation.connect(connection.source, connection.target), 'Направленный канал данных установлен.')
  }
}

function selectConnection(event: EdgeMouseEvent) {
  if (selectedConnection.value?.id === event.edge.id) {
    selectedConnection.value = null
    status.value = 'Выбор связи отменён.'
    return
  }
  selectedConnection.value = { id: event.edge.id, kind: event.edge.data?.kind === 'worker' ? 'worker' : 'data' }
  status.value = selectedConnection.value.kind === 'worker' ? 'Переход для котов выбран. Его можно отключить в панели.' : 'Канал данных выбран. Его можно отключить в панели.'
}

function selectModule(event: NodeMouseEvent) {
  if (event.node.data.node.blocked) {
    status.value = `${event.node.data.node.name} перекрыт другим узлом. Переместите его, чтобы восстановить доступ.`
    return
  }
  const isSelected = selectedModuleId.value === event.node.id
  selectedModuleId.value = isSelected ? null : event.node.id
  status.value = isSelected ? 'Выбор модуля отменён.' : `${event.node.data.node.name} выбран.`
}

function disconnectSelected() {
  if (!selectedConnection.value) return
  const current = selectedConnection.value
  report(current.kind === 'worker' ? simulation.disconnectWorkerLink(current.id) : simulation.disconnect(current.id), current.kind === 'worker' ? 'Переход для котов отключён.' : 'Канал данных отключён.')
  selectedConnection.value = null
}

function updateNodePosition(event: NodeDragEvent) {
  const node = snapshot.value.nodes.find((candidate) => candidate.id === event.node.id)
  if (!node) return
  positions.value[event.node.id] = { ...event.node.position }
  simulation.setNodePosition(event.node.id, positions.value[event.node.id])
  for (const link of snapshot.value.workerLinks) {
    simulation.updateWorkerLinkTravelTime(link.id, workerTravelSeconds(link.nodeAId, link.nodeBId))
  }
  syncBlockedNodes()
}

function isValidConnection(connection: FlowConnection) {
  if (!connection.source || !connection.target || connection.source === connection.target) return false
  const flowEdge = connection as Edge
  if (flowEdge.id?.startsWith('flight-') || flowEdge.data?.kind === 'flight') return true
  if (connection.sourceHandle === 'data-out' && connection.targetHandle === 'data-in') {
    const isExistingDataConnection = snapshot.value.connections.some((candidate) =>
      candidate.sourceId === connection.source && candidate.targetId === connection.target,
    )
    return isExistingDataConnection || simulation.canConnect(connection.source, connection.target).ok
  }
  const sourcePort = roadPort(connection.sourceHandle)
  const targetPort = roadPort(connection.targetHandle)
  if (!sourcePort || !targetPort) return false
  if (snapshot.value.nodes.find((node) => node.id === connection.source)?.blocked || snapshot.value.nodes.find((node) => node.id === connection.target)?.blocked) return false
  const isExistingRoad = snapshot.value.workerLinks.some((link) =>
    (link.nodeAId === connection.source && link.nodeAPort === sourcePort && link.nodeBId === connection.target && link.nodeBPort === targetPort)
    || (link.nodeBId === connection.source && link.nodeBPort === sourcePort && link.nodeAId === connection.target && link.nodeAPort === targetPort),
  )
  if (isExistingRoad) return true
  return !snapshot.value.workerLinks.some((link) =>
    (link.nodeAId === connection.source && link.nodeAPort === sourcePort)
    || (link.nodeBId === connection.source && link.nodeBPort === sourcePort)
    || (link.nodeAId === connection.target && link.nodeAPort === targetPort)
    || (link.nodeBId === connection.target && link.nodeBPort === targetPort),
  )
}

function setSimulationSpeed(speed: SimulationSpeed) {
  simulationSpeed.value = speed
  status.value = speed === 0 ? 'Симуляция поставлена на паузу.' : `Скорость симуляции: ×${speed}.`
}

function unlockDiagnosticSpeed() {
  if (diagnosticSpeedUnlocked.value) return
  diagnosticSpeedUnlocked.value = true
  status.value = 'Диагностический режим открыт: доступна скорость ×100.'
}

function downloadText(contents: string, filename: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function exportGame() {
  downloadText(JSON.stringify(simulation.exportSave(), null, 2), 'catmand-save-v1.json')
  status.value = 'Сохранение выгружено в JSON.'
}

function exportInvalidSave() {
  if (!invalidStoredSave) return
  downloadText(invalidStoredSave, 'catmand-incompatible-save.json')
}

function resetTransientState() {
  selectedCatId.value = null
  selectedSlot.value = null
  selectedConnection.value = null
  selectedModuleId.value = null
  simulationSpeed.value = 1
  positions.value = Object.fromEntries(simulation.snapshot().nodes.map((node) => [node.id, node.position ?? { x: 0, y: 0 }]))
}

async function importGame(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const text = await file.text()
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    saveError.value = 'Файл не является корректным JSON. Текущая игра сохранена.'
    invalidStoredSave = text
    return
  }
  const restored = Simulation.fromSave(parsed)
  if (!restored.ok) {
    saveError.value = `${restored.reason} Текущая игра сохранена.`
    invalidStoredSave = text
    return
  }
  simulation = restored.value
  autosaveEnabled = true
  invalidStoredSave = ''
  saveError.value = ''
  resetTransientState()
  sync()
  saveLocalNow()
  status.value = 'Сохранение успешно загружено.'
}

function resetGame() {
  if (!window.confirm('Сбросить лабораторию и начать заново?')) return
  simulation = new Simulation()
  autosaveEnabled = true
  invalidStoredSave = ''
  saveError.value = ''
  window.localStorage.removeItem(SAVE_KEY)
  resetTransientState()
  sync()
  saveLocalNow()
  status.value = 'Создана новая лаборатория.'
}

function acknowledgeEarlyWarning() {
  showEarlyWarning.value = false
  window.localStorage.setItem(SAVE_WARNING_KEY, '1')
}

let frame = 0
let previousTime = 0
function animate(time: number) {
  const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.25) : 0
  previousTime = time
  const delta = elapsed * simulationSpeed.value
  if (delta > 0) {
    const wasFlightUnlocked = snapshot.value.flightUnlocked
    const travellingCats = new Set(snapshot.value.cats.filter((cat) => cat.status === 'travelling').map((cat) => cat.id))
    simulation.tick(delta)
    sync()
    const arrivedCat = snapshot.value.cats.find((cat) => travellingCats.has(cat.id) && cat.status === 'idle')
    if (!wasFlightUnlocked && snapshot.value.flightUnlocked) {
      simulationSpeed.value = 1
      status.value = 'Научный прорыв: коты получили возможность летать напрямую между модулями. Скорость снижена до ×1.'
    }
    else if (arrivedCat) status.value = `${arrivedCat.name} прибыл: ${snapshot.value.nodes.find((node) => node.id === arrivedCat.nodeId)?.name ?? 'модуль'}.`
  }
  frame = requestAnimationFrame(animate)
}

onMounted(() => {
  window.addEventListener('keydown', cancelCatSelection)
  frame = requestAnimationFrame(animate)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', cancelCatSelection)
  cancelAnimationFrame(frame)
  if (autosaveTimer) clearTimeout(autosaveTimer)
  saveLocalNow()
})
</script>

<template>
  <main class="app-shell" @contextmenu.prevent>
    <div v-if="showEarlyWarning" class="early-warning">
      <span>РАННЯЯ РАЗРАБОТКА · сохранения могут стать несовместимыми с будущими версиями.</span>
      <button type="button" @click="acknowledgeEarlyWarning">Понятно</button>
    </div>
    <div v-if="saveError" class="save-error">
      <span>{{ saveError }}</span>
      <button v-if="invalidStoredSave" type="button" @click="exportInvalidSave">Скачать проблемный сейв</button>
      <button type="button" @click="resetGame">Начать заново</button>
    </div>
    <header class="topbar">
      <div class="brand">
        <button class="brand-mark" type="button" aria-label="Логотип лаборатории" @click="unlockDiagnosticSpeed">✦</button>
        <div><p>CATMAND / SECTOR 07</p><h1>ДАТА-ЛАБОРАТОРИЯ</h1></div>
      </div>
      <div class="topbar-actions">
        <div class="speed-control" aria-label="Скорость симуляции">
          <span>СКОРОСТЬ</span>
          <div class="speed-control__buttons">
            <button
              v-for="option in speedOptions"
              :key="option.value"
              class="speed-button"
              :class="{ 'speed-button--active': simulationSpeed === option.value }"
              type="button"
              :aria-pressed="simulationSpeed === option.value"
              @click="setSimulationSpeed(option.value)"
            >{{ option.label }}</button>
          </div>
        </div>
        <div class="science-readout"><span>НАУКА / ДАННЫЕ</span><strong>{{ totalScience.toFixed(1) }}</strong><em>/ {{ totalData.toFixed(1) }}</em></div>
        <div class="economy-readout" :class="{ 'economy-readout--debt': snapshot.economy.credits < 0 }">
          <span>КРЕДИТЫ</span><strong>{{ snapshot.economy.credits.toFixed(1) }}</strong>
          <em>{{ (snapshot.economy.revenuePerMinute - snapshot.economy.upkeepPerMinute).toFixed(1) }}/мин</em>
        </div>
      </div>
    </header>

    <section class="workspace">
      <aside class="control-panel">
        <p class="panel-label">КОНСТРУКТОР СЕТИ</p>
        <button class="action-button" type="button" :disabled="snapshot.economy.credits < GAME_BALANCE.nodes.rest.cost" @click="createNode('rest')"><span>⌂</span> Комната отдыха · {{ GAME_BALANCE.nodes.rest.cost }}</button>
        <button class="action-button" type="button" :disabled="snapshot.economy.credits < GAME_BALANCE.nodes.research.cost" @click="createNode('research')"><span>✦</span> Исследования · {{ GAME_BALANCE.nodes.research.cost }}</button>
        <button class="action-button" type="button" :disabled="snapshot.economy.credits < GAME_BALANCE.nodes.server.cost" @click="createNode('server')"><span>▦</span> Сервер · {{ GAME_BALANCE.nodes.server.cost }}</button>
        <button class="action-button" type="button" :disabled="snapshot.economy.credits < GAME_BALANCE.nodes.terminal.cost" @click="createNode('terminal')"><span>₡</span> Торговый терминал · {{ GAME_BALANCE.nodes.terminal.cost }}</button>
        <button class="action-button" type="button" :disabled="snapshot.economy.credits < GAME_BALANCE.nodes.hub.cost" @click="createNode('hub')"><span>◆</span> Дорожный хаб · {{ GAME_BALANCE.nodes.hub.cost }}</button>
        <p v-if="snapshot.flightUnlocked" class="flight-era-note">✦ ВОЗДУШНАЯ ЭРА · коты летают напрямую</p>
        <p v-if="snapshot.economy.debtWarning" class="debt-warning">ЛАБОРАТОРИЯ ЗАКРЫТА · ранний доступ позволяет продолжить восстановление.</p>
        <button class="action-button action-button--disconnect" type="button" :disabled="!selectedConnection" @click="disconnectSelected"><span>×</span> Отключить связь</button>
        <button class="action-button action-button--danger" type="button" :disabled="!selectedModuleId" @click="deleteSelectedNode"><span>×</span> Удалить выбранный модуль</button>
        <div class="panel-rule"></div>
        <p class="panel-label">ЭКИПАЖ</p>
        <button class="hire-button" type="button" :disabled="!canHireCat" @click="hireCat"><span>◕</span> Нанять кота · {{ GAME_BALANCE.economy.hireCatCost }}</button>
        <button class="action-button action-button--danger" type="button" :disabled="!canDismissSelectedCat" @click="dismissSelectedCat"><span>−</span> Уволить кота · {{ GAME_BALANCE.economy.dismissCatCost }}</button>
        <div class="panel-rule"></div>
        <p class="panel-label">СОХРАНЕНИЕ</p>
        <button class="action-button" type="button" @click="exportGame"><span>⇩</span> Выгрузить JSON</button>
        <label class="action-button file-button"><span>⇧</span> Загрузить JSON<input type="file" accept="application/json,.json" @change="importGame" /></label>
        <button class="action-button action-button--danger" type="button" @click="resetGame"><span>↺</span> Начать заново</button>
        <div class="hint">
          <span class="hint-number">01</span>
          <p v-if="!snapshot.flightUnlocked">Стальные дуги — путь котов.<br />Время зависит от модулей, не изгиба.<br />Циановые каналы передают данные.</p>
          <p v-else>Коты летают напрямую между модулями.<br />Дороги можно строить, но коты их игнорируют.<br />Циановые каналы передают данные.</p>
        </div>
      </aside>

      <section class="graph-frame" aria-label="Граф лаборатории">
        <VueFlow
          :nodes="flowNodes"
          :edges="renderedEdges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :default-viewport="{ x: 0, y: 0, zoom: 0.92 }"
          :min-zoom="0.55"
          :max-zoom="1.4"
          :fit-view-on-init="false"
          :nodes-draggable="true"
          :connection-mode="ConnectionMode.Loose"
          :is-valid-connection="isValidConnection"
          @connect="onConnect"
          @edge-click="selectConnection"
          @node-click="selectModule"
          @node-drag="updateNodePosition"
          @node-drag-stop="updateNodePosition"
        >
          <template #connection-line="{ sourceX, sourceY, targetX, targetY }">
            <path class="connection-preview" :d="`M ${sourceX},${sourceY} L ${targetX},${targetY}`" />
          </template>
        </VueFlow>
        <div class="graph-status" :class="{ 'graph-status--selection': selectedCatId || selectedSlot }"><span class="status-dot"></span>{{ status }}</div>
        <div class="canvas-caption"><span>LIVE SIMULATION</span><b>{{ simulationSpeed }}×</b></div>
      </section>
    </section>
  </main>
</template>
