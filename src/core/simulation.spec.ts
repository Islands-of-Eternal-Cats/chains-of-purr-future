import { describe, expect, it } from 'vitest'
import { Simulation } from './simulation'

function node(simulation: Simulation, type: 'rest' | 'research' | 'server' | 'hub') {
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
  it('allows a research module to connect to multiple data servers', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const firstServer = simulation.createNode('server')
    const secondServer = simulation.createNode('server')
    if (!research.ok || !firstServer.ok || !secondServer.ok) throw new Error('Missing work node')

    expect(simulation.connect(research.value.id, firstServer.value.id)).toMatchObject({ ok: true })
    expect(simulation.connect(research.value.id, secondServer.value.id)).toMatchObject({ ok: true })
    expect(simulation.snapshot().connections).toEqual([
      expect.objectContaining({ sourceId: research.value.id, targetId: firstServer.value.id }),
      expect.objectContaining({ sourceId: research.value.id, targetId: secondServer.value.id }),
    ])
    expect(simulation.connect(research.value.id, firstServer.value.id)).toMatchObject({ ok: false, reason: expect.stringContaining('уже существует') })
  })

  it('allows creating every building type more than once', () => {
    const simulation = new Simulation()

    for (const type of ['rest', 'research', 'server'] as const) {
      expect(simulation.createNode(type).ok).toBe(true)
      expect(simulation.createNode(type).ok).toBe(true)
    }

    expect(simulation.snapshot().nodes.filter((candidate) => candidate.type === 'rest')).toHaveLength(3)
    expect(simulation.snapshot().nodes.filter((candidate) => candidate.type === 'research')).toHaveLength(2)
    expect(simulation.snapshot().nodes.filter((candidate) => candidate.type === 'server')).toHaveLength(2)
  })

  it('allows creating additional rest rooms and seats waiting cats in them', () => {
    const simulation = new Simulation()
    simulation.hireCat()
    simulation.hireCat()
    simulation.hireCat()

    const rest = simulation.createNode('rest')
    if (!rest.ok) throw new Error(rest.reason)

    expect(rest).toMatchObject({ ok: true, value: { type: 'rest', name: 'Комната отдыха' } })
    simulation.tick(0)
    expect(cat(simulation, 'cat-4')).toMatchObject({ nodeId: rest.value.id, slotId: `${rest.value.id}-slot-1` })
  })

  it('deletes an unused module and all of its links', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    if (!research.ok || !server.ok) throw new Error('Missing work node')
    const workerLink = simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    if (!workerLink.ok) throw new Error(workerLink.reason)
    simulation.connect(research.value.id, server.value.id)

    expect(simulation.deleteNode(research.value.id)).toMatchObject({ ok: true })
    expect(simulation.snapshot()).toMatchObject({
      nodes: expect.not.arrayContaining([expect.objectContaining({ id: research.value.id })]),
      connections: [],
      workerLinks: [],
    })
  })

  it('evacuates cats from a removed occupied module and keeps the base rest room', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error(research.reason)
    simulation.connectWorkerNodes('rest-1', research.value.id, 2)
    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    simulation.tick(2)

    expect(simulation.deleteNode(research.value.id)).toMatchObject({ ok: true })
    expect(cat(simulation)).toMatchObject({ nodeId: 'rest-1', slotId: 'rest-1-slot-1', status: 'idle', travel: null, stranded: null })
    expect(simulation.snapshot().nodes).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: research.value.id })]))
    expect(simulation.deleteNode('rest-1')).toMatchObject({ ok: false, reason: expect.stringContaining('Базовую') })
  })

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

  it('allows assigning a resting cat before full recovery, but sends it only at full vigor', () => {
    const simulation = new Simulation()
    const research = createResearch(simulation)
    simulation.hireCat()

    expect(simulation.assignCat('cat-2', research.id, research.slots[0].id)).toMatchObject({ ok: true })
    expect(node(simulation, 'research').slots[0]).toMatchObject({ assignedCatId: 'cat-2', reservedByCatId: null })
    expect(cat(simulation, 'cat-2')).toMatchObject({ nodeId: 'rest-1', status: 'idle', vigor: 0 })

    simulation.tick(4.9)
    expect(cat(simulation, 'cat-2')).toMatchObject({ status: 'idle', vigor: 98 })
    simulation.tick(0.1)
    expect(cat(simulation, 'cat-2')).toMatchObject({ status: 'travelling', vigor: 100 })
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

  it('keeps a full cat assigned without a route and starts the journey when a route appears', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error(research.reason)

    expect(simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)).toMatchObject({ ok: true })
    expect(node(simulation, 'research').slots[0]).toMatchObject({ assignedCatId: 'cat-1', reservedByCatId: null })
    expect(cat(simulation)).toMatchObject({ nodeId: 'rest-1', status: 'idle', vigor: 100 })

    simulation.tick(1)
    expect(cat(simulation)).toMatchObject({ nodeId: 'rest-1', status: 'idle', vigor: 100 })

    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    simulation.tick(0)
    expect(cat(simulation)).toMatchObject({ status: 'travelling' })
    simulation.tick(0.5)
    expect(node(simulation, 'research').productionRate).toBe(0)
    simulation.tick(0.5)
    expect(node(simulation, 'research').slots[0].catId).toBe('cat-1')
    simulation.tick(1)
    expect(node(simulation, 'research').scienceBuffer).toBeCloseTo(1)
  })

  it('scales research output with the number of occupied work slots', () => {
    const simulation = new Simulation()
    const research = createResearch(simulation)
    simulation.hireCat()
    simulation.tick(5)

    expect(simulation.assignCat('cat-1', research.id, research.slots[0].id).ok).toBe(true)
    expect(simulation.assignCat('cat-2', research.id, research.slots[1].id).ok).toBe(true)
    simulation.tick(1)
    simulation.tick(1)

    expect(node(simulation, 'research').productionRate).toBe(2)
    expect(node(simulation, 'research').scienceBuffer).toBeCloseTo(2)
  })

  it('recalculates the globally fastest remaining route at each hub', () => {
    const simulation = new Simulation()
    const server = simulation.createNode('server')
    const first = simulation.createNode('hub')
    const slow = simulation.createNode('hub')
    const fast = simulation.createNode('hub')
    const destination = simulation.createNode('hub')
    if (!server.ok || !first.ok || !slow.ok || !fast.ok || !destination.ok) throw new Error('Missing network node')
    simulation.connectWorkerNodes('rest-1', first.value.id, 1, 'road', 'west')
    simulation.connectWorkerNodes(first.value.id, slow.value.id, 1, 'north', 'west')
    simulation.connectWorkerNodes(first.value.id, fast.value.id, 2, 'east', 'west')
    simulation.connectWorkerNodes(slow.value.id, destination.value.id, 20, 'east', 'west')
    simulation.connectWorkerNodes(fast.value.id, destination.value.id, 1, 'east', 'south')
    simulation.connectWorkerNodes(destination.value.id, server.value.id, 1, 'east', 'road')

    expect(simulation.assignCat('cat-1', server.value.id, server.value.slots[0].id).ok).toBe(true)
    expect(cat(simulation).travel).toMatchObject({ kind: 'road', leg: { toNodeId: first.value.id } })
    simulation.tick(1)
    expect(cat(simulation).travel).toMatchObject({ kind: 'road', leg: { toNodeId: fast.value.id } })
    simulation.tick(4)
    expect(node(simulation, 'server').slots[0].catId).toBe('cat-1')
  })

  it('updates data throughput only for arrived workers and slows the server without its operator', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    const hub = simulation.createNode('hub')
    if (!research.ok || !server.ok || !hub.ok) throw new Error('Missing work node')
    simulation.connect(research.value.id, server.value.id)
    simulation.connectWorkerNodes('rest-1', hub.value.id, 1, 'road', 'west')
    simulation.connectWorkerNodes(hub.value.id, research.value.id, 1, 'north', 'road')
    simulation.connectWorkerNodes(hub.value.id, server.value.id, 1, 'east', 'road')
    simulation.hireCat()
    simulation.tick(5)

    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    simulation.assignCat('cat-2', server.value.id, server.value.slots[0].id)
    simulation.tick(1)
    simulation.tick(1)
    simulation.tick(1)
    simulation.tick(1)
    expect(node(simulation, 'server').inputRate).toBeCloseTo(1)
    expect(node(simulation, 'server').scienceReceived).toBeCloseTo(2)
    simulation.releaseCat('cat-2')
    simulation.tick(1)
    simulation.tick(2)
    expect(node(simulation, 'server').inputRate).toBeCloseTo(0.5)
  })

  it('returns a travelling cat to its current leg source when removing its link', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error(research.reason)
    const link = simulation.connectWorkerNodes('rest-1', research.value.id, 4)
    if (!link.ok) throw new Error(link.reason)

    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    expect(simulation.updateWorkerLinkTravelTime(link.value.id, 0.5).ok).toBe(true)
    simulation.tick(0.25)
    expect(simulation.disconnectWorkerLink(link.value.id).ok).toBe(true)
    expect(cat(simulation)).toMatchObject({ nodeId: 'rest-1', status: 'stranded', travel: null, stranded: { targetNodeId: research.value.id } })
    expect(node(simulation, 'research').slots[0].reservedByCatId).toBe('cat-1')
  })

  it('reroutes a returned cat immediately after removing its current link', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const first = simulation.createNode('hub')
    const detour = simulation.createNode('hub')
    const last = simulation.createNode('hub')
    if (!research.ok || !first.ok || !detour.ok || !last.ok) throw new Error('Missing node')

    simulation.connectWorkerNodes('rest-1', first.value.id, 1, 'road', 'west')
    const direct = simulation.connectWorkerNodes(first.value.id, last.value.id, 2, 'east', 'west')
    simulation.connectWorkerNodes(first.value.id, detour.value.id, 1, 'north', 'west')
    simulation.connectWorkerNodes(detour.value.id, last.value.id, 1, 'east', 'north')
    simulation.connectWorkerNodes(last.value.id, research.value.id, 1, 'east', 'road')
    if (!direct.ok) throw new Error(direct.reason)

    expect(simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id).ok).toBe(true)
    simulation.tick(1.5)
    expect(cat(simulation).travel).toMatchObject({ kind: 'road', leg: { linkId: direct.value.id } })

    expect(simulation.disconnectWorkerLink(direct.value.id).ok).toBe(true)
    expect(cat(simulation)).toMatchObject({ nodeId: first.value.id, status: 'travelling', stranded: null })
    expect(cat(simulation).travel).toMatchObject({ kind: 'road', leg: { toNodeId: detour.value.id } })
  })

  it('limits regular modules to one road and each hub side to one road', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    const hub = simulation.createNode('hub')
    if (!research.ok || !server.ok || !hub.ok) throw new Error('Missing node')

    expect(simulation.connectWorkerNodes('rest-1', hub.value.id, 1, 'road', 'north').ok).toBe(true)
    expect(simulation.connectWorkerNodes('rest-1', research.value.id, 1, 'road', 'road')).toMatchObject({ ok: false })
    expect(simulation.connectWorkerNodes(hub.value.id, research.value.id, 1, 'north', 'road')).toMatchObject({ ok: false })
    expect(simulation.connectWorkerNodes(hub.value.id, research.value.id, 1, 'east', 'road').ok).toBe(true)
    expect(simulation.connectWorkerNodes(hub.value.id, server.value.id, 1, 'south', 'road').ok).toBe(true)
  })

  it('strands cats at a selected surviving hub and resumes them after reconnection', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const first = simulation.createNode('hub')
    const rescue = simulation.createNode('hub')
    if (!research.ok || !first.ok || !rescue.ok) throw new Error('Missing node')
    simulation.connectWorkerNodes('rest-1', first.value.id, 1, 'road', 'west')
    simulation.connectWorkerNodes(first.value.id, research.value.id, 2, 'east', 'road')
    expect(simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id).ok).toBe(true)

    expect(simulation.deleteRoadHub(first.value.id, { 'cat-1': rescue.value.id }).ok).toBe(true)
    expect(cat(simulation)).toMatchObject({ nodeId: rescue.value.id, status: 'stranded', stranded: { targetNodeId: research.value.id } })
    expect(node(simulation, 'research').slots[0].reservedByCatId).toBe('cat-1')
    simulation.connectWorkerNodes(rescue.value.id, research.value.id, 1, 'west', 'road')
    expect(cat(simulation)).toMatchObject({ status: 'travelling', stranded: null })
    simulation.tick(1)
    expect(node(simulation, 'research').slots[0].catId).toBe('cat-1')
  })

  it('keeps blocked nodes out of roads, work, and route calculation', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error('Missing research')

    expect(simulation.setNodeBlocked(research.value.id, true).ok).toBe(true)
    expect(simulation.connectWorkerNodes('rest-1', research.value.id, 1)).toMatchObject({ ok: false, reason: expect.stringContaining('Перекрытый') })
    expect(simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)).toMatchObject({ ok: false, reason: expect.stringContaining('Перекрытый') })
    expect(simulation.snapshot().nodes.find((node) => node.id === research.value.id)).toMatchObject({ blocked: true })
  })
})

describe('Simulation flight era', () => {
  function unlockFlight(simulation: Simulation) {
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    if (!research.ok || !server.ok) throw new Error('Missing flight research setup')
    const road = simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    if (!road.ok) throw new Error(road.reason)
    simulation.connect(research.value.id, server.value.id)
    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    for (let second = 0; second < 240 && !simulation.snapshot().flightUnlocked; second += 1) simulation.tick(1)
    if (!simulation.snapshot().flightUnlocked) throw new Error('Flight did not unlock')
    return { research: research.value, server: server.value, road: road.value }
  }

  it('unlocks at 50 data units and sends cats directly at twice road speed', () => {
    const simulation = new Simulation()
    const { road } = unlockFlight(simulation)
    const totalData = simulation.snapshot().nodes.reduce((total, candidate) => total + candidate.scienceReceived, 0)
    expect(totalData).toBe(50)
    expect(simulation.snapshot().flightUnlocked).toBe(true)

    const destination = simulation.createNode('research')
    const other = simulation.createNode('server')
    if (!destination.ok || !other.ok) throw new Error('Missing flight destination')
    simulation.setNodePosition('rest-1', { x: 0, y: 0 })
    simulation.setNodePosition(destination.value.id, { x: 500, y: 0 })
    simulation.hireCat()
    simulation.tick(5)

    expect(simulation.assignCat('cat-2', destination.value.id, destination.value.slots[0].id)).toMatchObject({ ok: true })
    expect(cat(simulation, 'cat-2').travel).toMatchObject({ kind: 'flight', fromSlotId: 'rest-1-slot-2', flightDurationSeconds: 1, flightProgress: 0 })
    expect(simulation.connectWorkerNodes(destination.value.id, other.value.id, 1)).toMatchObject({ ok: true })
    expect(simulation.createNode('hub')).toMatchObject({ ok: true })

    expect(simulation.disconnectWorkerLink(road.id)).toMatchObject({ ok: true })
    simulation.tick(0.5)
    expect(cat(simulation, 'cat-2').travel).toMatchObject({ kind: 'flight', flightProgress: 0.5 })
    simulation.tick(0.5)
    expect(simulation.snapshot().nodes.find((candidate) => candidate.id === destination.value.id)?.slots.some((slot) => slot.catId === 'cat-2')).toBe(true)
  })

  it('resumes a stranded cat by flight once stored science reaches the threshold', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    if (!research.ok || !server.ok) throw new Error('Missing stranded setup')
    const road = simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    if (!road.ok) throw new Error(road.reason)
    simulation.setNodePosition('rest-1', { x: 0, y: 0 })
    simulation.setNodePosition(research.value.id, { x: 500, y: 0 })
    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    for (let second = 0; second < 160 && node(simulation, 'research').scienceBuffer < 50; second += 1) simulation.tick(1)

    for (let second = 0; second < 20 && !(cat(simulation).nodeId === research.value.id && cat(simulation).status === 'idle'); second += 1) simulation.tick(1)
    expect(simulation.releaseCat('cat-1')).toMatchObject({ ok: true })
    expect(simulation.disconnectWorkerLink(road.value.id)).toMatchObject({ ok: true })
    expect(cat(simulation)).toMatchObject({ status: 'stranded', stranded: { targetNodeId: 'rest-1' } })

    simulation.connect(research.value.id, server.value.id)
    for (let second = 0; second < 120 && !simulation.snapshot().flightUnlocked; second += 1) simulation.tick(1)
    expect(simulation.snapshot().flightUnlocked).toBe(true)
    expect(cat(simulation).travel).toMatchObject({ kind: 'flight', targetNodeId: 'rest-1', flightProgress: 0 })
  })

  it('finishes an active road leg before switching to direct flight at a hub', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    const hub = simulation.createNode('hub')
    if (!research.ok || !server.ok || !hub.ok) throw new Error('Missing transition setup')
    const firstRoad = simulation.connectWorkerNodes('rest-1', hub.value.id, 20, 'road', 'west')
    const secondRoad = simulation.connectWorkerNodes(hub.value.id, research.value.id, 1, 'east', 'road')
    if (!firstRoad.ok || !secondRoad.ok) throw new Error('Missing transition road')
    simulation.setNodePosition('rest-1', { x: 0, y: 0 })
    simulation.setNodePosition(hub.value.id, { x: 1000, y: 0 })
    simulation.setNodePosition(research.value.id, { x: 2000, y: 0 })
    simulation.connect(research.value.id, server.value.id)
    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    simulation.hireCat()
    simulation.tick(5)
    for (let second = 0; second < 320 && simulation.snapshot().nodes.reduce((total, candidate) => total + candidate.scienceReceived, 0) < 46; second += 1) simulation.tick(1)

    expect(simulation.assignCat('cat-2', research.value.id, research.value.slots[1].id)).toMatchObject({ ok: true })
    for (let second = 0; second < 20 && !simulation.snapshot().flightUnlocked; second += 1) simulation.tick(1)
    const travelling = cat(simulation, 'cat-2').travel
    expect(travelling).toMatchObject({ kind: 'road', leg: { toNodeId: hub.value.id } })
    if (!travelling || travelling.kind !== 'road') throw new Error('Cat did not remain on the road')

    simulation.tick(firstRoad.value.travelSeconds * (1 - travelling.legProgress))
    expect(cat(simulation, 'cat-2').travel).toMatchObject({ kind: 'flight', fromNodeId: hub.value.id, targetNodeId: research.value.id })
    expect(simulation.disconnectWorkerLink(firstRoad.value.id)).toMatchObject({ ok: true })
    expect(cat(simulation, 'cat-2').travel).toMatchObject({ kind: 'flight' })
  })
})
