<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"

const props = withDefaults(defineProps<{
  class?: HTMLAttributes["class"]
  size?: "default" | "sm"
}>(), {
  size: "default",
})
</script>

<template>
  <div
    data-slot="card"
    :data-size="size"
    :class="cn('bg-white text-card-foreground gap-6 overflow-hidden rounded-2xl py-6 text-sm shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-zinc-100/50 has-[>img:first-child]:pt-0 data-[size=sm]:gap-4 data-[size=sm]:py-4 *:[img:first-child]:rounded-t-2xl *:[img:last-child]:rounded-b-2xl group/card flex flex-col transition-all duration-300 hover:scale-[1.01] ease-apple-ease', props.class)"
  >
    <slot />
  </div>
</template>
