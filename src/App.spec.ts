import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_BALANCE, Simulation } from './core'
import App from './App.vue'

const VueFlowStub = {
  props: ['nodes', 'edges', 'isValidConnection'],
  emits: ['connect'],
  template: `
    <div class="flow-stub">
      <i
        v-for="node in nodes"
        :key="node.id"
        class="flow-node-stub"
        :data-node-id="node.id"
        :data-blocked="String(node.data.blocked)"
      />
      <i
        v-for="edge in edges.filter((candidate) => isValidConnection(candidate))"
        :key="edge.id"
        class="flow-edge-stub"
        :data-edge-id="edge.id"
        :data-label="edge.label"
      />
      <template v-for="node in nodes" :key="node.id + '-slots'">
        <button
          v-for="slot in node.data.node.slots"
          :key="slot.id"
          type="button"
          class="flow-slot-stub"
          :class="'slot-' + slot.id"
          :data-cat="slot.catId"
          :data-reserved="slot.reservedByCatId"
          :data-assigned="slot.assignedCatId"
          @click="node.data.onSlotClick(node.id, slot.id, slot.catId, slot.reservedByCatId, slot.assignedCatId)"
        />
      </template>
      <button
        class="connect-research-server"
        type="button"
        @click="$emit('connect', { source: 'research-1', target: 'server-2', sourceHandle: 'data-out', targetHandle: 'data-in' })"
      />
      <button
        class="connect-server-terminal"
        type="button"
        @click="$emit('connect', { source: 'server-2', target: 'terminal-3', sourceHandle: 'data-out', targetHandle: 'data-in' })"
      />
    </div>
  `,
}

describe('App economy controls', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value) },
      removeItem: (key: string) => { values.delete(key) },
      clear: () => values.clear(),
      key: (index: number) => [...values.keys()][index] ?? null,
      get length() { return values.size },
    }
    Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })

  it('shows prices from GAME_BALANCE and reveals ×100 only through the brand mark', async () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          VueFlow: VueFlowStub,
        },
      },
    })

    expect(wrapper.text()).toContain(`Торговый терминал · ${GAME_BALANCE.nodes.terminal.cost}.00`)
    expect(wrapper.find('.science-readout').text()).toContain('0.00/ 0.00')
    expect(wrapper.find('.economy-readout strong').text()).toBe('1000.00')
    expect(wrapper.findAll('.speed-button').map((button) => button.text())).toEqual(['Пауза', '×1.00', '×5.00', '×10.00'])
    await wrapper.find('.brand-mark').trigger('click')
    expect(wrapper.findAll('.speed-button').map((button) => button.text())).toEqual(['Пауза', '×1.00', '×5.00', '×10.00', '×100.00'])
    expect(wrapper.text()).not.toContain('Вернуть выбранного кота')
    expect(window.localStorage.getItem('catmand-save-v1')).toBeNull()
    wrapper.unmount()
  })

  it('uses precise shared formatting for totals, credits, and road travel time', () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error(research.reason)
    simulation.connectWorkerNodes('rest-1', research.value.id, 0.625)
    const save = simulation.exportSave()
    save.simulation.scienceProgress = 12.345
    save.simulation.nodes.find((node) => node.id === 'rest-1')!.dataBuffer = 0.25
    save.simulation.economy.credits = 999.255
    window.localStorage.setItem('catmand-save-v1', JSON.stringify(save))

    const wrapper = mount(App, {
      global: { stubs: { VueFlow: VueFlowStub } },
    })

    expect(wrapper.find('.science-readout strong').text()).toBe('12.35')
    expect(wrapper.find('.science-readout em').text()).toBe('/ 0.25')
    expect(wrapper.find('.economy-readout strong').text()).toBe('999.26')
    expect(wrapper.find('[data-label="0.63с"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps the default data nodes apart and renders both validated data edges', async () => {
    const wrapper = mount(App, {
      global: { stubs: { VueFlow: VueFlowStub } },
    })

    const buttons = wrapper.findAll('.action-button')
    await buttons.find((button) => button.text().includes('Исследования ·'))!.trigger('click')
    await buttons.find((button) => button.text().includes('Сервер ·'))!.trigger('click')
    await buttons.find((button) => button.text().includes('Торговый терминал ·'))!.trigger('click')

    expect(wrapper.find('[data-node-id="research-1"]').attributes('data-blocked')).toBe('false')
    expect(wrapper.find('[data-node-id="server-2"]').attributes('data-blocked')).toBe('false')
    expect(wrapper.find('[data-node-id="terminal-3"]').attributes('data-blocked')).toBe('false')

    await wrapper.find('.connect-research-server').trigger('click')
    expect(wrapper.find('[data-edge-id="data-research-1--server-2"]').exists()).toBe(true)

    await wrapper.find('.connect-server-terminal').trigger('click')
    expect(wrapper.find('[data-edge-id="data-server-2--terminal-3"]').exists()).toBe(true)
    expect(wrapper.findAll('.flow-edge-stub')).toHaveLength(2)
    wrapper.unmount()
  })

  it('selects a working cat first, supports Escape, and then transfers it directly to another module', async () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    const hub = simulation.createNode('hub')
    if (!research.ok || !server.ok || !hub.ok) throw new Error('Missing transfer setup')
    simulation.connectWorkerNodes('rest-1', hub.value.id, 1, 'road', 'west')
    simulation.connectWorkerNodes(hub.value.id, research.value.id, 1, 'north', 'road')
    simulation.connectWorkerNodes(hub.value.id, server.value.id, 1, 'east', 'road')
    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    simulation.tick(2)
    window.localStorage.setItem('catmand-save-v1', JSON.stringify(simulation.exportSave()))

    const wrapper = mount(App, { global: { stubs: { VueFlow: VueFlowStub } } })
    const sourceSelector = `.slot-${research.value.slots[0].id}`
    const targetSelector = `.slot-${server.value.slots[0].id}`

    await wrapper.find(sourceSelector).trigger('click')
    expect(wrapper.find('.graph-status').text()).toContain('Выберите новое рабочее место')
    expect(wrapper.find(sourceSelector).attributes('data-cat')).toBe('cat-1')

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.graph-status').text()).toContain('отменён')
    expect(wrapper.find(sourceSelector).attributes('data-cat')).toBe('cat-1')

    await wrapper.find(sourceSelector).trigger('click')
    await wrapper.find(targetSelector).trigger('click')
    expect(wrapper.find(sourceSelector).attributes('data-cat')).toBeUndefined()
    expect(wrapper.find(sourceSelector).attributes('data-assigned')).toBeUndefined()
    expect(wrapper.find(targetSelector).attributes('data-assigned')).toBe('cat-1')
    expect(wrapper.find(targetSelector).attributes('data-reserved')).toBe('cat-1')
    expect(wrapper.find('.graph-status').text()).toContain('идёт к модулю')
    wrapper.unmount()
  })

  it('sends a selected worker to rest on the second click of its source slot', async () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error(research.reason)
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    simulation.tick(1)
    window.localStorage.setItem('catmand-save-v1', JSON.stringify(simulation.exportSave()))

    const wrapper = mount(App, { global: { stubs: { VueFlow: VueFlowStub } } })
    const sourceSelector = `.slot-${research.value.slots[0].id}`
    await wrapper.find(sourceSelector).trigger('click')
    await wrapper.find(sourceSelector).trigger('click')

    expect(wrapper.find(sourceSelector).attributes('data-cat')).toBeUndefined()
    expect(wrapper.find(sourceSelector).attributes('data-assigned')).toBeUndefined()
    expect(wrapper.findAll('.flow-slot-stub').some((slot) => slot.attributes('data-reserved') === 'cat-1')).toBe(true)
    expect(wrapper.find('.graph-status').text()).toContain('снят с работы')
    wrapper.unmount()
  })

  it('selects a resting assignment, replaces another cat selection, and clears it on repeat', async () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error(research.reason)
    simulation.connectWorkerNodes('rest-1', research.value.id, 1)
    simulation.hireCat()
    simulation.assignCat('cat-2', research.value.id, research.value.slots[0].id)
    window.localStorage.setItem('catmand-save-v1', JSON.stringify(simulation.exportSave()))

    const wrapper = mount(App, { global: { stubs: { VueFlow: VueFlowStub } } })
    const sourceSelector = `.slot-${research.value.slots[0].id}`
    await wrapper.find('.slot-rest-1-slot-1').trigger('click')
    expect(wrapper.find('.graph-status').text()).toContain('Мира выбран')

    await wrapper.find(sourceSelector).trigger('click')
    expect(wrapper.find('.graph-status').text()).toContain('Нокс выбран')
    expect(wrapper.find(sourceSelector).attributes('data-assigned')).toBe('cat-2')

    await wrapper.find(sourceSelector).trigger('click')
    expect(wrapper.find(sourceSelector).attributes('data-assigned')).toBeUndefined()
    expect(wrapper.find('.graph-status').text()).toContain('больше не закреплён')
    wrapper.unmount()
  })

  it('selects and cancels an active work destination on the repeated click', async () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    if (!research.ok) throw new Error(research.reason)
    simulation.connectWorkerNodes('rest-1', research.value.id, 4)
    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    window.localStorage.setItem('catmand-save-v1', JSON.stringify(simulation.exportSave()))

    const wrapper = mount(App, { global: { stubs: { VueFlow: VueFlowStub } } })
    const targetSelector = `.slot-${research.value.slots[0].id}`
    await wrapper.find(targetSelector).trigger('click')
    expect(wrapper.find('.graph-status').text()).toContain('новую рабочую цель')
    expect(wrapper.find(targetSelector).attributes('data-reserved')).toBe('cat-1')

    await wrapper.find(targetSelector).trigger('click')
    expect(wrapper.find(targetSelector).attributes('data-reserved')).toBeUndefined()
    expect(wrapper.find(targetSelector).attributes('data-assigned')).toBeUndefined()
    expect(wrapper.find('.slot-rest-1-slot-1').attributes('data-cat')).toBe('cat-1')
    expect(wrapper.find('.graph-status').text()).toContain('возвращается отдыхать')
    wrapper.unmount()
  })

  it('redirects a cat selected through its active work destination', async () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    const hub = simulation.createNode('hub')
    if (!research.ok || !server.ok || !hub.ok) throw new Error('Missing redirect setup')
    simulation.connectWorkerNodes('rest-1', hub.value.id, 1, 'road', 'west')
    simulation.connectWorkerNodes(hub.value.id, research.value.id, 1, 'north', 'road')
    simulation.connectWorkerNodes(hub.value.id, server.value.id, 1, 'east', 'road')
    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    window.localStorage.setItem('catmand-save-v1', JSON.stringify(simulation.exportSave()))

    const wrapper = mount(App, { global: { stubs: { VueFlow: VueFlowStub } } })
    const oldTarget = `.slot-${research.value.slots[0].id}`
    const newTarget = `.slot-${server.value.slots[0].id}`
    await wrapper.find(oldTarget).trigger('click')
    await wrapper.find(newTarget).trigger('click')

    expect(wrapper.find(oldTarget).attributes('data-assigned')).toBeUndefined()
    expect(wrapper.find(oldTarget).attributes('data-reserved')).toBeUndefined()
    expect(wrapper.find(newTarget).attributes('data-assigned')).toBe('cat-1')
    expect(wrapper.find(newTarget).attributes('data-reserved')).toBe('cat-1')
    expect(wrapper.find('.graph-status').text()).toContain('идёт к модулю')
    wrapper.unmount()
  })

  it('keeps a return-to-rest target while assigning the selected cat future work', async () => {
    const simulation = new Simulation()
    const research = simulation.createNode('research')
    const server = simulation.createNode('server')
    const hub = simulation.createNode('hub')
    if (!research.ok || !server.ok || !hub.ok) throw new Error('Missing future-work setup')
    simulation.connectWorkerNodes('rest-1', hub.value.id, 1, 'road', 'west')
    simulation.connectWorkerNodes(hub.value.id, research.value.id, 1, 'north', 'road')
    simulation.connectWorkerNodes(hub.value.id, server.value.id, 1, 'east', 'road')
    simulation.assignCat('cat-1', research.value.id, research.value.slots[0].id)
    simulation.tick(2)
    simulation.releaseCat('cat-1')
    window.localStorage.setItem('catmand-save-v1', JSON.stringify(simulation.exportSave()))

    const wrapper = mount(App, { global: { stubs: { VueFlow: VueFlowStub } } })
    const restTarget = '.slot-rest-1-slot-1'
    const futureWork = `.slot-${server.value.slots[0].id}`
    await wrapper.find(restTarget).trigger('click')
    await wrapper.find(restTarget).trigger('click')
    expect(wrapper.find(restTarget).attributes('data-reserved')).toBe('cat-1')
    expect(wrapper.find('.graph-status').text()).toContain('продолжает путь на отдых')

    await wrapper.find(futureWork).trigger('click')
    expect(wrapper.find(restTarget).attributes('data-reserved')).toBe('cat-1')
    expect(wrapper.find(futureWork).attributes('data-assigned')).toBe('cat-1')
    expect(wrapper.find(futureWork).attributes('data-reserved')).toBeUndefined()
    expect(wrapper.find('.graph-status').text()).toContain('после отдыха')
    wrapper.unmount()
  })
})
