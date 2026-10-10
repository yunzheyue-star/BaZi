import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import App from '../App.vue'
import { useChartStore } from '../stores/chart'

describe('App', () => {
  it('挂载后渲染标题，并用默认输入排出 2008 例', async () => {
    setActivePinia(createPinia())
    const wrapper = mount(App, { global: { plugins: [createPinia()] } })

    expect(wrapper.text()).toContain('四柱八字排盘')

    // onMounted 里会调用 store.calculate()，等一拍再断言
    await new Promise((resolve) => setTimeout(resolve, 0))
    const store = useChartStore()
    expect(store.result?.bazi).toBe('戊子 己未 丁巳 乙巳')
    expect(wrapper.text()).toContain('戊子')
  })
})
