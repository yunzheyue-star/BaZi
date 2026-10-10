<script setup lang="ts">
/**
 * BirthForm：只收集输入并调用 store.calculate，不含任何算法。
 *
 * 出生地为**三级级联选择**（省 → 市 → 区县），选中后自动写入经度、时区与地名。
 * 计时口径不在这里选 —— 四柱页面可随时切换真太阳时 / 平太阳时（见 PillarsGrid）。
 */
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { REGIONS, findCity, findProvince } from '../core/regions'
import { defaultInput, sampleInputA, sampleInputB, useChartStore } from '../stores/chart'
import type { DayBoundary, Gender } from '../types/bazi'

const store = useChartStore()
const { input, error, calculating } = storeToRefs(store)

/** datetime-local 需要 "YYYY-MM-DDTHH:mm"，store 里存 "YYYY-MM-DD HH:mm" */
const localDatetime = computed<string>({
  get: () => input.value.birthDatetime.replace(' ', 'T'),
  set: (value: string) => store.patchInput({ birthDatetime: value.replace('T', ' ') }),
})

/* ------------------------------------------------------------------ *
 * 三级级联地址
 * ------------------------------------------------------------------ */

/** 省名列表 */
const provinceNames = computed(() => REGIONS.map((p) => p.name))

/** 当前省名（「自定义」时为空串） */
const provinceName = ref('')

/** 当前市名 */
const cityName = ref('')

/** 当前区县名 */
const countyName = ref('')

const cityNames = computed<string[]>(() => {
  const province = findProvince(provinceName.value)
  return province ? province.cities.map((c) => c.name) : []
})

const countyNames = computed<string[]>(() => {
  const city = findCity(provinceName.value, cityName.value)
  return city ? city.counties.map((c) => c.name) : []
})

/** 是否已选到可用的最小单位 */
const resolved = computed(() => {
  const city = findCity(provinceName.value, cityName.value)
  if (!city) return null
  const county = city.counties.find((c) => c.name === countyName.value)
  const point = county ?? { name: city.name, longitude: city.longitude, latitude: city.latitude }
  return { point, city, usedCounty: Boolean(county) }
})

/** 选中项发生变化 → 写回 store */
watch(resolved, (value) => {
  if (!value) return
  const path = [provinceName.value, cityName.value, value.usedCounty ? countyName.value : '']
    .filter((part) => part.length > 0)
    .join(' / ')
  store.patchInput({
    longitude: value.point.longitude,
    birthPlace: path,
    timezone: findProvince(provinceName.value)?.timezone ?? input.value.timezone,
  })
})

/** 省变化 → 重置市与县 */
watch(provinceName, () => {
  cityName.value = ''
  countyName.value = ''
})

/** 市变化 → 重置县 */
watch(cityName, () => {
  countyName.value = ''
})

/** 从 store 的 birthPlace 反解三级（载入示例或自定义时用） */
function syncFromInput(): void {
  const path = input.value.birthPlace ?? ''
  const parts = path.split('/').map((p) => p.trim())
  if (parts.length >= 2 && findProvince(parts[0]!)) {
    provinceName.value = parts[0]!
    cityName.value = parts[1] ?? ''
    countyName.value = parts[2] ?? ''
    return
  }
  // 自定义地名：保持经度手填，三级留空
  provinceName.value = ''
  cityName.value = ''
  countyName.value = ''
}

// 初次挂载与「示例 / 恢复默认 / 清空」后同步
watch(
  () => input.value.birthPlace,
  () => {
    const current = [provinceName.value, cityName.value, countyName.value]
      .filter((p) => p.length > 0)
      .join(' / ')
    if (current !== (input.value.birthPlace ?? '')) syncFromInput()
  },
  { immediate: true },
)

/* ------------------------------------------------------------------ *
 * 其余字段
 * ------------------------------------------------------------------ */

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

function onCustomPlace(event: Event): void {
  store.patchInput({ birthPlace: (event.target as HTMLInputElement).value })
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

      <div class="field">
        <span>换日流派</span>
        <div class="segmented wide">
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

      <div class="field span-2">
        <span>出生地（省 → 市 → 区县，选中后自动取经纬度）</span>
        <div class="cascade">
          <select v-model="provinceName" aria-label="省">
            <option value="">请选择省 / 自治区 / 直辖市</option>
            <option v-for="name in provinceNames" :key="name" :value="name">{{ name }}</option>
          </select>
          <select v-model="cityName" :disabled="!provinceName" aria-label="市">
            <option value="">{{ provinceName ? '请选择市' : '—' }}</option>
            <option v-for="name in cityNames" :key="name" :value="name">{{ name }}</option>
          </select>
          <select
            v-model="countyName"
            :disabled="!cityName || countyNames.length === 0"
            aria-label="区县"
          >
            <option value="">
              {{ !cityName ? '—' : countyNames.length === 0 ? '（该市无需选区县）' : '请选择区县' }}
            </option>
            <option v-for="name in countyNames" :key="name" :value="name">{{ name }}</option>
          </select>
        </div>
        <p v-if="resolved" class="hint">
          已定位：{{ input.birthPlace }} · 经度 {{ resolved.point.longitude }}° ·
          纬度 {{ resolved.point.latitude }}° · 时区 {{ input.timezone }}
          <template v-if="!resolved.usedCounty">（该市不设区县，取市级驻地坐标）</template>
        </p>
      </div>

      <label class="field">
        <span>经度（东经为正 · 选地址自动填入，可手改）</span>
        <input :value="input.longitude" type="number" step="0.01" min="-180" max="180" @input="onLongitude" />
      </label>

      <label class="field">
        <span>时区</span>
        <input v-model="input.timezone" type="text" placeholder="Asia/Shanghai" />
      </label>

      <label class="field span-2">
        <span>出生地名称（留痕用 · 可直接手填自定义地名）</span>
        <input
          :value="input.birthPlace ?? ''"
          type="text"
          placeholder="如：湖北省 / 武汉市 / 江夏区"
          @input="onCustomPlace"
        />
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
select:disabled {
  opacity: 0.5;
}
/** 三级级联：三等分一行 */
.cascade {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.segmented {
  display: inline-flex;
  border: 1px solid var(--c-border);
  border-radius: 8px;
  overflow: hidden;
}
.segmented.wide {
  display: flex;
  width: 100%;
}
.segmented.wide button {
  flex: 1;
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
.hint {
  margin: 0;
  font-size: 12px;
  color: var(--c-muted);
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
  .cascade {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
