import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GAME_BALANCE } from './core'
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
      />
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

    expect(wrapper.text()).toContain(`Торговый терминал · ${GAME_BALANCE.nodes.terminal.cost}`)
    expect(wrapper.findAll('.speed-button').map((button) => button.text())).toEqual(['Пауза', '×1', '×5', '×10'])
    await wrapper.find('.brand-mark').trigger('click')
    expect(wrapper.findAll('.speed-button').map((button) => button.text())).toEqual(['Пауза', '×1', '×5', '×10', '×100'])
    expect(window.localStorage.getItem('catmand-save-v1')).toBeNull()
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
})
