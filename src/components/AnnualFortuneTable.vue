<script setup lang="ts">
/**
 * AnnualFortuneTable：展示流年。不算流年（数据来自 store.result.annualFortunes）。
 */
import { storeToRefs } from 'pinia'

import { GAN_COLOR, ZHI_COLOR } from '../core/constants'
import type { GanName, ZhiName } from '../core/constants'
import { useChartStore } from '../stores/chart'

const store = useChartStore()
const { result } = storeToRefs(store)
</script>

<template>
  <section v-if="result" class="card">
    <header class="head">
      <h2>流年</h2>
      <p class="hint">
        k_year(Y) = (Y − 4) mod 60；自 {{ result.annualFortunes[0]?.year }} 年起
        {{ result.annualFortunes.length }} 年
      </p>
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
          <tr v-for="item in result.annualFortunes" :key="item.year">
            <td>{{ item.year }}</td>
            <td class="ganzhi">
              <span :style="{ color: GAN_COLOR[item.stem as GanName] }">{{ item.stem }}</span>
              <span :style="{ color: ZHI_COLOR[item.branch as ZhiName] }">{{ item.branch }}</span>
            </td>
            <td>{{ item.stemTenGod }}</td>
            <td class="muted">{{ item.age }}</td>
            <td>
              <span :class="['rel', item.branchRelation === '六冲' ? 'chong' : item.branchRelation === '六合' ? 'he' : '']">
                {{ item.branchRelation }}
              </span>
            </td>
            <td class="muted">{{ item.k }}</td>
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
.rel.chong {
  color: #b3261e;
  font-weight: 700;
}
.rel.he {
  color: #2f7d32;
  font-weight: 700;
}
</style>
