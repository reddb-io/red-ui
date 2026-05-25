<script lang="ts">
  import { onMount } from 'svelte'

  interface Props {
    onDone?: () => void
    /** ms to hold after animation completes before fading out */
    hold?: number
  }
  let { onDone, hold = 250 }: Props = $props()

  let visible = $state(true)
  let stage = $state(0) // 0: nothing, 1: primary in, 2: replicas in, 3: edges live, 4: breathe, 5: fade

  onMount(() => {
    const steps = [
      [120, 1],   // primary appears
      [380, 2],   // replicas spawn
      [900, 3],   // edges + flow
      [1500, 4],  // breathe
      [1800 + hold, 5], // fade
    ] as const
    const timers = steps.map(([t, s]) => setTimeout(() => (stage = s), t))
    const closeT = setTimeout(() => {
      visible = false
      onDone?.()
    }, 2200 + hold)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(closeT)
    }
  })

  // Replica positions — same layout app will use, so transition is continuous
  const replicas = [
    { x: 90, y: 230, delay: 0 },
    { x: 200, y: 270, delay: 80 },
    { x: 310, y: 230, delay: 160 },
  ]
</script>

{#if visible}
  <div class="splash" class:fade={stage >= 5}>
    <svg viewBox="0 0 400 320" width="400" height="320" class:breathe={stage >= 4}>
      <defs>
        <radialGradient id="primaryGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ff2056" stop-opacity="0.6" />
          <stop offset="100%" stop-color="#ff2056" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="replicaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#60a5fa" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#60a5fa" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ff2056" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.8" />
        </linearGradient>
      </defs>

      <!-- Edges -->
      {#each replicas as r, i}
        <line
          class="edge"
          class:visible={stage >= 3}
          x1="200" y1="110"
          x2={r.x} y2={r.y}
          stroke="url(#edgeGrad)"
          stroke-width="1.2"
          stroke-dasharray="3 5"
          style="animation-delay: {i * 120}ms"
        />
        <!-- Flowing particle along edge -->
        {#if stage >= 3}
          <circle r="2" fill="#ff2056" class="particle" style="animation-delay: {i * 200}ms">
            <animateMotion
              dur="1.4s"
              repeatCount="indefinite"
              path={`M 200 110 L ${r.x} ${r.y}`}
              begin={`${i * 0.2}s`}
            />
          </circle>
        {/if}
      {/each}

      <!-- Primary -->
      <g class="node primary" class:visible={stage >= 1}>
        <circle cx="200" cy="110" r="36" fill="url(#primaryGlow)" />
        <circle cx="200" cy="110" r="14" fill="#ff2056" />
        <circle cx="200" cy="110" r="14" fill="none" stroke="#ff2056" stroke-opacity="0.5" class="pulse" />
      </g>

      <!-- Replicas -->
      {#each replicas as r, i}
        <g class="node replica" class:visible={stage >= 2} style="--d: {r.delay}ms">
          <circle cx={r.x} cy={r.y} r="26" fill="url(#replicaGlow)" />
          <circle cx={r.x} cy={r.y} r="9" fill="#60a5fa" />
        </g>
      {/each}
    </svg>

    <div class="brand" class:visible={stage >= 2}>
      <div class="wordmark">red<span>·</span>ui</div>
      <div class="tagline">connecting</div>
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
  svg.breathe { animation: breathe 700ms var(--ease-spring); }

  @keyframes breathe {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.04); }
  }

  .node { opacity: 0; transform-origin: center; transform: scale(0.4); transition: opacity 320ms var(--ease-out), transform 480ms var(--ease-spring); }
  .node.visible { opacity: 1; transform: scale(1); }
  .replica { transition-delay: var(--d, 0ms); }

  .pulse {
    transform-origin: 200px 110px;
    animation: pulse 1.6s ease-out infinite;
  }
  @keyframes pulse {
    0% { transform: scale(1); opacity: 0.6; }
    100% { transform: scale(2.6); opacity: 0; }
  }

  .edge {
    opacity: 0;
    stroke-dashoffset: 100;
    transition: opacity 280ms var(--ease-out);
    animation: dash 1.2s linear infinite;
    animation-play-state: paused;
  }
  .edge.visible { opacity: 0.55; animation-play-state: running; }
  @keyframes dash { to { stroke-dashoffset: 0; } }

  .particle { filter: drop-shadow(0 0 4px #ff2056); }

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
    color: var(--fg-0);
    letter-spacing: -0.02em;
  }
  .wordmark span {
    color: var(--accent);
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
    color: var(--fg-3);
    margin-top: 8px;
  }
</style>
