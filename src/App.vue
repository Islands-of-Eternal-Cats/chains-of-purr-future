<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ConnectionMode, MarkerType, VueFlow, type Connection as FlowConnection, type Edge, type EdgeMouseEvent, type Node, type NodeDragEvent, type NodeMouseEvent } from '@vue-flow/core'
import { Simulation, type Cat, type CommandResult, type NodeType, type RoadPort, type SimNode } from './core'
import GameNode from './components/GameNode.vue'
import WorkerTransitEdge from './components/WorkerTransitEdge.vue'

type Point = { x: number; y: number }
type Size = { width: number; height: number }
type SimulationSpeed = 0 | 1 | 5 | 10

const simulation = new Simulation()
const nodeTypes = { game: markRaw(GameNode) }
const edgeTypes = { workerTransit: markRaw(WorkerTransitEdge) }
const snapshot = ref(simulation.snapshot())
const selectedCatId = ref<string | null>(null)
const selectedSlot = ref<{ nodeId: string; slotId: string } | null>(null)
const selectedConnection = ref<{ id: string; kind: 'science' | 'worker' } | null>(null)
const selectedModuleId = ref<string | null>(null)
const status = ref('Создайте лабораторию и назначьте кота на исследование.')
const simulationSpeed = ref<SimulationSpeed>(1)
const speedOptions: Array<{ value: SimulationSpeed; label: string }> = [
  { value: 0, label: 'Пауза' },
  { value: 1, label: '×1' },
  { value: 5, label: '×5' },
  { value: 10, label: '×10' },
]
const positions = ref<Record<string, Point>>({
  'rest-1': { x: 80, y: 270 },
  'research-1': { x: 440, y: 150 },
  'server-2': { x: 805, y: 300 },
})

const catIndex = computed<Record<string, Cat>>(() => Object.fromEntries(snapshot.value.cats.map((cat) => [cat.id, cat])))
const unreachableCatIds = computed(() => snapshot.value.nodes.flatMap((node) => node.type === 'rest' || node.type === 'hub' ? [] : node.slots.flatMap((slot) => {
  const cat = slot.assignedCatId ? catIndex.value[slot.assignedCatId] : undefined
  return !slot.catId
    && !slot.reservedByCatId
    && cat?.status === 'idle'
    && cat.vigor >= 100
    && cat.nodeId !== node.id
    ? [cat.id]
    : []
})))
const canHireCat = computed(() => true)
const totalScience = computed(() => snapshot.value.nodes.reduce((total, node) => total + node.scienceReceived, 0))
const selectedCat = computed(() => selectedCatId.value ? catIndex.value[selectedCatId.value] : undefined)
const canReturnSelectedCat = computed(() => Boolean(
  selectedCat.value
  && selectedCat.value.status === 'idle'
  && snapshot.value.nodes.find((node) => node.id === selectedCat.value?.nodeId)?.type !== 'rest',
))

function nodePosition(node: SimNode): Point {
  if (positions.value[node.id]) return positions.value[node.id]
  return defaultNodePosition(node.type)
}

function defaultNodePosition(type: NodeType): Point {
  const count = snapshot.value.nodes.filter((node) => node.type === type).length
  const offset = count * 55
  if (type === 'rest') return { x: 80 + offset, y: 270 + offset }
  if (type === 'research') return { x: 440 + offset, y: 150 + offset }
  if (type === 'server') return { x: 805 + offset, y: 300 + offset }
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
  const scienceEdges: Edge[] = snapshot.value.connections.map((connection) => ({
    id: connection.id, source: connection.sourceId, target: connection.targetId, sourceHandle: 'science-out', targetHandle: 'science-in',
    type: 'smoothstep', animated: true, markerEnd: MarkerType.ArrowClosed, class: 'science-edge', selected: selectedConnection.value?.id === connection.id, data: { kind: 'science' },
  }))
  const workerEdges: Edge[] = snapshot.value.workerLinks.map((link) => ({
    id: link.id, source: link.nodeAId, target: link.nodeBId, sourceHandle: roadHandle(link.nodeAPort), targetHandle: roadHandle(link.nodeBPort),
    type: 'workerTransit', animated: false, markerStart: MarkerType.ArrowClosed, markerEnd: MarkerType.ArrowClosed, class: 'worker-edge',
    selected: selectedConnection.value?.id === link.id, label: `${link.travelSeconds.toFixed(1)}с`,
    data: { kind: 'worker', cats: snapshot.value.cats.filter((cat) => cat.travel?.leg.linkId === link.id) },
  }))
  return [...scienceEdges, ...workerEdges]
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
  return Math.max(0.6, Math.hypot(second.x - first.x, second.y - first.y) / 250)
}

function sync() {
  snapshot.value = simulation.snapshot()
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
    sync()
    syncBlockedNodes()
  }
  report(result, type === 'rest' ? 'Комната отдыха развёрнута: добавлены три кресла для котов.' : type === 'research' ? 'Исследовательский модуль развёрнут.' : type === 'server' ? 'Сервер данных подключён к лаборатории.' : 'Дорожный хаб развёрнут.')
}

function catPoint(cat: Cat): Point {
  if (cat.travel) {
    const from = nodePosition(snapshot.value.nodes.find((node) => node.id === cat.travel!.leg.fromNodeId)!)
    const to = nodePosition(snapshot.value.nodes.find((node) => node.id === cat.travel!.leg.toNodeId)!)
    return { x: from.x + (to.x - from.x) * cat.travel.legProgress, y: from.y + (to.y - from.y) * cat.travel.legProgress }
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
  report(result, selectedNode?.type === 'hub' ? `${nodeName} удалён; затронутые коты остановлены у ближайших хабов.` : `${nodeName} удалён вместе со всеми связанными каналами.`)
  if (result.ok) syncBlockedNodes()
}

function hireCat() {
  const result = simulation.hireCat()
  report(result, result.ok && !result.value.slotId ? `${result.value.name} ожидает свободное кресло для восстановления.` : 'Новый кот-оператор начал восстановление в комнате отдыха.')
}

function assignCatToWorkSlot(catId: string, nodeId: string, slotId: string) {
  const cat = catIndex.value[catId]
  const nodeName = snapshot.value.nodes.find((node) => node.id === nodeId)?.name ?? 'узел'
  const result = simulation.assignCat(catId, nodeId, slotId)
  const updatedCat = result.ok ? simulation.snapshot().cats.find((candidate) => candidate.id === catId) : undefined
  const success = updatedCat?.status === 'travelling'
    ? `${cat?.name ?? 'Кот'} закреплён за местом и идёт к модулю: ${nodeName}.`
    : (updatedCat?.vigor ?? 0) < 100
      ? `${cat?.name ?? 'Кот'} закреплён за местом и отправится после полного восстановления.`
      : `${cat?.name ?? 'Кот'} закреплён за местом, но пока не может дойти: слот отмечен красным.`
  report(result, success)
}

function selectCat(catId: string) {
  const cat = catIndex.value[catId]
  if (cat.status === 'travelling' || cat.status === 'stranded') {
    status.value = `${cat.name} уже находится в пути.`
    return
  }
  if (selectedSlot.value) {
    const target = selectedSlot.value
    assignCatToWorkSlot(catId, target.nodeId, target.slotId)
    selectedSlot.value = null
    selectedCatId.value = null
    return
  }
  selectedCatId.value = selectedCatId.value === catId ? null : catId
  status.value = selectedCatId.value ? `${cat.name} выбран. Кликните по рабочему слоту.` : 'Выбор кота отменён.'
}

function handleSlotClick(nodeId: string, slotId: string, occupiedCatId: string | null, reservedCatId: string | null, assignedCatId: string | null) {
  if (occupiedCatId) {
    selectCat(occupiedCatId)
    return
  }
  if (reservedCatId) {
    status.value = `${catIndex.value[reservedCatId]?.name ?? 'Кот'} уже идёт к этому слоту.`
    return
  }
  const targetNode = snapshot.value.nodes.find((node) => node.id === nodeId)
  if (targetNode?.type === 'rest') {
    status.value = 'Все кресла в комнате отдыха используются совместно.'
    return
  }
  if (assignedCatId && !selectedCatId.value) {
    const cat = catIndex.value[assignedCatId]
    report(simulation.clearWorkAssignment(nodeId, slotId), `${cat?.name ?? 'Кот'} больше не закреплён за этим местом.`)
    return
  }
  if (!selectedCatId.value) {
    const wasSelected = selectedSlot.value?.slotId === slotId
    selectedSlot.value = wasSelected ? null : { nodeId, slotId }
    status.value = wasSelected ? 'Выбор слота отменён.' : 'Слот выбран. Теперь выберите кота.'
    return
  }
  assignCatToWorkSlot(selectedCatId.value, nodeId, slotId)
  selectedCatId.value = null
}

function returnSelectedCat() {
  if (!selectedCat.value) return
  const cat = selectedCat.value
  report(simulation.releaseCat(cat.id), `${cat.name} идёт в комнату отдыха.`)
  selectedCatId.value = null
}

function onConnect(connection: FlowConnection) {
  if (!connection.source || !connection.target) return
  const sourcePort = roadPort(connection.sourceHandle)
  const targetPort = roadPort(connection.targetHandle)
  if (sourcePort && targetPort) {
    report(simulation.connectWorkerNodes(connection.source, connection.target, workerTravelSeconds(connection.source, connection.target), sourcePort, targetPort), 'Двунаправленный переход для котов создан.')
    return
  }
  report(simulation.connect(connection.source, connection.target), 'Канал научных данных установлен.')
}

function selectConnection(event: EdgeMouseEvent) {
  if (selectedConnection.value?.id === event.edge.id) {
    selectedConnection.value = null
    status.value = 'Выбор связи отменён.'
    return
  }
  selectedConnection.value = { id: event.edge.id, kind: event.edge.data?.kind === 'worker' ? 'worker' : 'science' }
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
  report(current.kind === 'worker' ? simulation.disconnectWorkerLink(current.id) : simulation.disconnect(current.id), current.kind === 'worker' ? 'Переход для котов отключён.' : 'Канал научных данных отключён.')
  selectedConnection.value = null
}

function updateNodePosition(event: NodeDragEvent) {
  const node = snapshot.value.nodes.find((candidate) => candidate.id === event.node.id)
  if (!node) return
  positions.value[event.node.id] = { ...event.node.position }
  for (const link of snapshot.value.workerLinks) {
    simulation.updateWorkerLinkTravelTime(link.id, workerTravelSeconds(link.nodeAId, link.nodeBId))
  }
  syncBlockedNodes()
}

function isValidConnection(connection: FlowConnection) {
  if (!connection.source || !connection.target || connection.source === connection.target) return false
  if (connection.sourceHandle === 'science-out' && connection.targetHandle === 'science-in') return true
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

let frame = 0
let previousTime = 0
function animate(time: number) {
  const elapsed = previousTime ? Math.min((time - previousTime) / 1000, 0.25) : 0
  previousTime = time
  const delta = elapsed * simulationSpeed.value
  if (delta > 0) {
    const travellingCats = new Set(snapshot.value.cats.filter((cat) => cat.status === 'travelling').map((cat) => cat.id))
    simulation.tick(delta)
    sync()
    const arrivedCat = snapshot.value.cats.find((cat) => travellingCats.has(cat.id) && cat.status === 'idle')
    if (arrivedCat) status.value = `${arrivedCat.name} прибыл: ${snapshot.value.nodes.find((node) => node.id === arrivedCat.nodeId)?.name ?? 'модуль'}.`
  }
  frame = requestAnimationFrame(animate)
}

onMounted(() => { frame = requestAnimationFrame(animate) })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <main class="app-shell" @contextmenu.prevent>
    <header class="topbar">
      <div class="brand">
        <span class="brand-mark">✦</span>
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
        <div class="science-readout"><span>НАУЧНЫЕ ДАННЫЕ</span><strong>{{ totalScience.toFixed(1) }}</strong><em>ед.</em></div>
      </div>
    </header>

    <section class="workspace">
      <aside class="control-panel">
        <p class="panel-label">КОНСТРУКТОР СЕТИ</p>
        <button class="action-button" type="button" @click="createNode('rest')"><span>⌂</span> Добавить комнату отдыха</button>
        <button class="action-button" type="button" @click="createNode('research')"><span>✦</span> Добавить исследования</button>
        <button class="action-button" type="button" @click="createNode('server')"><span>▦</span> Добавить сервер</button>
        <button class="action-button" type="button" @click="createNode('hub')"><span>◆</span> Добавить дорожный хаб</button>
        <button class="action-button action-button--disconnect" type="button" :disabled="!selectedConnection" @click="disconnectSelected"><span>×</span> Отключить связь</button>
        <button class="action-button action-button--danger" type="button" :disabled="!selectedModuleId" @click="deleteSelectedNode"><span>×</span> Удалить выбранный модуль</button>
        <div class="panel-rule"></div>
        <p class="panel-label">ЭКИПАЖ</p>
        <button class="hire-button" type="button" :disabled="!canHireCat" @click="hireCat"><span>◕</span> Нанять кота</button>
        <button class="action-button" type="button" :disabled="!canReturnSelectedCat" @click="returnSelectedCat"><span>↶</span> Вернуть выбранного кота</button>
        <div class="hint">
          <span class="hint-number">01</span>
          <p>Стальные дуги — путь котов.<br />Время зависит от модулей, не изгиба.<br />Циановые каналы передают данные.</p>
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
        <div class="canvas-caption"><span>LIVE SIMULATION</span><b>1×</b></div>
      </section>
    </section>
  </main>
</template>
