<script setup lang="ts">
/**
 * PillarCard：展示单柱的干支、藏干、十神。
 * 十神与藏干由父组件传入，本组件不计算（技能 §5.4）。
 */
import { computed } from 'vue'

import { GAN_COLOR, ZHI_COLOR } from '../core/constants'
import type { GanName, ZhiName } from '../core/constants'
import type { Pillar } from '../types/bazi'

const props = withDefaults(
  defineProps<{
    label: string
    pillar: Pillar
    hiddenStems: string[]
    hiddenGods: string[]
    stemTenGod: string
    isDayMaster?: boolean
    /** 是否为当前选中柱 */
    selected?: boolean
    /** 是否可点击选择 */
    clickable?: boolean
  }>(),
  { isDayMaster: false, selected: false, clickable: false },
)

const emit = defineEmits<{ select: [] }>()

const stemColor = computed(() => GAN_COLOR[props.pillar.stem as GanName] ?? '#666')
const branchColor = computed(() => ZHI_COLOR[props.pillar.branch as ZhiName] ?? '#666')

function onClick(): void {
  if (props.clickable) emit('select')
}
</script>

<template>
  <article
    class="pillar"
    :class="{ master: isDayMaster, selected, clickable }"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    :aria-pressed="clickable ? selected : undefined"
    @click="onClick"
    @keydown.enter.prevent="onClick"
    @keydown.space.prevent="onClick"
  >
    <header>
      <span class="label">{{ label }}</span>
      <span class="k">k={{ pillar.k }}</span>
    </header>

    <!-- 上下结构：天干在上、地支在下，中间留出「肩线」 -->
    <div class="chars">
      <span class="char stem" :style="{ color: stemColor }">{{ pillar.stem }}</span>
      <span class="char branch" :style="{ color: branchColor }">{{ pillar.branch }}</span>
    </div>

    <div class="ten-god" :class="{ master: isDayMaster }">{{ stemTenGod }}</div>

    <dl class="hidden">
      <div v-for="(stem, i) in hiddenStems" :key="`${stem}-${i}`" class="hidden-row">
        <dt :style="{ color: GAN_COLOR[stem as GanName] ?? '#666' }">{{ stem }}</dt>
        <dd>{{ hiddenGods[i] ?? '—' }}</dd>
      </div>
      <div v-if="hiddenStems.length === 0" class="hidden-row">
        <dt>—</dt>
        <dd>无藏干</dd>
      </div>
    </dl>

    <footer class="index">干 {{ pillar.stemIndex }} · 支 {{ pillar.branchIndex }}</footer>
  </article>
</template>

<style scoped>
.pillar {
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 14px 12px;
  background: var(--c-card);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}
.pillar.master {
  border-color: color-mix(in srgb, var(--c-primary) 45%, var(--c-border));
}
/** 可点击：给出手型与悬停反馈 */
.pillar.clickable {
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
}
.pillar.clickable:hover {
  border-color: var(--c-primary);
  transform: translateY(-1px);
}
/** 当前选中：加粗描边 + 外环 */
.pillar.selected {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 26%, transparent);
}
header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 12px;
  color: var(--c-muted);
}
.label {
  font-weight: 700;
  color: var(--c-text);
  font-size: 13px;
}
.chars {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 0 6px;
}
.char {
  font-size: 42px;
  line-height: 1.15;
  font-weight: 700;
  font-family: 'Songti SC', 'SimSun', serif;
}
/* 肩线：把天干与地支在视觉上分成上下两格 */
.char.stem {
  padding-bottom: 4px;
  border-bottom: 1px solid var(--c-border);
  min-width: 56px;
  text-align: center;
}
.char.branch {
  padding-top: 4px;
  min-width: 56px;
  text-align: center;
}
.ten-god {
  text-align: center;
  font-size: 13px;
  padding: 3px 0;
  border-radius: 6px;
  background: var(--c-chip);
  color: var(--c-muted);
}
.ten-god.master {
  background: color-mix(in srgb, var(--c-primary) 16%, transparent);
  color: var(--c-primary);
  font-weight: 700;
}
.hidden {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}
.hidden-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--c-chip);
}
.hidden-row dt {
  font-weight: 700;
}
.hidden-row dd {
  margin: 0;
  color: var(--c-muted);
}
.index {
  margin-top: auto; /* 藏干少的柱子把页脚顶到底部，四张卡高度对齐 */
  padding-top: 6px;
  font-size: 11px;
  color: var(--c-muted);
  text-align: center;
}
</style>
