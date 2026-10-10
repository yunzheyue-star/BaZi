import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import PillarsGrid from '../components/PillarsGrid.vue'
import ShenshaList from '../components/ShenshaList.vue'
import { useChartStore } from '../stores/chart'

/**
 * 渲染层冒烟测试
 *
 * 挂载真实组件并断言渲染结果，比肉眼读截图可靠：
 *   - 计时口径必须是**两档**（真太阳时 / 平太阳时），不能出现第三档
 *   - 神煞面板的柱切换按钮与角标
 *   - 四柱／十神点击联动后神煞面板内容变化
 */
/** 建一个 pinia + store，并排一次盘（组件 v-if="result" 需要结果才渲染） */
function mountWithStore() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useChartStore()
  store.applyInput({ ...store.input })
  expect(store.result, '排盘应成功，否则组件不会渲染').not.toBeNull()
  return { store, pinia }
}

describe('PillarsGrid 渲染', () => {
  it('计时口径只有两档：真太阳时、平太阳时', () => {
    const { pinia } = mountWithStore()
    const wrapper = mount(PillarsGrid, { global: { plugins: [pinia] } })
    const buttons = wrapper.findAll('.clock-switch .segmented button').map((b) => b.text())
    expect(buttons).toEqual(['真太阳时', '平太阳时'])
    // 两档时钟对照条：标签也必须是短名，不出现「北京时间（平太阳时）」这类旧文案
    const labels = wrapper.findAll('.clocks .clock-label').map((l) => l.text())
    expect(labels).toEqual(['平太阳时', '真太阳时'])
  })

  it('两档时钟并列展示：平太阳时 10:33 / 真太阳时 10:13', () => {
    const { pinia } = mountWithStore()
    const wrapper = mount(PillarsGrid, { global: { plugins: [pinia] } })
    const clocks = wrapper.findAll('.clocks .clock').map((c) => c.text().replace(/\s+/g, ' '))
    expect(clocks).toHaveLength(2)
    expect(clocks[0]).toContain('10:33')
    expect(clocks[1]).toContain('10:13')
  })

  it('四柱全部可点，默认选中日柱', () => {
    const { store, pinia } = mountWithStore()
    const wrapper = mount(PillarsGrid, { global: { plugins: [pinia] } })
    const cards = wrapper.findAll('.pillar')
    expect(cards).toHaveLength(4)
    // 四张卡都可点（PillarCard 加 clickable 类）
    expect(wrapper.findAll('.pillar.clickable')).toHaveLength(4)
    expect(wrapper.findAll('.pillar.selected')).toHaveLength(1)
    expect(store.selectedPillar).toBe('day')
  })
})

describe('ShenshaList 渲染（随选中柱变化）', () => {
  it('四个柱切换按钮，角标数与本柱神煞数一致', () => {
    const { store, pinia } = mountWithStore()
    const wrapper = mount(ShenshaList, { global: { plugins: [pinia] } })
    const tabs = wrapper.findAll('.tabs button')
    expect(tabs).toHaveLength(4)
    // 角标必须等于 store 的按柱统计，不写死数字
    const per = store.shenshaPerPillar!
    const labels = ['年柱', '月柱', '日柱', '时柱']
    const keys = ['year', 'month', 'day', 'hour'] as const
    keys.forEach((key, i) => {
      expect(tabs[i]!.text().replace(/\s+/g, '')).toBe(
        `${labels[i]}${per.byPillar[key].length}`,
      )
    })
    // 四柱均应至少命中一项（2008 例确实如此）
    for (const key of keys) {
      expect(per.byPillar[key].length).toBeGreaterThan(0)
    }
  })

  it('点「月柱」后神煞面板内容随之切换', () => {
    const { store, pinia } = mountWithStore()
    const wrapper = mount(ShenshaList, { global: { plugins: [pinia] } })
    const before = wrapper.find('.current h3').text()
    expect(before).toContain('日柱')

    store.selectPillar('month')
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.find('.current h3').text()).toContain('月柱')
      // 月柱命中项应出现在列表里
      const names = wrapper.findAll('.hits .name').map((n) => n.text())
      expect(names).toEqual(store.selectedShenshaNames)
    })
  })
})
