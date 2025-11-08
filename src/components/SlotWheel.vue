<template>
  <div class="slot-reel" :style="{ height: (visible * itemHeight) + 'px' }">
    <div
      class="strip"
      :style="stripStyle"
      @transitionend="onTransitionEnd"
      ref="strip"
    >
      <div
        v-for="(it, i) in repeatedList"
        :key="i + '-' + it"
        class="slot-item"
        :style="{ height: itemHeight + 'px', lineHeight: itemHeight + 'px' }"
      >
        {{ it }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';

const props = defineProps({
  items: { type: Array, required: true },
  visible: { type: Number, default: 1 },
  itemHeight: { type: Number, default: 56 },
  duration: { type: Number, default: 700 },
  easing: { type: String, default: 'cubic-bezier(.22,.9,.12,1)' },
  maxExtraRounds: { type: Number, default: 8 } // aumenta se vuoi spin più lunghi
});
const emit = defineEmits(['stopped']);

const position = ref(0); // px
const transitioning = ref(false);
const transDuration = ref(props.duration);
const targetIndex = ref(null);
const strip = ref(null);

// costruisco la lista ripetuta: almeno 3 copie; abbastanza copie per coprire maxExtraRounds
const copies = computed(() => Math.max(3, props.maxExtraRounds + 3));
const repeatedList = computed(() => {
  const out = [];
  for (let k = 0; k < copies.value; k++) out.push(...props.items);
  return out;
});

// style reattivo (unico computed)
const stripStyle = computed(() => ({
  transform: `translate3d(0, ${-position.value}px, 0)`,
  transition: transitioning.value ? `transform ${transDuration.value}ms ${props.easing}` : 'none',
  willChange: 'transform'
}));

function normalizeIndex(i) {
  const n = props.items.length || 1;
  return ((i % n) + n) % n;
}

// spinTo: index (numero) o label (string) possibile; extraRounds opzionale
async function spinTo(indexOrLabel, extraRounds = 3) {
  if (!props.items.length) return;
  if (transitioning.value) return;

  // supporta passaggio di label invece di indice
  let index = typeof indexOrLabel === 'number'
    ? indexOrLabel
    : props.items.indexOf(indexOrLabel);

  if (index < 0) index = 0;
  index = normalizeIndex(index);
  extraRounds = Math.max(0, Math.min(extraRounds, props.maxExtraRounds));

  transitioning.value = false; // assicurati che la prima impostazione non abbia transition
  targetIndex.value = index;

  // scegliamo la copia centrale come punto di partenza
  const itemsPerCopy = props.items.length;
  const middleCopy = Math.floor(copies.value / 2);
  const startSlot = middleCopy * itemsPerCopy;
  position.value = startSlot * props.itemHeight;

  // forziamo il reflow per applicare la posizione istantanea
  await nextTick();
  // leggere offsetHeight del strip o body forza reflow
  void (strip.value && strip.value.offsetHeight);
  void document.body.offsetHeight;

  // calcolo posizione target all'interno della stessa strip
  const totalSlots = extraRounds * itemsPerCopy + index;
  const targetPosition = (startSlot + totalSlots) * props.itemHeight;
  const distance = Math.abs(targetPosition - position.value);

  // scala la durata in funzione della distanza (regolabile)
  transDuration.value = Math.max(props.duration, Math.round((distance / props.itemHeight) * (props.duration / 3)));

  // abilito la transition e imposto la destinazione
  transitioning.value = true;
  // piccolo tick per essere sicuri che transition sia letta dal browser
  await nextTick();
  position.value = targetPosition;
}

// onTransitionEnd: normalizza la posizione per evitare overflow numerici
function onTransitionEnd(e) {
  // solo per il transform della strip
  if (!transitioning.value || (e && e.propertyName !== 'transform')) return;
  const itemsPerCopy = props.items.length;
  const resetPoint = itemsPerCopy * props.itemHeight;
  // portiamo la posizione dentro la copia centrale mantenendo l'elemento visibile coerente
  const visibleSlotIndex = Math.round(position.value / props.itemHeight) % itemsPerCopy;
  const middleCopy = Math.floor(copies.value / 2);
  position.value = middleCopy * resetPoint + (visibleSlotIndex * props.itemHeight);
  transitioning.value = false;
  emit('stopped', targetIndex.value);
}

// opzionale: funzione per partire in loop continuo mediante RAF
let rafId = null;
function startLoop(pxPerSec = 120) {
  cancelLoop();
  let last = performance.now();
  function step(now) {
    const dt = now - last;
    last = now;
    position.value += (pxPerSec * dt) / 1000;
    // loop dentro la strip ripetuta (manteniamo dentro copied length)
    const totalHeight = repeatedList.value.length * props.itemHeight;
    if (position.value >= totalHeight) position.value -= totalHeight;
    rafId = requestAnimationFrame(step);
  }
  rafId = requestAnimationFrame(step);
}
function cancelLoop() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }

defineExpose({ spinTo, startLoop, cancelLoop, stripStyle });
</script>

<style scoped>
.slot-reel {
  width: 100%;
  overflow: hidden;
  position: relative;
  font-size: clamp(1.2rem, 2.4vw, 1.9rem);
  color: #eaf6ff;
  font-style: italic;
  font-weight: 600;
  border-radius: 6px;
  user-select: none;
}
.strip {
  will-change: transform;
}
.slot-item {
  text-align: center;
  box-sizing: border-box;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  font-size: 18px;
  padding: 0 12px;
}
</style>