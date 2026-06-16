<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { useVModel } from "@vueuse/core"
import { cn } from "@/lib/utils"

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes["class"]
}>()

const emits = defineEmits<{
  (e: "update:modelValue", payload: string | number): void
}>()

const modelValue = useVModel(props, "modelValue", emits, {
  passive: true,
  defaultValue: props.defaultValue,
})
</script>

<template>
  <input
    v-model="modelValue"
    data-slot="input"
    :class="cn(
      'border-zinc-200 focus-visible:border-primary focus-visible:ring-primary/20 aria-invalid:ring-destructive/20 rounded-xl h-10 border bg-zinc-50 px-3 py-1 text-base transition-all file:h-7 file:text-sm file:font-medium focus-visible:ring-3 md:text-sm w-full min-w-0 outline-none placeholder:text-zinc-400 disabled:pointer-events-none disabled:opacity-50',
      props.class,
    )"
  >
</template>
