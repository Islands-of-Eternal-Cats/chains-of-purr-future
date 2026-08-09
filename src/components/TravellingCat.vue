<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'
import type { Cat } from '../core'

interface TravellingCatData { cat: Cat }
defineProps<NodeProps<TravellingCatData>>()
</script>

<template>
  <div class="travelling-cat" :aria-label="`${data.cat.name} в пути`">
    <span>{{ data.cat.variant }}</span>
    <small>{{ data.cat.name }}</small>
  </div>
</template>
