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

  it('moves a cat between exclusive slots and can return it to rest', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    expect(research.ok).toBe(true)
    if (!research.ok) return
    const cat = simulation.snapshot().cats[0]
    expect(simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id).ok).toBe(true)
    expect(simulation.assignCat(cat.id, research.value.id, research.value.slots[1].id).ok).toBe(true)
    const current = node(simulation, 'research')
    expect(current.slots.filter((slot) => slot.catId === cat.id)).toHaveLength(1)
    expect(simulation.releaseCat(cat.id).ok).toBe(true)
    expect(node(simulation, 'rest').slots.some((slot) => slot.catId === cat.id)).toBe(true)
  })

  it('produces data only with a research operator and only accepts valid directed links', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    expect(research.ok && server.ok).toBe(true)
    if (!research.ok || !server.ok) return
    expect(simulation.connect(server.value.id, research.value.id).ok).toBe(false)
    expect(simulation.connect(research.value.id, server.value.id).ok).toBe(true)
    simulation.tick(1)
    expect(node(simulation, 'research').scienceBuffer).toBe(0)
    const cat = simulation.snapshot().cats[0]
    simulation.assignCat(cat.id, research.value.id, research.value.slots[0].id)
    simulation.tick(1)
    expect(node(simulation, 'research').scienceBuffer).toBeCloseTo(0.5)
    expect(node(simulation, 'server').scienceReceived).toBeCloseTo(0.5)
  })

  it('removes an existing connection and rejects an unknown channel', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    if (!research.ok || !server.ok) return
    const connection = simulation.connect(research.value.id, server.value.id)
    if (!connection.ok) return
    expect(simulation.disconnect(connection.value.id).ok).toBe(true)
    expect(simulation.snapshot().connections).toHaveLength(0)
    expect(simulation.disconnect(connection.value.id).ok).toBe(false)
  })

  it('doubles server throughput with its operator and leaves excess in the source buffer', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    if (!research.ok || !server.ok) return
    simulation.connect(research.value.id, server.value.id)
    const firstCat = simulation.snapshot().cats[0]
    simulation.assignCat(firstCat.id, research.value.id, research.value.slots[0].id)
    simulation.hireCat()
    const secondCat = simulation.snapshot().cats.find((cat) => cat.id !== firstCat.id)!
    simulation.assignCat(secondCat.id, server.value.id, server.value.slots[0].id)
    simulation.tick(2)
    expect(node(simulation, 'server').inputRate).toBeCloseTo(1)
    expect(node(simulation, 'server').scienceReceived).toBeCloseTo(2)
    simulation.releaseCat(secondCat.id)
    simulation.tick(2)
    expect(node(simulation, 'server').inputRate).toBeCloseTo(0.5)
    expect(node(simulation, 'research').scienceBuffer).toBeCloseTo(1)
  })
})
