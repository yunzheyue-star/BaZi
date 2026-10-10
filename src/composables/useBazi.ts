/**
 * useBazi：把 core 的 buildChart 包成组合式函数
 *
 * 组件与 store 都用它，避免组件直接 import core。
 * 本文件不含算法，只做「调用 + 状态」。
 */

import { computed, ref } from 'vue'
import type { ComputedRef, Ref } from 'vue'

import { buildChart } from '../core/chart'
import type { BuildChartOptions } from '../core/chart'
import type { ChartInput, ChartResult } from '../types/bazi'

export interface UseBaziReturn {
  result: Ref<ChartResult | null>
  error: Ref<string | null>
  loading: Ref<boolean>
  bazi: ComputedRef<string>
  hasResult: ComputedRef<boolean>
  run: (input: ChartInput, options?: BuildChartOptions) => ChartResult | null
  clear: () => void
}

/**
 * @param initial 可选初始输入：传入即立刻计算一次
 */
export function useBazi(initial?: ChartInput): UseBaziReturn {
  const result = ref<ChartResult | null>(null)
  const error = ref<string | null>(null)
  const loading = ref(false)

  const hasResult = computed(() => result.value !== null)
  const bazi = computed(() => result.value?.bazi ?? '')

  /**
   * 执行排盘。core 会抛中文错误，这里接住并写入 error，
   * 保证组件只关心 UI 状态、不写 try/catch。
   */
  function run(input: ChartInput, options?: BuildChartOptions): ChartResult | null {
    loading.value = true
    error.value = null
    try {
      const chart = buildChart({ ...input }, options)
      result.value = chart
      return chart
    } catch (e: unknown) {
      result.value = null
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  function clear(): void {
    result.value = null
    error.value = null
  }

  if (initial) run(initial)

  return { result, error, loading, bazi, hasResult, run, clear }
}
