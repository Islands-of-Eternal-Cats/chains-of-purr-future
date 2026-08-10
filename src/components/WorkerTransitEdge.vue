<script setup lang="ts">
import { BaseEdge, getSmoothStepPath, type EdgeProps } from '@vue-flow/core'
import { computed, nextTick, ref, watch } from 'vue'
import type { Cat } from '../core'

interface WorkerTransitData {
  cats: Cat[]
}

const props = defineProps<EdgeProps<WorkerTransitData>>()
const guidePath = ref<SVGPathElement | null>(null)
const catPoints = ref<Array<{ id: string; name: string; variant: string; x: number; y: number }>>([])

const edgePath = computed(() => getSmoothStepPath({
  sourceX: props.sourceX,
  sourceY: props.sourceY,
  sourcePosition: props.sourcePosition,
  targetX: props.targetX,
  targetY: props.targetY,
  targetPosition: props.targetPosition,
})[0])

function updateCatPoints() {
  const path = guidePath.value
  const cats = props.data?.cats ?? []
  if (!path) return
  const length = path.getTotalLength()
  catPoints.value = cats.flatMap((cat) => {
    if (cat.travel?.kind !== 'road') return []
    const leg = cat.travel.leg
    const progress = leg.fromNodeId === props.source ? cat.travel.legProgress : 1 - cat.travel.legProgress
    const point = path.getPointAtLength(length * progress)
    return [{ id: cat.id, name: cat.name, variant: cat.variant, x: point.x, y: point.y }]
  })
}

watch([edgePath, () => props.data?.cats], () => { nextTick(updateCatPoints) }, { deep: true, immediate: true })
</script>

<template>
  <BaseEdge :path="edgePath" :marker-start="markerStart" :marker-end="markerEnd" class="worker-path" />
  <path ref="guidePath" :d="edgePath" class="worker-guide-path" />
  <g v-for="cat in catPoints" :key="cat.id" class="worker-cat-token" :transform="`translate(${cat.x} ${cat.y})`">
    <title>{{ cat.name }} в пути</title>
    <circle r="12" />
    <text text-anchor="middle" dominant-baseline="central">{{ cat.variant }}</text>
  </g>
</template>
