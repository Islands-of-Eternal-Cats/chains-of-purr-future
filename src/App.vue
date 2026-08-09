<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref } from 'vue'
import { ConnectionMode, MarkerType, VueFlow, type Connection as FlowConnection, type Edge, type EdgeMouseEvent, type Node, type NodeDragEvent, type NodeMouseEvent } from '@vue-flow/core'
import { Simulation, type Cat, type CommandResult, type SimNode } from './core'
import GameNode from './components/GameNode.vue'
import WorkerTransitEdge from './components/WorkerTransitEdge.vue'

type Point = { x: number; y: number }

const simulation = new Simulation()
const nodeTypes = { game: markRaw(GameNode) }
const edgeTypes = { workerTransit: markRaw(WorkerTransitEdge) }
const snapshot = ref(simulation.snapshot())
const selectedCatId = ref<string | null>(null)
const selectedSlot = ref<{ nodeId: string; slotId: string } | null>(null)
const selectedConnection = ref<{ id: string; kind: 'science' | 'worker' } | null>(null)
const selectedModuleId = ref<string | null>(null)
const status = ref('Создайте лабораторию и назначьте кота на исследование.')
const positions = ref<Record<string, Point>>({
  'rest-1': { x: 80, y: 270 },
  'research-1': { x: 440, y: 150 },
  'server-2': { x: 805, y: 300 },
})

const catIndex = computed<Record<string, Cat>>(() => Object.fromEntries(snapshot.value.cats.map((cat) => [cat.id, cat])))
const hasResearch = computed(() => snapshot.value.nodes.some((node) => node.type === 'research'))
const hasServer = computed(() => snapshot.value.nodes.some((node) => node.type === 'server'))
const canHireCat = computed(() => {
  const rest = snapshot.value.nodes.find((node) => node.type === 'rest')
  return Boolean(rest && snapshot.value.cats.length < rest.slots.length)
})
const server = computed(() => snapshot.value.nodes.find((node) => node.type === 'server'))
const totalScience = computed(() => server.value?.scienceReceived ?? 0)
const selectedCat = computed(() => selectedCatId.value ? catIndex.value[selectedCatId.value] : undefined)
const canReturnSelectedCat = computed(() => Boolean(selectedCat.value && selectedCat.value.status === 'idle' && selectedCat.value.nodeId !== 'rest-1'))

function nodePosition(node: SimNode): Point {
  if (positions.value[node.id]) return positions.value[node.id]
  return node.type === 'research' ? { x: 440, y: 150 } : { x: 805, y: 300 }
}

const flowNodes = computed<Node[]>(() => {
  const moduleNodes: Node[] = snapshot.value.nodes.map((node) => ({
    id: node.id,
    type: 'game',
    position: nodePosition(node),
    selected: selectedModuleId.value === node.id,
    data: { node, cats: catIndex.value, selectedCatId: selectedCatId.value, selectedSlotId: selectedSlot.value?.slotId ?? null, onCatClick: selectCat, onSlotClick: handleSlotClick },
  }))
  return moduleNodes
})

const flowEdges = computed<Edge[]>(() => {
  const scienceEdges: Edge[] = snapshot.value.connections.map((connection) => ({
    id: connection.id, source: connection.sourceId, target: connection.targetId, sourceHandle: 'science-out', targetHandle: 'science-in',
    type: 'smoothstep', animated: true, markerEnd: MarkerType.ArrowClosed, class: 'science-edge', selected: selectedConnection.value?.id === connection.id, data: { kind: 'science' },
  }))
  const workerEdges: Edge[] = snapshot.value.workerLinks.map((link) => ({
    id: link.id, source: link.nodeAId, target: link.nodeBId, sourceHandle: 'worker-out', targetHandle: 'worker-in',
    type: 'workerTransit', animated: false, markerStart: MarkerType.ArrowClosed, markerEnd: MarkerType.ArrowClosed, class: 'worker-edge',
    selected: selectedConnection.value?.id === link.id, label: `${link.travelSeconds.toFixed(1)}с`,
    data: { kind: 'worker', cats: snapshot.value.cats.filter((cat) => cat.travel?.path[cat.travel.legIndex]?.linkId === link.id) },
  }))
  return [...scienceEdges, ...workerEdges]
})

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

function createNode(type: 'research' | 'server') {
  const result = simulation.createNode(type)
  if (result.ok) {
    positions.value[result.value.id] = type === 'research' ? { x: 440, y: 150 } : { x: 805, y: 300 }
  }
  report(result, type === 'research' ? 'Исследовательский модуль развёрнут.' : 'Сервер данных подключён к лаборатории.')
}

function hireCat() {
  report(simulation.hireCat(), 'Новый кот-оператор прибыл в комнату отдыха.')
}

function selectCat(catId: string) {
  const cat = catIndex.value[catId]
  if (cat.status === 'travelling') {
    status.value = `${cat.name} уже находится в пути.`
    return
  }
  if (selectedSlot.value) {
    const target = selectedSlot.value
    report(simulation.assignCat(catId, target.nodeId, target.slotId), `${cat.name} идёт к модулю: ${snapshot.value.nodes.find((node) => node.id === target.nodeId)?.name ?? 'узел'}.`)
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
  if (targetNode?.type === 'rest' && assignedCatId) {
    status.value = `${catIndex.value[assignedCatId]?.name ?? 'Кот'} закреплён за этим местом отдыха.`
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
  const cat = catIndex.value[selectedCatId.value]
  const replacedAssignment = Boolean(assignedCatId && assignedCatId !== cat.id)
  report(simulation.assignCat(selectedCatId.value, nodeId, slotId), replacedAssignment ? `${cat.name} закреплён за местом и идёт к модулю.` : `${cat.name} закреплён за местом и идёт к модулю: ${snapshot.value.nodes.find((node) => node.id === nodeId)?.name ?? 'узел'}.`)
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
  if (connection.sourceHandle === 'worker-out' && connection.targetHandle === 'worker-in') {
    report(simulation.connectWorkerNodes(connection.source, connection.target, workerTravelSeconds(connection.source, connection.target)), 'Двунаправленный переход для котов создан.')
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
  positions.value[event.node.id] = { ...event.node.position }
  for (const link of snapshot.value.workerLinks) {
    simulation.updateWorkerLinkTravelTime(link.id, workerTravelSeconds(link.nodeAId, link.nodeBId))
  }
  sync()
}

function isValidConnection(connection: FlowConnection) {
  if (!connection.source || !connection.target || connection.source === connection.target) return false
  return (connection.sourceHandle === 'science-out' && connection.targetHandle === 'science-in') || (connection.sourceHandle === 'worker-out' && connection.targetHandle === 'worker-in')
}

let frame = 0
let previousTime = 0
function animate(time: number) {
  const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.25) : 0
  previousTime = time
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
      <div class="science-readout"><span>НАУЧНЫЕ ДАННЫЕ</span><strong>{{ totalScience.toFixed(1) }}</strong><em>ед.</em></div>
    </header>

    <section class="workspace">
      <aside class="control-panel">
        <p class="panel-label">КОНСТРУКТОР СЕТИ</p>
        <button class="action-button" type="button" :disabled="hasResearch" @click="createNode('research')"><span>✦</span> Добавить исследования</button>
        <button class="action-button" type="button" :disabled="hasServer" @click="createNode('server')"><span>▦</span> Добавить сервер</button>
        <button class="action-button action-button--disconnect" type="button" :disabled="!selectedConnection" @click="disconnectSelected"><span>×</span> Отключить связь</button>
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
          :edges="flowEdges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :default-viewport="{ x: 0, y: 0, zoom: 0.92 }"
          :min-zoom="0.55"
          :max-zoom="1.4"
          :fit-view-on-init="false"
          :nodes-draggable="true"
          :connection-mode="ConnectionMode.Strict"
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
