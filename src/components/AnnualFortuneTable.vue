<script setup lang="ts">
/**
 * AnnualFortuneTable：展示流年。
 *
 * 数据来自 store.annualsOfSelectedLuck —— 未选大运时显示全部流年，
 * 选中某步大运后只显示该步覆盖的年份区间（联动由 store 计算）。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { GAN_COLOR, ZHI_COLOR } from '../core/constants'
import type { GanName, ZhiName } from '../core/constants'
import { useChartStore } from '../stores/chart'

const store = useChartStore()
const { result, selectedLuckN, selectedLuck, annualsOfSelectedLuck } = storeToRefs(store)

/** 当前显示的流年列表 */
const rows = computed(() => annualsOfSelectedLuck.value)

/** 标题里的年份范围描述 */
const rangeLabel = computed(() => {
  if (selectedLuckN.value !== null && selectedLuck.value) {
    return `${selectedLuck.value.ganzhi} 运 · ${selectedLuck.value.coveredLabel} 年`
  }
  const list = result.value?.annualFortunes ?? []
  if (list.length === 0) return '—'
  return `全部流年 · ${list[0]!.year}–${list[list.length - 1]!.year} 年`
})

/** 未选中大运时给一句提示 */
const hint = computed(() =>
  selectedLuckN.value === null
    ? 'k_year(Y) = (Y − 4) mod 60；在上方大运表点击某一步可只看该步流年'
    : '仅显示所选大运覆盖的年份；再次点击该步（或点「取消选中」）可恢复全部',
)
</script>

<template>
  <section v-if="result" class="card">
    <header class="head">
      <div>
        <h2>流年 · {{ rangeLabel }}</h2>
        <p class="hint">{{ hint }}</p>
      </div>
      <button
        v-if="selectedLuckN !== null"
        type="button"
        class="clear"
        @click="store.selectLuck(selectedLuckN)"
      >
        显示全部流年
      </button>
    </header>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>年份</th>
            <th>干支</th>
            <th>十神</th>
            <th>虚岁</th>
            <th>与日支</th>
            <th>k</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in rows" :key="item.year">
            <td>{{ item.year }}</td>
            <td class="ganzhi">
              <span :style="{ color: GAN_COLOR[item.stem as GanName] }">{{ item.stem }}</span>
              <span :style="{ color: ZHI_COLOR[item.branch as ZhiName] }">{{ item.branch }}</span>
            </td>
            <td>{{ item.stemTenGod }}</td>
            <td class="muted">{{ item.age }}</td>
            <td>
              <span
                :class="[
                  'rel',
                  item.branchRelation === '六冲' ? 'chong' : item.branchRelation === '六合' ? 'he' : '',
                ]"
              >
                {{ item.branchRelation }}
              </span>
            </td>
            <td class="muted">{{ item.k }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td colspan="6" class="empty">该区间暂无流年数据（流年表默认只排到参考年 + 10 年）</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: flex-start;
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
.clear {
  padding: 5px 12px;
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
.rel.chong {
  color: #b3261e;
  font-weight: 700;
}
.rel.he {
  color: #2f7d32;
  font-weight: 700;
}
.empty {
  color: var(--c-muted);
  text-align: center;
}
</style>
