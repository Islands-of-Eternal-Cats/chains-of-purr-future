<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, onMounted, ref } from 'vue'
import { ConnectionMode, MarkerType, VueFlow, type Connection as FlowConnection, type Node, type NodeDragEvent } from '@vue-flow/core'
import { Simulation, type Cat, type CommandResult, type SimNode } from './core'
import GameNode from './components/GameNode.vue'

type Point = { x: number; y: number }

const simulation = new Simulation()
const nodeTypes = { game: markRaw(GameNode) }
const snapshot = ref(simulation.snapshot())
const selectedCatId = ref<string | null>(null)
const status = ref('Создайте лабораторию и назначьте кота на исследование.')
const positions = ref<Record<string, Point>>({
  'rest-1': { x: 80, y: 270 },
  'research-1': { x: 440, y: 150 },
  'server-2': { x: 805, y: 300 },
})

const catIndex = computed<Record<string, Cat>>(() => Object.fromEntries(snapshot.value.cats.map((cat) => [cat.id, cat])))
const hasResearch = computed(() => snapshot.value.nodes.some((node) => node.type === 'research'))
const hasServer = computed(() => snapshot.value.nodes.some((node) => node.type === 'server'))
const server = computed(() => snapshot.value.nodes.find((node) => node.type === 'server'))
const totalScience = computed(() => server.value?.scienceReceived ?? 0)

function nodePosition(node: SimNode): Point {
  if (positions.value[node.id]) return positions.value[node.id]
  return node.type === 'research' ? { x: 440, y: 150 } : { x: 805, y: 300 }
}

const flowNodes = computed<Node[]>(() => snapshot.value.nodes.map((node) => ({
  id: node.id,
  type: 'game',
  position: nodePosition(node),
  data: {
    node,
    cats: catIndex.value,
    selectedCatId: selectedCatId.value,
    onCatClick: selectCat,
    onSlotClick: handleSlotClick,
  },
})))

const flowEdges = computed(() => snapshot.value.connections.map((connection) => ({
  id: connection.id,
  source: connection.sourceId,
  target: connection.targetId,
  sourceHandle: 'science-out',
  targetHandle: 'science-in',
  type: 'smoothstep',
  animated: true,
  markerEnd: MarkerType.ArrowClosed,
  class: 'science-edge',
})))

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
  selectedCatId.value = selectedCatId.value === catId ? null : catId
  const cat = catIndex.value[catId]
  status.value = selectedCatId.value ? `${cat.name} выбран. Кликните по свободному слоту.` : 'Выбор кота отменён.'
}

function handleSlotClick(nodeId: string, slotId: string, occupiedCatId: string | null) {
  if (occupiedCatId) {
    report(simulation.releaseCat(occupiedCatId), `${catIndex.value[occupiedCatId]?.name ?? 'Кот'} возвращается в комнату отдыха.`)
    if (selectedCatId.value === occupiedCatId) selectedCatId.value = null
    return
  }
  if (!selectedCatId.value) {
    status.value = 'Сначала выберите кота в занятом слоте.'
    return
  }
  const cat = catIndex.value[selectedCatId.value]
  report(simulation.assignCat(selectedCatId.value, nodeId, slotId), `${cat.name} назначен: ${snapshot.value.nodes.find((node) => node.id === nodeId)?.name ?? 'узел'}.`)
  selectedCatId.value = null
}

function onConnect(connection: FlowConnection) {
  if (!connection.source || !connection.target) return
  report(simulation.connect(connection.source, connection.target), 'Канал научных данных установлен.')
}

function onNodeDragStop(event: NodeDragEvent) {
  positions.value[event.node.id] = { ...event.node.position }
}

let frame = 0
let previousTime = 0
function animate(time: number) {
  const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.25) : 0
  previousTime = time
  if (delta > 0) {
    simulation.tick(delta)
    sync()
  }
  frame = requestAnimationFrame(animate)
}

onMounted(() => { frame = requestAnimationFrame(animate) })
onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <main class="app-shell">
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
        <div class="panel-rule"></div>
        <p class="panel-label">ЭКИПАЖ</p>
        <button class="hire-button" type="button" @click="hireCat"><span>◕</span> Нанять кота</button>
        <div class="hint">
          <span class="hint-number">01</span>
          <p>Выберите кота, затем свободный слот.<br />Тяните циановый выход исследований к входу сервера.</p>
        </div>
      </aside>

      <section class="graph-frame" aria-label="Граф лаборатории">
        <VueFlow
          :nodes="flowNodes"
          :edges="flowEdges"
          :node-types="nodeTypes"
          :default-viewport="{ x: 0, y: 0, zoom: 0.92 }"
          :min-zoom="0.55"
          :max-zoom="1.4"
          :fit-view-on-init="false"
          :connection-mode="ConnectionMode.Strict"
          :is-valid-connection="(connection) => connection.source !== connection.target"
          @connect="onConnect"
          @node-drag-stop="onNodeDragStop"
        >
          <template #connection-line="{ sourceX, sourceY, targetX, targetY }">
            <path class="connection-preview" :d="`M ${sourceX},${sourceY} L ${targetX},${targetY}`" />
          </template>
        </VueFlow>
        <div class="graph-status" :class="{ 'graph-status--selection': selectedCatId }"><span class="status-dot"></span>{{ status }}</div>
        <div class="canvas-caption"><span>LIVE SIMULATION</span><b>1×</b></div>
      </section>
    </section>
  </main>
</template>
