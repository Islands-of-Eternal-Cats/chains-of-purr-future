import { describe, expect, it } from 'vitest'
import { Simulation } from './simulation'

function node(simulation: Simulation, type: 'rest' | 'research' | 'server') {
  const result = simulation.snapshot().nodes.find((candidate) => candidate.type === type)
  if (!result) throw new Error(`Missing ${type}`)
  return result
}

function cat(simulation: Simulation, id = 'cat-1') {
  const result = simulation.snapshot().cats.find((candidate) => candidate.id === id)
  if (!result) throw new Error(`Missing ${id}`)
  return result
}

function createResearch(simulation: Simulation) {
  const research = simulation.createNode('research')
  if (!research.ok) throw new Error(research.reason)
  const link = simulation.connectWorkerNodes('rest-1', research.value.id, 1)
  if (!link.ok) throw new Error(link.reason)
  return research.value
}

describe('Simulation rest seating', () => {
  it('starts with common seats, while new hires begin tired', () => {
    const simulation = new Simulation()
    expect(node(simulation, 'rest').slots).toHaveLength(3)
    expect(node(simulation, 'rest').slots.every((slot) => slot.assignedCatId === null)).toBe(true)
    expect(cat(simulation)).toMatchObject({ slotId: 'rest-1-slot-1', vigor: 100 })

    expect(simulation.hireCat()).toMatchObject({ ok: true, value: { id: 'cat-2', vigor: 0, slotId: 'rest-1-slot-2' } })
  })

  it('allows more cats than seats and queues them without recovery', () => {
    const simulation = new Simulation()
    simulation.hireCat()
    simulation.hireCat()
    simulation.hireCat()
    expect(simulation.snapshot().cats).toHaveLength(4)
    expect(cat(simulation, 'cat-4')).toMatchObject({ nodeId: 'rest-1', slotId: null, vigor: 0 })

    simulation.tick(5)
    expect(cat(simulation, 'cat-4').vigor).toBe(0)
    expect(simulation.snapshot().cats.filter((candidate) => candidate.slotId)).toHaveLength(3)
  })

  it('does not send a cat to work before full recovery, including one in the queue', () => {
    const simulation = new Simulation()
    const research = createResearch(simulation)
    simulation.hireCat()
    simulation.hireCat()
    simulation.hireCat()

    expect(simulation.assignCat('cat-4', research.id, research.slots[0].id)).toMatchObject({ ok: false, reason: expect.stringContaining('полностью восстановить') })
    simulation.tick(5)
    expect(simulation.assignCat('cat-2', research.id, research.slots[0].id).ok).toBe(true)
  })

  it('returns an exhausted worker to the first available common seat', () => {
    const simulation = new Simulation()
    const research = createResearch(simulation)
    simulation.assignCat('cat-1', research.id, research.slots[0].id)
    simulation.tick(1)
    simulation.tick(10)

    expect(cat(simulation)).toMatchObject({ vigor: 0, status: 'travelling' })
    expect(cat(simulation).travel).toMatchObject({ targetNodeId: 'rest-1', targetSlotId: 'rest-1-slot-1' })
  })

  it('keeps an exhausted worker at work when every suitable rest seat is occupied, then retries', () => {
    const simulation = new Simulation()
    const research = createResearch(simulation)
    simulation.assignCat('cat-1', research.id, research.slots[0].id)
    simulation.hireCat()
    simulation.hireCat()
    simulation.hireCat()
    simulation.tick(5)
    simulation.tick(1)
    simulation.tick(10)

    expect(cat(simulation)).toMatchObject({ nodeId: research.id, status: 'idle', vigor: 0 })
    expect(simulation.assignCat('cat-2', research.id, research.slots[1].id).ok).toBe(true)
    simulation.tick(0.1)
    expect(cat(simulation)).toMatchObject({ status: 'travelling', vigor: 0 })
    expect(cat(simulation).travel?.targetNodeId).toBe('rest-1')
  })

  it('seats waiting cats in FIFO order when a common seat opens', () => {
    const simulation = new Simulation()
    const research = createResearch(simulation)
    simulation.hireCat()
    simulation.hireCat()
    simulation.hireCat()
    simulation.tick(5)

    expect(cat(simulation, 'cat-4').slotId).toBeNull()
    expect(simulation.assignCat('cat-2', research.id, research.slots[0].id).ok).toBe(true)
    expect(cat(simulation, 'cat-4').slotId).toBe('rest-1-slot-2')
  })

  it('keeps persistent work assignments and automatically returns a recovered seated cat', () => {
    const simulation = new Simulation()
    const research = createResearch(simulation)
    simulation.assignCat('cat-1', research.id, research.slots[0].id)
    simulation.tick(1)
    simulation.tick(10)
    simulation.tick(1)
    simulation.tick(5)

    expect(cat(simulation)).toMatchObject({ status: 'travelling', vigor: 100 })
    expect(cat(simulation).travel?.targetNodeId).toBe(research.id)
    expect(node(simulation, 'research').slots[0]).toMatchObject({ assignedCatId: 'cat-1', reservedByCatId: 'cat-1' })
  })

  it('requires a worker route and starts production only after arrival', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error(research.reason)

    expect(simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id).ok).toBe(false)
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    expect(simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id).ok).toBe(true)
    simulation.tick(0.5)
    expect(node(simulation, 'research').productionRate).toBe(0)
    simulation.tick(0.5)
    expect(node(simulation, 'research').slots[0].catId).toBe('cat-1')
    simulation.tick(1)
    expect(node(simulation, 'research').scienceBuffer).toBeCloseTo(1)
  })

  it('chooses the shortest multi-hop worker route with deterministic link ordering', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    if (!research.ok || !server.ok) throw new Error('Missing work node')
    simulation.connectWorkerNodes('rest-1', server.value.id, 5)
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    simulation.connectWorkerNodes(research.value.id, server.value.id, 1)

    expect(simulation.assignCat('cat-1', server.value.id, server.value.slots[0].id).ok).toBe(true)
    expect(cat(simulation).travel?.path.map((leg) => leg.toNodeId)).toEqual([research.value.id, server.value.id])
    simulation.tick(2)
    expect(node(simulation, 'server').slots[0].catId).toBe('cat-1')
  })

  it('updates data throughput only for arrived workers and slows the server without its operator', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    if (!research.ok || !server.ok) throw new Error('Missing work node')
    simulation.connect(research.value.id, server.value.id)
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    simulation.connectWorkerNodes('rest-1', server.value.id, 1)
    simulation.hireCat()
    simulation.tick(5)

    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    simulation.assignCat('cat-2', server.value.id, server.value.slots[0].id)
    simulation.tick(1)
    simulation.tick(2)
    expect(node(simulation, 'server').inputRate).toBeCloseTo(1)
    expect(node(simulation, 'server').scienceReceived).toBeCloseTo(2)
    simulation.releaseCat('cat-2')
    simulation.tick(1)
    simulation.tick(2)
    expect(node(simulation, 'server').inputRate).toBeCloseTo(0.5)
  })

  it('does not disconnect a worker link carrying a cat and updates a link duration', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error(research.reason)
    const link = simulation.connectWorkerNodes('rest-1', research.value.id, 4)
    if (!link.ok) throw new Error(link.reason)

    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    expect(simulation.disconnectWorkerLink(link.value.id).ok).toBe(false)
    expect(simulation.updateWorkerLinkTravelTime(link.value.id, 0.5).ok).toBe(true)
    simulation.tick(0.5)
    expect(node(simulation, 'research').slots[0].catId).toBe('cat-1')
    expect(simulation.disconnectWorkerLink(link.value.id).ok).toBe(true)
  })
})
