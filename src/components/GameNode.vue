<script setup lang="ts">
import { Handle, Position, type NodeProps } from '@vue-flow/core'
import type { Cat, SimNode } from '../core'

interface NodeViewData {
  node: SimNode
  cats: Record<string, Cat>
  selectedCatId: string | null
  selectedSlotId: string | null
  onCatClick: (catId: string) => void
  onSlotClick: (nodeId: string, slotId: string, catId: string | null, reservedCatId: string | null, assignedCatId: string | null) => void
}

defineProps<NodeProps<NodeViewData>>()

const nodeIcons = {
  rest: '⌂',
  research: '✦',
  server: '▦',
}

const nodeSubtitles = {
  rest: 'Кот-операторы в резерве',
  research: 'Производство научных данных',
  server: 'Приём и хранение данных',
}
</script>

<template>
  <article class="game-node" :class="`game-node--${data.node.type}`">
    <Handle
      v-if="data.node.type === 'server'"
      id="science-in"
      class="game-handle game-handle--input"
      type="target"
      :position="Position.Left"
    />

    <header class="node-header">
      <span class="node-icon" aria-hidden="true">{{ nodeIcons[data.node.type] }}</span>
      <div>
        <p class="node-eyebrow">{{ data.node.type === 'rest' ? 'БАЗОВЫЙ МОДУЛЬ' : 'РАБОЧИЙ МОДУЛЬ' }}</p>
        <h2>{{ data.node.name }}</h2>
        <p class="node-subtitle">{{ nodeSubtitles[data.node.type] }}</p>
      </div>
    </header>

    <section class="slot-grid" aria-label="Рабочие слоты">
      <button
        v-for="slot in data.node.slots"
        :key="slot.id"
        class="worker-slot nodrag nopan"
        :class="{ 'worker-slot--selected': slot.catId === data.selectedCatId || slot.id === data.selectedSlotId, 'worker-slot--occupied': slot.catId, 'worker-slot--reserved': slot.reservedByCatId, 'worker-slot--assigned': slot.assignedCatId, 'worker-slot--rest-berth': data.node.type === 'rest' && slot.assignedCatId, 'worker-slot--exhausted': data.node.type !== 'rest' && slot.catId && (data.cats[slot.catId]?.vigor ?? 0) <= 0 }"
        type="button"
        @click.stop="data.onSlotClick(data.node.id, slot.id, slot.catId, slot.reservedByCatId, slot.assignedCatId)"
      >
        <template v-if="slot.catId">
          <span class="cat-glyph" aria-hidden="true">{{ data.cats[slot.catId]?.variant }}</span>
          <span class="cat-name" @click.stop="data.onCatClick(slot.catId)">{{ data.cats[slot.catId]?.name }}</span>
          <span class="cat-vigor" title="Бодрость">{{ Math.ceil(data.cats[slot.catId]?.vigor ?? 0) }}</span>
          <span v-if="data.node.type !== 'rest' && (data.cats[slot.catId]?.vigor ?? 0) <= 0" class="slot-state slot-state--warning">нет пути к отдыху</span>
        </template>
        <template v-else-if="slot.reservedByCatId">
          <span class="cat-glyph cat-glyph--travelling" aria-hidden="true">↝</span>
          <span>{{ data.cats[slot.reservedByCatId]?.name }}</span>
          <span class="slot-state">в пути</span>
        </template>
        <template v-else-if="slot.assignedCatId">
          <span class="cat-glyph cat-glyph--assigned" aria-hidden="true">{{ data.cats[slot.assignedCatId]?.variant }}</span>
          <span class="cat-name">{{ data.cats[slot.assignedCatId]?.name }}</span>
          <span class="slot-state">{{ data.node.type === 'rest' ? (data.cats[slot.assignedCatId]?.status === 'travelling' ? 'в пути' : 'на работе') : (data.cats[slot.assignedCatId]?.vigor ?? 0) >= 100 ? 'ждёт путь' : 'отдыхает' }}</span>
        </template>
        <template v-else>
          <span class="empty-slot-mark">+</span>
          <span>свободно</span>
        </template>
      </button>
    </section>

    <footer class="node-metrics">
      <template v-if="data.node.type === 'research'">
        <div><span>Выработка</span><strong>{{ data.node.productionRate.toFixed(1) }} <small>ед/с</small></strong></div>
        <div :class="{ warning: data.node.scienceBuffer > 0.75 }"><span>Буфер</span><strong>{{ data.node.scienceBuffer.toFixed(1) }} <small>данных</small></strong></div>
      </template>
      <template v-else-if="data.node.type === 'server'">
        <div><span>Приём</span><strong>{{ data.node.inputRate.toFixed(1) }} <small>ед/с</small></strong></div>
        <div><span>Накоплено</span><strong>{{ data.node.scienceReceived.toFixed(1) }} <small>данных</small></strong></div>
      </template>
      <template v-else>
        <div><span>Мест</span><strong>{{ data.node.slots.filter((slot) => !slot.catId).length }} <small>свободно</small></strong></div>
        <div><span>Статус</span><strong>тихо</strong></div>
      </template>
    </footer>

    <Handle
      id="worker-in"
      class="game-handle game-handle--worker-input"
      type="target"
      :position="Position.Top"
    />
    <Handle
      v-if="data.node.type === 'research'"
      id="science-out"
      class="game-handle game-handle--output"
      type="source"
      :position="Position.Right"
    />
    <Handle
      id="worker-out"
      class="game-handle game-handle--worker-output"
      type="source"
      :position="Position.Bottom"
    />
  </article>
</template>
