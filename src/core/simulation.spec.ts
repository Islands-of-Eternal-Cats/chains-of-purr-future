import { describe, expect, it } from 'vitest'
import { Simulation } from './simulation'

function node(simulation: Simulation, type: 'rest' | 'research' | 'server') {
  const result = simulation.snapshot().nodes.find((candidate) => candidate.type === type)
  if (!result) throw new Error(`Missing ${type} node`)
  return result
}

describe('Simulation', () => {
  it('starts with one cat in a three-slot rest room and honours its hiring capacity', () => {
    const simulation = new Simulation()
    expect(node(simulation, 'rest').slots).toHaveLength(3)
    expect(simulation.snapshot().cats).toHaveLength(1)
    expect(simulation.hireCat().ok).toBe(true)
    expect(simulation.hireCat().ok).toBe(true)
    expect(simulation.hireCat()).toMatchObject({ ok: false, reason: expect.stringContaining('нет свободных') })
  })

  it('requires a worker route, reserves the destination and starts work only after arrival', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) return
    const cat = simulation.snapshot().cats[0]
    expect(simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id).ok).toBe(false)
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    expect(simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id).ok).toBe(true)
    expect(node(simulation, 'research').slots[0].reservedByCatId).toBe(cat.id)
    simulation.tick(0.5)
    expect(node(simulation, 'research').productionRate).toBe(0)
    expect(simulation.assignCat(cat.id, research.value.id, research.value.slots[1].id).ok).toBe(false)
    simulation.tick(0.5)
    expect(node(simulation, 'research').slots[0].catId).toBe(cat.id)
    expect(node(simulation, 'research').slots[0].reservedByCatId).toBeNull()
    simulation.tick(1)
    expect(node(simulation, 'research').scienceBuffer).toBeCloseTo(1)
  })

  it('chooses the shortest multi-hop worker route with deterministic link ordering', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    if (!research.ok || !server.ok) return
    simulation.connectWorkerNodes('rest-1', server.value.id, 5)
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    simulation.connectWorkerNodes(research.value.id, server.value.id, 1)
    const cat = simulation.snapshot().cats[0]
    simulation.assignCat(cat.id, server.value.id, server.value.slots[0].id)
    const travelling = simulation.snapshot().cats[0]
    expect(travelling.travel?.path).toHaveLength(2)
    expect(travelling.travel?.path.map((leg) => leg.toNodeId)).toEqual([research.value.id, server.value.id])
    simulation.tick(2)
    expect(node(simulation, 'server').slots[0].catId).toBe(cat.id)
  })

  it('updates data throughput only for arrived workers and slows the server without its operator', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    if (!research.ok || !server.ok) return
    simulation.connect(research.value.id, server.value.id)
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    simulation.connectWorkerNodes('rest-1', server.value.id, 1)
    const firstCat = simulation.snapshot().cats[0]
    simulation.hireCat()
    const secondCat = simulation.snapshot().cats.find((cat) => cat.id !== firstCat.id)!
    simulation.assignCat(firstCat.id, research.value.id, research.value.slots[0].id)
    simulation.assignCat(secondCat.id, server.value.id, server.value.slots[0].id)
    simulation.tick(1)
    simulation.tick(2)
    expect(node(simulation, 'server').inputRate).toBeCloseTo(1)
    expect(node(simulation, 'server').scienceReceived).toBeCloseTo(2)
    simulation.releaseCat(secondCat.id)
    simulation.tick(1)
    simulation.tick(2)
    expect(node(simulation, 'server').inputRate).toBeCloseTo(0.5)
    expect(node(simulation, 'research').scienceBuffer).toBeCloseTo(1.5)
  })

  it('does not disconnect a worker link carrying a cat and updates a link duration', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) return
    const link = simulation.connectWorkerNodes('rest-1', research.value.id, 4)
    if (!link.ok) return
    const cat = simulation.snapshot().cats[0]
    simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id)
    expect(simulation.disconnectWorkerLink(link.value.id).ok).toBe(false)
    expect(simulation.updateWorkerLinkTravelTime(link.value.id, 0.5).ok).toBe(true)
    simulation.tick(0.5)
    expect(node(simulation, 'research').slots[0].catId).toBe(cat.id)
    expect(simulation.disconnectWorkerLink(link.value.id).ok).toBe(true)
  })
})
