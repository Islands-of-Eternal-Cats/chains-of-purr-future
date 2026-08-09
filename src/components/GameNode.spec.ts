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
          node: { id: 'research-1', type: 'research', name: 'Исследования', slots: [{ id: 'slot-1', catId: null }, { id: 'slot-2', catId: null }], scienceBuffer: 1.25, scienceReceived: 0, productionRate: 1, inputRate: 0 },
          cats: {},
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
    expect(onSlotClick).toHaveBeenCalledWith('research-1', 'slot-1', null)
  })
})
