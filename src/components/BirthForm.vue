<script setup lang="ts">
/**
 * BirthForm：只收集输入并调用 store.calculate，不含任何算法。
 */
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { CITIES, defaultInput, sampleInputA, sampleInputB, useChartStore } from '../stores/chart'
import type { CityPreset } from '../stores/chart'
import type { DayBoundary, Gender } from '../types/bazi'

const store = useChartStore()
const { input, error, calculating } = storeToRefs(store)

/** datetime-local 需要 "YYYY-MM-DDTHH:mm"，store 里存 "YYYY-MM-DD HH:mm" */
const localDatetime = computed<string>({
  get: () => input.value.birthDatetime.replace(' ', 'T'),
  set: (value: string) => store.patchInput({ birthDatetime: value.replace('T', ' ') }),
})

const city = computed<string>({
  get: () => {
    const hit = CITIES.find(
      (c) => c.longitude === input.value.longitude && c.timezone === input.value.timezone,
    )
    return hit ? hit.label : '自定义'
  },
  set: (label: string) => {
    const hit: CityPreset | undefined = CITIES.find((c) => c.label === label)
    if (hit) store.patchInput({ longitude: hit.longitude, timezone: hit.timezone })
  },
})

function onGender(value: Gender): void {
  store.patchInput({ gender: value })
}

function onDayBoundary(value: DayBoundary): void {
  store.patchInput({ dayBoundary: value })
}

function onLongitude(event: Event): void {
  const raw = Number((event.target as HTMLInputElement).value)
  store.patchInput({ longitude: Number.isFinite(raw) ? raw : 0 })
}

function loadSample(which: 'a' | 'b' | 'default'): void {
  store.applyInput(which === 'a' ? sampleInputA : which === 'b' ? sampleInputB : defaultInput)
}
</script>

<template>
  <section class="card">
    <h2>出生信息</h2>

    <div class="grid">
      <label class="field span-2">
        <span>出生时间（当地钟表时间）</span>
        <input v-model="localDatetime" type="datetime-local" step="60" />
      </label>

      <div class="field">
        <span>性别</span>
        <div class="segmented">
          <button
            type="button"
            :class="{ active: input.gender === 'male' }"
            @click="onGender('male')"
          >
            男
          </button>
          <button
            type="button"
            :class="{ active: input.gender === 'female' }"
            @click="onGender('female')"
          >
            女
          </button>
        </div>
      </div>

      <label class="field">
        <span>出生地</span>
        <select v-model="city">
          <option v-for="item in CITIES" :key="item.label" :value="item.label">
            {{ item.label }}
          </option>
          <option value="自定义">自定义</option>
        </select>
      </label>

      <label class="field">
        <span>经度（东经为正）</span>
        <input :value="input.longitude" type="number" step="0.01" min="-180" max="180" @input="onLongitude" />
      </label>

      <label class="field">
        <span>时区</span>
        <input v-model="input.timezone" type="text" list="tz-list" placeholder="Asia/Shanghai" />
        <datalist id="tz-list">
          <option v-for="item in CITIES" :key="item.timezone" :value="item.timezone" />
        </datalist>
      </label>

      <div class="field span-2">
        <span>换日流派</span>
        <div class="segmented">
          <button
            type="button"
            :class="{ active: input.dayBoundary === 'midnight' }"
            @click="onDayBoundary('midnight')"
          >
            午夜换日（子正）
          </button>
          <button
            type="button"
            :class="{ active: input.dayBoundary === 'zi_hour' }"
            @click="onDayBoundary('zi_hour')"
          >
            子时换日（子初）
          </button>
        </div>
      </div>

      <label class="field span-2 checkbox">
        <input v-model="input.trueSolarTime" type="checkbox" />
        <span>启用真太阳时（经度时差 + 均时差，仅用于定时柱）</span>
      </label>
    </div>

    <div class="actions">
      <button class="primary" type="button" :disabled="calculating" @click="store.calculate()">
        {{ calculating ? '排盘中…' : '排盘' }}
      </button>
      <button type="button" @click="loadSample('a')">示例 2008-07-16</button>
      <button type="button" @click="loadSample('b')">示例 2000-01-01</button>
      <button type="button" @click="loadSample('default')">恢复默认</button>
      <button type="button" @click="store.reset()">清空</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}
.span-2 {
  grid-column: span 2;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--c-muted);
}
.field > span:first-child {
  font-weight: 600;
  color: var(--c-text);
}
input[type='text'],
input[type='number'],
input[type='datetime-local'],
select {
  padding: 8px 10px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-input);
  color: var(--c-text);
  font-size: 14px;
  font-family: inherit;
}
.segmented {
  display: inline-flex;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  overflow: hidden;
}
.segmented button {
  border: 0;
  border-radius: 0;
  padding: 8px 14px;
  background: var(--c-input);
  color: var(--c-muted);
  cursor: pointer;
}
.segmented button.active {
  background: var(--c-primary);
  color: #fff;
}
.checkbox {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}
.actions button {
  padding: 9px 16px;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  background: var(--c-input);
  color: var(--c-text);
  cursor: pointer;
}
.actions button:hover {
  border-color: var(--c-primary);
}
.actions button.primary {
  background: var(--c-primary);
  border-color: var(--c-primary);
  color: #fff;
  font-weight: 600;
}
.actions button:disabled {
  opacity: 0.6;
  cursor: progress;
}
.error {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fdecec;
  color: #b3261e;
  font-size: 13px;
}
@media (max-width: 720px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .span-2 {
    grid-column: span 1;
  }
}
</style>
