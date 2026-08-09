<script setup lang="ts">
import { getStraightPath, type EdgeProps } from '@vue-flow/core'
import { computed } from 'vue'
import type { Cat, Point } from '../core'

interface FlightTransitData {
  cat: Cat
  origin: Point
  targetPoint: Point
}

const props = defineProps<EdgeProps<FlightTransitData>>()

const edgePath = computed(() => getStraightPath({
  sourceX: catPoint.value?.x ?? props.data.origin.x,
  sourceY: catPoint.value?.y ?? props.data.origin.y,
  targetX: props.data.targetPoint.x,
  targetY: props.data.targetPoint.y,
})[0])

const catPoint = computed(() => {
  const travel = props.data?.cat.travel
  if (!travel || travel.kind !== 'flight') return null
  return {
    x: props.data.origin.x + (props.data.targetPoint.x - props.data.origin.x) * travel.flightProgress,
    y: props.data.origin.y + (props.data.targetPoint.y - props.data.origin.y) * travel.flightProgress,
  }
})
</script>

<template>
  <path :d="edgePath" class="flight-path" fill="none" />
  <g v-if="catPoint" class="flight-cat-token" :transform="`translate(${catPoint.x} ${catPoint.y})`">
    <title>{{ data?.cat.name }} в полёте</title>
    <circle r="14" />
    <text text-anchor="middle" dominant-baseline="central">{{ data?.cat.variant }}</text>
  </g>
</template>
