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
    const firstCat = simulation.snapshot().cats[0]
    expect(simulation.snapshot().cats).toHaveLength(1)
    expect(node(simulation, 'rest').slots[0]).toMatchObject({ catId: firstCat.id, assignedCatId: firstCat.id })
    expect(simulation.hireCat().ok).toBe(true)
    expect(simulation.hireCat().ok).toBe(true)
    expect(simulation.hireCat()).toMatchObject({ ok: false, reason: expect.stringContaining('больше котов') })
  })

  it('limits the whole crew to the rest room capacity, including cats assigned to work', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) return
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    const firstCat = simulation.snapshot().cats[0]
    simulation.assignCat(firstCat.id, research.value.id, research.value.slots[0].id)
    expect(simulation.hireCat().ok).toBe(true)
    expect(simulation.hireCat().ok).toBe(true)
    expect(simulation.hireCat().ok).toBe(false)
  })

  it('drains vigor while working, then sends an exhausted cat back to rest', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) return
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    const cat = simulation.snapshot().cats[0]
    simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id)
    simulation.tick(1)
    simulation.tick(10)
    const tiredCat = simulation.snapshot().cats[0]
    expect(tiredCat.vigor).toBe(0)
    expect(tiredCat.status).toBe('travelling')
    expect(tiredCat.travel?.targetNodeId).toBe('rest-1')
    simulation.tick(1)
    expect(simulation.snapshot().cats[0]).toMatchObject({ nodeId: 'rest-1', status: 'idle' })
    expect(node(simulation, 'research').slots[0].assignedCatId).toBe(cat.id)
  })

  it('keeps a personal rest berth reserved while a cat works and returns there when exhausted', () => {
    const simulation = new Simulation()
    const cat = simulation.snapshot().cats[0]
    const homeSlot = node(simulation, 'rest').slots.find((slot) => slot.assignedCatId === cat.id)
    const research = simulation.createNode('research')
    if (!homeSlot || !research.ok) return
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id)
    expect(node(simulation, 'rest').slots.find((slot) => slot.id === homeSlot.id)).toMatchObject({ catId: null, assignedCatId: cat.id })
    simulation.tick(1)
    simulation.tick(10)
    expect(simulation.snapshot().cats[0].travel).toMatchObject({ targetNodeId: 'rest-1', targetSlotId: homeSlot.id })
    expect(node(simulation, 'rest').slots.find((slot) => slot.id === homeSlot.id)).toMatchObject({ reservedByCatId: cat.id, assignedCatId: cat.id })
    simulation.tick(1)
    expect(simulation.snapshot().cats[0]).toMatchObject({ nodeId: 'rest-1', slotId: homeSlot.id, status: 'idle' })
  })

  it('leaves an exhausted cat at work when the route to its rest berth is missing', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) return
    const link = simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    if (!link.ok) return
    const cat = simulation.snapshot().cats[0]
    simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id)
    simulation.tick(1)
    expect(simulation.disconnectWorkerLink(link.value.id).ok).toBe(true)
    simulation.tick(10)
    expect(simulation.snapshot().cats[0]).toMatchObject({ nodeId: research.value.id, slotId: research.value.slots[0].id, status: 'idle', vigor: 0 })
    expect(node(simulation, 'research').slots[0].catId).toBe(cat.id)
  })

  it('returns a fully recovered cat to its assigned work slot', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) return
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    const cat = simulation.snapshot().cats[0]
    simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id)
    simulation.tick(1)
    simulation.tick(10)
    simulation.tick(1)
    simulation.tick(5)
    const returningCat = simulation.snapshot().cats[0]
    expect(returningCat).toMatchObject({ status: 'travelling', vigor: 100 })
    expect(returningCat.travel?.targetNodeId).toBe(research.value.id)
    expect(node(simulation, 'research').slots[0]).toMatchObject({ assignedCatId: cat.id, reservedByCatId: cat.id })
    simulation.tick(1)
    expect(simulation.snapshot().cats[0]).toMatchObject({ nodeId: research.value.id, status: 'idle', vigor: 100 })
  })

  it('keeps a recovered cat assigned when its route has been removed', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) return
    const link = simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    if (!link.ok) return
    const cat = simulation.snapshot().cats[0]
    simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id)
    simulation.tick(1)
    simulation.tick(10)
    simulation.tick(1)
    expect(simulation.disconnectWorkerLink(link.value.id).ok).toBe(true)
    simulation.tick(5)
    expect(simulation.snapshot().cats[0]).toMatchObject({ nodeId: 'rest-1', status: 'idle', vigor: 100 })
    expect(node(simulation, 'research').slots[0]).toMatchObject({ assignedCatId: cat.id, catId: null, reservedByCatId: null })
  })

  it('replaces and clears an unoccupied work-slot assignment', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) return
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    const firstCat = simulation.snapshot().cats[0]
    simulation.hireCat()
    const secondCat = simulation.snapshot().cats.find((cat) => cat.id !== firstCat.id)!
    simulation.assignCat(firstCat.id, research.value.id, research.value.slots[0].id)
    simulation.tick(1)
    simulation.releaseCat(firstCat.id)
    expect(simulation.assignCat(secondCat.id, research.value.id, research.value.slots[0].id).ok).toBe(true)
    expect(node(simulation, 'research').slots[0].assignedCatId).toBe(secondCat.id)
    simulation.tick(1)
    expect(simulation.snapshot().cats.find((cat) => cat.id === firstCat.id)).toMatchObject({ nodeId: 'rest-1', status: 'idle' })
    expect(simulation.clearWorkAssignment(research.value.id, research.value.slots[1].id).ok).toBe(false)
    simulation.releaseCat(secondCat.id)
    expect(simulation.clearWorkAssignment(research.value.id, research.value.slots[0].id).ok).toBe(true)
    expect(node(simulation, 'research').slots[0].assignedCatId).toBeNull()
    simulation.tick(1)
    expect(simulation.snapshot().cats.find((cat) => cat.id === secondCat.id)).toMatchObject({ nodeId: 'rest-1', status: 'idle' })
  })

  it('requires a worker route, reserves the destination and starts work only after arrival', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) return
    const cat = simulation.snapshot().cats[0]
    expect(simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id).ok).toBe(false)
    expect(node(simulation, 'research').slots[0].assignedCatId).toBeNull()
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    expect(simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id).ok).toBe(true)
    expect(node(simulation, 'research').slots[0].assignedCatId).toBe(cat.id)
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
