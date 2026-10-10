<script setup lang="ts">
/**
 * LuckCyclesTable：展示大运表。
 *
 * 点击某一步大运 → 设为当前步，流年表随即切换到该步覆盖的年份区间。
 * 排运逻辑在 core，组件只做展示与选中（选中态在 store）。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { GAN_COLOR, ZHI_COLOR } from '../core/constants'
import type { GanName, ZhiName } from '../core/constants'
import { useChartStore } from '../stores/chart'

const store = useChartStore()
const { result, selectedLuckN, selectedLuck } = storeToRefs(store)

/** 大运方向与起运（取自 steps，避免组件复算） */
const summary = computed(() => {
  const step = result.value?.steps.find((s) => s.name === 'luckCycles')
  const output = step?.output as
    | {
        direction?: string
        directionReason?: string
        startAge?: number
        startAgeExact?: number
        daysToJie?: number
      }
    | undefined
  return output ?? {}
})

function pick(n: number): void {
  store.selectLuck(n)
}
</script>

<template>
  <section v-if="result" class="card">
    <header class="head">
      <div>
        <h2>大运</h2>
        <p class="hint">
          {{ summary.direction ?? '—' }}（{{ summary.directionReason ?? '—' }}）· 起运
          {{ summary.startAge ?? '—' }} 岁（{{ summary.startAgeExact ?? '—' }} 岁，距节
          {{ summary.daysToJie ?? '—' }} 天 ÷ 3）
        </p>
      </div>
      <span class="tip">点击任意一步，下方流年切到该步</span>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>步</th>
            <th>干支</th>
            <th>年龄区间</th>
            <th>流年区间</th>
            <th>k</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="step in result.luckCycles"
            :key="step.n"
            class="clickable"
            :class="{ selected: selectedLuckN === step.n }"
            role="button"
            tabindex="0"
            @click="pick(step.n)"
            @keydown.enter.prevent="pick(step.n)"
            @keydown.space.prevent="pick(step.n)"
          >
            <td>{{ step.n }}</td>
            <td class="ganzhi">
              <span :style="{ color: GAN_COLOR[step.stem as GanName] }">{{ step.stem }}</span>
              <span :style="{ color: ZHI_COLOR[step.branch as ZhiName] }">{{ step.branch }}</span>
            </td>
            <td>{{ step.ageRange }}</td>
            <td>{{ step.coveredLabel }}</td>
            <td class="muted">{{ step.k }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="selectedLuck" class="current">
      当前查看：第 {{ selectedLuck.n }} 步
      <b>{{ selectedLuck.ganzhi }}</b> 运（{{ selectedLuck.ageRange }} ·
      {{ selectedLuck.coveredLabel }} 年）
      <button type="button" class="clear" @click="store.selectLuck(selectedLuck.n)">
        取消选中
      </button>
    </p>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.head h2 {
  margin: 0;
}
.hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--c-muted);
}
.tip {
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
tr.clickable {
  cursor: pointer;
}
tr.clickable:hover {
  background: var(--c-chip);
}
tr.selected {
  background: color-mix(in srgb, var(--c-primary) 14%, transparent);
}
tr.selected td {
  font-weight: 600;
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
.current {
  margin: 12px 0 0;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.clear {
  padding: 3px 10px;
  border: 1px solid var(--c-border);
  border-radius: 999px;
  background: var(--c-input);
  color: var(--c-muted);
  font-size: 12px;
  cursor: pointer;
}
.clear:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
</style>
