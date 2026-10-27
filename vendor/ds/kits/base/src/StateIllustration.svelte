<svelte:options namespace="svg" />
<script lang="ts">
  import type { SVGAttributes } from "svelte/elements";
  import type { StateIllustrationContract } from "./core/contracts/stateillustration";
  import { illustrationNodes, illustrationAttributes, type IllustrationNode } from "./core/state-illustration";
  import { stateIllustration } from "./state-illustration.variants";
  interface Props extends StateIllustrationContract,Omit<SVGAttributes<SVGSVGElement>,keyof StateIllustrationContract|"class"|"children"|"role"|"aria-label"|"aria-hidden"|"width"|"height"|"color"> {
    /** Extra classes merged over the Density-owned artwork bounds. */
    class?:string;
  }
  let {art,size="md",accent,decorative=true,label,class:className,...rest}:Props=$props();
  const nodes=$derived(illustrationNodes(art));
  const name=$derived.by(()=>{if(!decorative&&!label?.trim())throw new Error("StateIllustration requires label when decorative is false");return decorative?undefined:label;});
</script>
{#snippet geometry(children: readonly IllustrationNode[])}
  {#each children as node,index (index)}
    <svelte:element this={node.tag} {...illustrationAttributes(node,accent)}>
      {#if node.children}{@render geometry(node.children)}{/if}
    </svelte:element>
  {/each}
{/snippet}
<svg {...rest} xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300" role={decorative?undefined:"img"} aria-label={name} aria-hidden={decorative?true:undefined} focusable="false" data-state-illustration={art.name} class={stateIllustration({size,class:className})}>
  {@render geometry(nodes)}
</svg>
