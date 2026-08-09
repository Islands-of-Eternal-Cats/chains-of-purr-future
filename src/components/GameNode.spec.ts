import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import GameNode from './GameNode.vue'

describe('GameNode', () => {
  it('renders node metrics and exposes worker-slot interaction', async () => {
    const onSlotClick = vi.fn()
    const wrapper = mount(GameNode, {
      props: {
        id: 'research-1',
        type: 'game',
        selected: false,
        connectable: true,
        position: { x: 0, y: 0 },
        dimensions: { width: 0, height: 0 },
        dragging: false,
        resizing: false,
        zIndex: 0,
        events: {} as any,
        data: {
          node: { id: 'research-1', type: 'research', name: 'Исследования', slots: [{ id: 'slot-1', catId: null, reservedByCatId: null, assignedCatId: null }, { id: 'slot-2', catId: null, reservedByCatId: null, assignedCatId: null }], scienceBuffer: 1.25, scienceReceived: 0, productionRate: 1, inputRate: 0 },
          cats: {},
          restWaitingCats: [],
          selectedCatId: null,
          selectedSlotId: null,
          onCatClick: vi.fn(),
          onSlotClick,
        },
      },
      global: { stubs: { Handle: true } },
    })
    expect(wrapper.text()).toContain('Выработка')
    expect(wrapper.text()).toContain('1.3')
    await wrapper.find('.worker-slot').trigger('click')
    expect(onSlotClick).toHaveBeenCalledWith('research-1', 'slot-1', null, null, null)
  })

  it('marks an exhausted worker without a route to rest', () => {
    const wrapper = mount(GameNode, {
      props: {
        id: 'research-1', type: 'game', selected: false, connectable: true, position: { x: 0, y: 0 }, dimensions: { width: 0, height: 0 }, dragging: false, resizing: false, zIndex: 0, events: {} as any,
        data: {
          node: { id: 'research-1', type: 'research', name: 'Исследования', slots: [{ id: 'slot-1', catId: 'cat-1', reservedByCatId: null, assignedCatId: 'cat-1' }], scienceBuffer: 0, scienceReceived: 0, productionRate: 0, inputRate: 0 },
          cats: { 'cat-1': { id: 'cat-1', name: 'Мира', variant: '◕', nodeId: 'research-1', slotId: 'slot-1', status: 'idle', travel: null, vigor: 0 } },
          restWaitingCats: [],
          selectedCatId: null, selectedSlotId: null, onCatClick: vi.fn(), onSlotClick: vi.fn(),
        },
      },
      global: { stubs: { Handle: true } },
    })
    expect(wrapper.find('.worker-slot').classes()).toContain('worker-slot--exhausted')
    expect(wrapper.text()).toContain('отдых недоступен')
  })

  it('marks an assigned cat red when it cannot reach the work slot', () => {
    const wrapper = mount(GameNode, {
      props: {
        id: 'research-1', type: 'game', selected: false, connectable: true, position: { x: 0, y: 0 }, dimensions: { width: 0, height: 0 }, dragging: false, resizing: false, zIndex: 0, events: {} as any,
        data: {
          node: { id: 'research-1', type: 'research', name: 'Исследования', slots: [{ id: 'slot-1', catId: null, reservedByCatId: null, assignedCatId: 'cat-1' }], scienceBuffer: 0, scienceReceived: 0, productionRate: 0, inputRate: 0 },
          cats: { 'cat-1': { id: 'cat-1', name: 'Мира', variant: '◕', nodeId: 'rest-1', slotId: 'rest-1-slot-1', status: 'idle', travel: null, vigor: 100 } },
          restWaitingCats: [],
          selectedCatId: null, selectedSlotId: null, onCatClick: vi.fn(), onSlotClick: vi.fn(),
        },
      },
      global: { stubs: { Handle: true } },
    })
    expect(wrapper.find('.worker-slot').classes()).toContain('worker-slot--unreachable')
    expect(wrapper.text()).toContain('путь недоступен')
  })

  it('shows an alert on a resting cat that cannot reach its assigned work', () => {
    const wrapper = mount(GameNode, {
      props: {
        id: 'rest-1', type: 'game', selected: false, connectable: true, position: { x: 0, y: 0 }, dimensions: { width: 0, height: 0 }, dragging: false, resizing: false, zIndex: 0, events: {} as any,
        data: {
          node: { id: 'rest-1', type: 'rest', name: 'Комната отдыха', slots: [{ id: 'rest-1-slot-1', catId: 'cat-1', reservedByCatId: null, assignedCatId: null }], scienceBuffer: 0, scienceReceived: 0, productionRate: 0, inputRate: 0 },
          cats: { 'cat-1': { id: 'cat-1', name: 'Мира', variant: '◕', nodeId: 'rest-1', slotId: 'rest-1-slot-1', status: 'idle', travel: null, vigor: 100 } },
          unreachableCatIds: ['cat-1'],
          restWaitingCats: [],
          selectedCatId: null, selectedSlotId: null, onCatClick: vi.fn(), onSlotClick: vi.fn(),
        },
      },
      global: { stubs: { Handle: true } },
    })
    expect(wrapper.find('.cat-route-warning').text()).toBe('!')
  })
})
