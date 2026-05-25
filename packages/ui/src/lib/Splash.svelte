<script lang="ts">
  import { onMount } from 'svelte'

  interface Props {
    onDone?: () => void
    hold?: number
  }
  let { onDone, hold = 250 }: Props = $props()

  let visible = $state(true)
  let stage = $state(0) // 0: empty, 1: center, 2: satellites, 3: edges, 4: pulse, 5: fade

  onMount(() => {
    const steps = [
      [120, 1],
      [320, 2],
      [700, 3],
      [1600, 4],
      [1900 + hold, 5],
    ] as const
    const timers = steps.map(([t, s]) => setTimeout(() => (stage = s), t))
    const closeT = setTimeout(() => {
      visible = false
      onDone?.()
    }, 2300 + hold)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(closeT)
    }
  })

  // Sources around the central database — labels chosen to feel like
  // real ingest sources without committing the brand to anything.
  const CX = 200
  const CY = 160
  const RADIUS = 110

  const sources = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2 - Math.PI / 2
    return {
      id: i,
      x: CX + Math.cos(angle) * RADIUS,
      y: CY + Math.sin(angle) * RADIUS,
      delay: i * 90,
      labelDelay: 200 + i * 90,
    }
  })
</script>

{#if visible}
  <div class="splash" class:fade={stage >= 5}>
    <svg viewBox="0 0 400 320" width="400" height="320">
      <defs>
        <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ff2056" stop-opacity="0.8" />
          <stop offset="60%" stop-color="#ff2056" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#ff2056" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="satelliteGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#7a8088" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#7a8088" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="edgeGrad" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="#7a8088" stop-opacity="0" />
          <stop offset="100%" stop-color="#ff2056" stop-opacity="0.6" />
        </linearGradient>
      </defs>

      <!-- Satellites (sources) -->
      {#each sources as s}
        <g class="src" class:visible={stage >= 2} style="--d: {s.delay}ms">
          <circle cx={s.x} cy={s.y} r="14" fill="url(#satelliteGlow)" />
          <circle cx={s.x} cy={s.y} r="4" fill="#7a8088" />
        </g>
      {/each}

      <!-- Edges converging INTO center (satellite → center) -->
      {#each sources as s, i}
        <line
          class="edge"
          class:visible={stage >= 3}
          x1={s.x} y1={s.y}
          x2={CX} y2={CY}
          stroke="url(#edgeGrad)"
          stroke-width="1"
          stroke-dasharray="2 4"
          style="animation-delay: {i * 80}ms"
        />
        {#if stage >= 3}
          <!-- Particle traveling INWARD from satellite to center -->
          <circle r="2" fill="#ff2056" class="particle">
            <animateMotion
              dur="1.1s"
              repeatCount="indefinite"
              path={`M ${s.x} ${s.y} L ${CX} ${CY}`}
              begin={`${i * 0.13}s`}
            />
          </circle>
        {/if}
      {/each}

      <!-- Central database (drawn LAST so it sits on top) -->
      <g class="center" class:visible={stage >= 1} class:pulse={stage >= 3}>
        <circle cx={CX} cy={CY} r="44" fill="url(#centerGlow)" />
        <circle cx={CX} cy={CY} r="18" fill="#ff2056" />
        <circle cx={CX} cy={CY} r="18" fill="none" stroke="#ff2056" stroke-opacity="0.5" class="ring" />
        {#if stage >= 4}
          <circle cx={CX} cy={CY} r="18" fill="none" stroke="#ff2056" stroke-opacity="0.7" class="ring2" />
        {/if}
      </g>
    </svg>

    <div class="brand" class:visible={stage >= 2}>
      <div class="wordmark">red<span>·</span>ui</div>
      <div class="tagline">collecting</div>
    </div>
  </div>
{/if}

<style>
  .splash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: radial-gradient(ellipse at center, #0c0e11 0%, #07080a 70%);
    display: grid;
    place-items: center;
    grid-template-rows: 1fr auto;
    padding-bottom: 60px;
    transition: opacity 380ms var(--ease-out);
  }
  .splash.fade { opacity: 0; pointer-events: none; }

  svg { overflow: visible; transform-origin: center; }

  .src {
    opacity: 0;
    transform-origin: center;
    transform: scale(0.4);
    transition: opacity 320ms var(--ease-out), transform 480ms var(--ease-snap);
    transition-delay: var(--d, 0ms);
  }
  .src.visible { opacity: 1; transform: scale(1); }

  .edge {
    opacity: 0;
    transition: opacity 280ms var(--ease-out);
    animation: dashInward 1.1s linear infinite;
    animation-play-state: paused;
  }
  .edge.visible { opacity: 0.5; animation-play-state: running; }
  @keyframes dashInward { from { stroke-dashoffset: 0; } to { stroke-dashoffset: -100; } }

  .particle { filter: drop-shadow(0 0 4px #ff2056); }

  .center {
    opacity: 0;
    transform-origin: 200px 160px;
    transform: scale(0.5);
    transition: opacity 320ms var(--ease-out), transform 600ms var(--ease-snap);
  }
  .center.visible { opacity: 1; transform: scale(1); }
  .center.pulse { animation: heartbeat 1.4s ease-in-out infinite; }
  @keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.06); }
  }

  .ring {
    transform-origin: 200px 160px;
    animation: pulse 1.6s ease-out infinite;
  }
  .ring2 {
    transform-origin: 200px 160px;
    animation: pulse 1.6s ease-out infinite;
    animation-delay: 0.8s;
  }
  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2.6); opacity: 0; }
  }

  .brand {
    text-align: center;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 480ms var(--ease-out) 200ms, transform 480ms var(--ease-out) 200ms;
  }
  .brand.visible { opacity: 1; transform: translateY(0); }

  .wordmark {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 600;
    color: var(--color-fg-0);
    letter-spacing: -0.02em;
  }
  .wordmark span {
    color: var(--color-accent);
    margin: 0 2px;
    animation: blink 1.2s ease-in-out infinite;
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .tagline {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    color: var(--color-fg-3);
    margin-top: 8px;
  }
</style>
