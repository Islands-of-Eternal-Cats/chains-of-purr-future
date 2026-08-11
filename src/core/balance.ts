import type { NodeType } from './types'

export interface NodeBalance {
  cost: number
  upkeepPerMinute: number
  slots: number
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object') {
    Object.freeze(value)
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested)
  }
  return value
}

const nodeBalance = {
  rest: { cost: 200, upkeepPerMinute: 6, slots: 3 },
  research: { cost: 180, upkeepPerMinute: 12, slots: 2 },
  server: { cost: 160, upkeepPerMinute: 10, slots: 1 },
  hub: { cost: 80, upkeepPerMinute: 3, slots: 0 },
  terminal: { cost: 220, upkeepPerMinute: 10, slots: 1 },
} satisfies Record<NodeType, NodeBalance>

export const GAME_BALANCE = deepFreeze({
  economy: {
    startingCredits: 1000,
    debtWarningThreshold: -500,
    dataSalePrice: 3,
    hireCatCost: 120,
    dismissCatCost: 60,
    catUpkeepPerMinute: 5,
    demolitionRefundRatio: 0.5,
  },
  nodes: nodeBalance,
  cats: {
    maxVigor: 100,
    workVigorDrainPerSecond: 10,
    restVigorRecoveryPerSecond: 20,
  },
  science: {
    progressPerWorkSecond: 1,
    dataPerWorkSecond: 1,
    flightUnlockProgress: 50,
  },
  objective: {
    requiredResearchNodes: 2,
    requiredProfitableSeconds: 300,
    requiredPeakNetIncomePerMinute: 500,
  },
  data: {
    serverBaseCapacityPerSecond: 0.5,
    serverOperatorCapacityPerWorkSecond: 0.5,
  },
  trade: {
    baseCapacityPerSecond: 0.25,
    operatorCapacityPerWorkSecond: 0.75,
  },
  transport: {
    roadSpeedPixelsPerSecond: 250,
    flightSpeedMultiplier: 2,
    minimumRoadTravelSeconds: 0.6,
  },
} as const)
