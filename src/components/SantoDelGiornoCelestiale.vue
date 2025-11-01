<template>
  <section class="santo-stage" :aria-busy="loading.toString()">
    <div class="stars" aria-hidden="true"></div>

    <div class="panel" role="region" aria-label="Santo del giorno">
      <header class="header">
  <div class="title-outer">
    <h1 class="viva">Mannaggia a </h1>

    <!-- bottone di rivelazione visibile fino a reveal -->
    <div v-if="!revealed && !loading" class="reveal-wrap">
      <button class="reveal-btn" @click="revealSanto" aria-pressed="false">
        Scopri il santo da jastemmare
      </button>
    </div>

    <!-- il nome compare solo dopo reveal -->
    <h2 class="santo-name" v-if="revealed && !loading">{{ santo.nome }}</h2>

    <div class="placeholder" v-else-if="loading">Caricamento...</div>
  </div>
</header>


      <!-- <main class="content">
        <div class="card" v-if="!loading && !error">
          <div class="santo-card">
            <div class="santo-meta">
              <p class="feast-date">Festa: <strong>{{ santo.data_festa || formattedDate }}</strong></p>
              <p class="origin" v-if="santo.provenienza">Provenienza: <strong>{{ santo.provenienza }}</strong></p>
            </div>
            <div class="santo-desc" v-html="santo.descrizione"></div>
            <footer class="sources" v-if="santo.fonte">
              Fonte: <a :href="santo.fonte" target="_blank" rel="noopener">link</a>
            </footer>
          </div>
        </div>

        <div class="error" v-if="error">
          {{ error }}
        </div>
      </main> -->
    </div>

    <audio ref="audio" :src="musicUrl" loop crossorigin="anonymous"></audio>
  </section>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const props = defineProps({
  apiKey: { type: String, required: true },
  apiUrl: { type: String, default: 'https://santodelgiorno.mintdev.me/api/santo' },
  musicUrl: { type: String, required: true }
})

const santo = ref({})
const loading = ref(true)
const error = ref(null)
const isPlaying = ref(false)
const isMuted = ref(false)
const audio = ref(null)
const revealed = ref(false)
let _confettiIntervalId = null
let _confettiStopped = false

async function fetchSanto() {
  loading.value = true
  error.value = null
  try {
    const today = new Date()
    const mese = today.getMonth() + 1
    const giorno = today.getDate()
    const url = `https://santodelgiorno.mintdev.me/api/v1/santo/data/${mese}/${giorno}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${props.apiKey}` },
      Accept: 'application/json'
    })
    if (!res.ok) throw new Error('Errore nel recupero del santo')
    const data = await res.json()
    // adattamento al formato dell'API
    santo.value = {
      nome: data.data[0].attributes.nome || 'Santo sconosciuto',
      descrizione: data.descrizione || data.description || '',
      fonte: data.fonte || data.source || '',
      data_festa: data.data || today,
      provenienza: data.provenienza || data.origin || ''
    }
  } catch (e) {
    error.value = 'Impossibile caricare il santo del giorno'
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function playAudioUnmuted() {
  if (!audio.value) return
  // try play unmuted first (may be blocked)
  audio.value.muted = false
  try {
    await audio.value.play()
    isPlaying.value = true
    isMuted.value = false
  } catch (err) {
    // fallback: play muted then try unmute after gesture/time
    audio.value.muted = true
    try {
      await audio.value.play()
      isPlaying.value = true
      isMuted.value = true
      // best-effort unmute shortly after
      setTimeout(async () => {
        try {
          audio.value.muted = false
          await audio.value.play()
          isMuted.value = false
        } catch {}
      }, 600)
    } catch {}
  }
}

// funzione reveal che mostra nome, avvia audio e confetti
function revealSanto() {
  if (revealed.value) return
  revealed.value = true

  // play audio (user gesture triggered)
  playAudioUnmuted().catch(() => {})

  // avvia confetti
  launchConfetti()
}

async function launchConfetti() {
  _confettiStopped = false
  const confetti = (await import('canvas-confetti')).default

  const burst = (particleCount, origin, spread = 60, gravity = 0.5, scalar = 1) => {
    confetti({
      particleCount,
      spread,
      origin,
      gravity,
      scalar,
      colors: ['#ffd86b', '#f6c3ff', '#8ec5ff', '#c7ffb5', '#fff7e1', '#ffe9c1'],
      ticks: 200
    })
  }

  // immediate big celebratory burst but starting più in basso (y più alto)
  burst(120, { x: 0.5, y: 0.55 }, 90, 0.6, 1.1)

  // two radial bursts slightly lateralizzati e bassi
  setTimeout(() => burst(80, { x: 0.35, y: 0.6 }, 70, 0.55, 0.95), 120)
  setTimeout(() => burst(80, { x: 0.65, y: 0.6 }, 70, 0.55, 0.95), 220)

  const scheduleWave = () => {
    if (_confettiStopped) return

    const drops = 6 + Math.round(Math.random() * 6)
    for (let i = 0; i < drops; i++) {
      const px = Math.random() * 1.0
      const delay = Math.random() * 800
      // waves start from lower positions (y between 0.45 and 0.75)
      const startY = 0.45 + Math.random() * 0.3
      setTimeout(() => {
        burst(18 + Math.round(Math.random() * 12), { x: px, y: startY }, 40 + Math.random() * 30, 0.35 + Math.random() * 0.25, 1 + Math.random() * 0.6)
      }, delay)
    }

    const next = 3000 + Math.random() * 2000
    _confettiIntervalId = setTimeout(scheduleWave, next)
  }

  scheduleWave()
}


// call to stop confetti if needed (e.g., on component unmount or after N seconds)
function stopConfetti() {
  _confettiStopped = true
  if (_confettiIntervalId) {
    clearTimeout(_confettiIntervalId)
    _confettiIntervalId = null
  }
}


onMounted(() => {
  audio.value = document.querySelector('audio')
  fetchSanto()
  // rispetta preferenze di riduzione movimento
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) {
    document.documentElement.classList.add('reduced-motion')
  }
})

watch(() => props.musicUrl, (n) => {
  if (audio.value) {
    audio.value.src = n
    if (isPlaying.value) audio.value.play().catch(() => {})
  }
})
</script>

<style scoped>
/* layout */
.santo-stage {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  background: radial-gradient(ellipse at top, rgba(255,250,240,0.08), rgba(10,16,35,1) 60%);
  color: #f8f7ff;
  position: relative;
  overflow: hidden;
  font-family: "Georgia", "Times New Roman", serif;
}

/* slow twinkling stars background */
.stars {
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
    radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 200px 200px, 120px 120px;
  animation: drift 60s linear infinite, twinkle 8s linear infinite;
  opacity: 0.18;
  pointer-events: none;
  transform: translateZ(0);
}

/* slow drifting */
@keyframes drift { from { transform: translateY(0) } to { transform: translateY(-40px) } }
@keyframes twinkle { 0%,100% { opacity:0.18 } 50% { opacity:0.26 } }

/* panel */
.panel {
    margin: 0 10px;
  width: min(980px, 95%);
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(6,10,22,0.6), 0 2px 6px rgba(0,0,0,0.4);
  backdrop-filter: blur(6px) saturate(1.1);
  z-index: 2;
}

/* header */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.title-outer {
    width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: center;
}

.viva {
  margin: 0;
  font-size: clamp(1.6rem, 3vw, 2.6rem);
  letter-spacing: 0.12em;
  color: #fff8ea;
  text-shadow: 0 6px 22px rgba(255,238,200,0.06), 0 2px 6px rgba(0,0,0,0.5);
  transform-origin: left center;
  animation: slowFloat 8s ease-in-out infinite;
  font-weight: 700;
}

.santo-name {
  margin: 0;
  font-size: clamp(1.2rem, 2.4vw, 1.9rem);
  color: #eaf6ff;
  font-style: italic;
  font-weight: 600;
  text-shadow: 0 6px 18px rgba(138,176,255,0.06);
  opacity: 0;
  animation: fadeInSlow 2s ease forwards 0.6s;
}

/* slow float and fade */
@keyframes slowFloat { 0% { transform: translateY(0) } 50% { transform: translateY(-6px) } 100% { transform: translateY(0) } }
@keyframes fadeInSlow { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }

/* content card */
.content { display: flex; gap: 1rem; align-items: flex-start; }
.card { flex: 1; }
.santo-card {
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 1.25rem;
  animation: contentFade 1.6s ease forwards;
  box-shadow: 0 8px 20px rgba(4,8,20,0.6);
  color: #eef6ff;
}
@keyframes contentFade { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }

.santo-meta { font-size: 0.92rem; color: #dbeeff; margin-bottom: .75rem; }
.santo-desc { line-height: 1.6; color: #f3f7ff; opacity: 0.95; }

/* controls */
.controls { display:flex; gap: 0.5rem; align-items:center; }
.btn {
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border: 1px solid rgba(255,255,255,0.05);
  color: #fff;
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  backdrop-filter: blur(4px);
  transition: transform 0.28s ease, box-shadow 0.28s ease;
}
.btn:hover { transform: translateY(-4px); box-shadow: 0 8px 18px rgba(0,0,0,0.45); }
.sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

/* error */
.error { color: #ffd1d1; background: rgba(255,20,20,0.03); padding: .8rem; border-radius:8px; }

/* reduced motion */
.reduced-motion .viva,
.reduced-motion .stars,
.reduced-motion .santo-name,
.reduced-motion .santo-card {
  animation: none !important;
  transition: none !important;
}

/* responsive */
@media (max-width:720px) {
  .header { flex-direction: column; align-items: flex-start; gap: 0.6rem; }
  .controls { align-self:flex-end; }
  .santo-stage { padding: 1.5rem; }
}
/* reveal button */
.reveal-wrap { margin-top: 0.35rem; }
.reveal-btn {
  background: linear-gradient(180deg, rgba(250,243,230,0.06), rgba(255,250,240,0.03));
  color: #fff8e6;
  padding: 0.6rem 1.1rem;
  border-radius: 12px;
  border: 1px solid rgba(255,240,200,0.12);
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 8px 28px rgba(20,30,60,0.45), 0 0 28px rgba(255,230,140,0.06) inset;
  transition: transform 260ms ease, box-shadow 260ms ease, opacity 200ms ease;
  backdrop-filter: blur(6px);
  display: inline-block;
  letter-spacing: 0.06em;
}
.reveal-btn:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 12px 40px rgba(20,30,60,0.5); }
.reveal-btn:active { transform: translateY(-2px) }

/* ensure santo-name fades in nicely after revealed */
.santo-name { opacity: 0; transform: translateY(6px); transition: opacity 900ms ease, transform 900ms ease; }
[aria-busy="false"] .santo-name[style] {}

/* when revealed, force visible (we rely on v-if, but keep CSS ready) */
.revealed .santo-name { opacity: 1; transform: translateY(0); }
</style>