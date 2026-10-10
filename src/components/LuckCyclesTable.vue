<script setup lang="ts">
/**
 * LuckCyclesTable：展示大运表。不排大运（数据来自 store.result.luckCycles）。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { GAN_COLOR, ZHI_COLOR } from '../core/constants'
import type { GanName, ZhiName } from '../core/constants'
import { useChartStore } from '../stores/chart'

const store = useChartStore()
const { result } = storeToRefs(store)

/** 大运方向与起运（取自 steps，避免组件复算） */
const summary = computed(() => {
  const step = result.value?.steps.find((s) => s.name === 'luckCycles')
  const output = step?.output as
    | { direction?: string; directionReason?: string; startAge?: number; startAgeExact?: number; daysToJie?: number }
    | undefined
  return output ?? {}
})
</script>

<template>
  <section v-if="result" class="card">
    <header class="head">
      <h2>大运</h2>
      <p class="hint">
        {{ summary.direction ?? '—' }}（{{ summary.directionReason ?? '—' }}）· 起运
        {{ summary.startAge ?? '—' }} 岁（{{ summary.startAgeExact ?? '—' }} 岁，距节
        {{ summary.daysToJie ?? '—' }} 天 ÷ 3）
      </p>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>步</th>
            <th>干支</th>
            <th>年龄区间</th>
            <th>交运年</th>
            <th>k</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="step in result.luckCycles" :key="step.n">
            <td>{{ step.n }}</td>
            <td class="ganzhi">
              <span :style="{ color: GAN_COLOR[step.stem as GanName] }">{{ step.stem }}</span>
              <span :style="{ color: ZHI_COLOR[step.branch as ZhiName] }">{{ step.branch }}</span>
            </td>
            <td>{{ step.ageRange }}</td>
            <td>{{ step.startYearLabel }}</td>
            <td class="muted">{{ step.k }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.head {
  margin-bottom: 12px;
}
.hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--c-muted);
}
.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th,
td {
  padding: 8px 10px;
  text-align: left;
  border-bottom: 1px solid var(--c-border);
  white-space: nowrap;
}
th {
  font-size: 12px;
  color: var(--c-muted);
  font-weight: 600;
}
tbody tr:hover {
  background: var(--c-chip);
}
.ganzhi span {
  font-size: 17px;
  font-weight: 700;
  font-family: 'Songti SC', 'SimSun', serif;
  margin-right: 2px;
}
.muted {
  color: var(--c-muted);
}
</style>
