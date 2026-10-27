<!-- Caller-owned commands with managed listbox behavior inside a canonical surface. -->
<script lang="ts">
  import { tick } from "svelte";
  import { Combobox as Bits } from "bits-ui";
  import { Button, Dialog, Field, Kbd, Popover, quietControl } from "@reddb-io/design-system/base";
  import { input, combobox } from "@reddb-io/design-system/base/recipes";
  import type { CommandPaletteContract } from "../core/contracts/commandpalette";
  import { commandGroups, type CommandPaletteCommand } from "./command-palette.behavior";
  import { commandPalette } from "./command-palette.variants";
  interface Props extends CommandPaletteContract {
    /** Reports every open-state request. */
    onopenchange?: (open: boolean) => void;
    /** Additional wrapper classes. */
    class?: string;
    /** Reports selection after the command action. Modal presentation closes before invoking actions. */
    onselect?: (command: CommandPaletteCommand) => void;
  }
  let { triggerLabel, contentLabel, label, commands = [], open = $bindable(false),
    onopenchange, disabled = false, class: className, contentClass, inputClass,
    onselect, presentation = "popover", placeholder, emptyLabel = "No matching commands" }: Props = $props();
  const uid = $props.id();
  const s = commandPalette(), c = combobox();
  let query = $state("");
  let value = $state("");
  const groups = $derived(commandGroups(commands, query));
  function choose(id: string) {
    const command = commands.find(item => item.id === id);
    if (!command || command.disabled) return;
    // Preserve anchored callback ordering; modal actions may open another dialog.
    if (presentation === "popover") { command.onselect?.(); onselect?.(command); }
    open = false;
    onopenchange?.(false);
    value = "";
    query = "";
    if (presentation === "dialog") {
      // Let Dialog release the top layer and restore the invoker before an
      // application action opens another modal or moves focus to a new route.
      void tick().then(() => { command.onselect?.(); onselect?.(command); });
    }
  }
  $effect(() => { if (!open) { query = ""; value = ""; } });
</script>

{#snippet search()}
  {#if open}
    <Field {label} class={s.search()}>
      {#snippet children(control)}
        <Bits.Root type="single" items={commands.map(command => ({ value: command.id, label: command.label }))}
          {disabled} bind:value inputValue={query} open={true} onValueChange={choose}>
          <Bits.Input {...control} aria-controls={`${uid}-commands`} {placeholder} class={input({ class: inputClass })}
            oninput={event => query = event.currentTarget.value}
            onkeydown={event => { if (event.key === "Escape") { event.preventDefault(); open = false; onopenchange?.(false); } }} />
          <Bits.ContentStatic id={`${uid}-commands`} aria-label={label} class={s.list()} onEscapeKeydown={event => { event.preventDefault(); open = false; onopenchange?.(false); }}
            interactOutsideBehavior="defer-otherwise-ignore">
            <!-- Keep one scroll container: the input controls the outer listbox. -->
            <Bits.Viewport class="overflow-visible!">
              {#each groups as group (group.label)}
                <Bits.Group class={s.group()}>
                  {#if group.label}<Bits.GroupHeading class={s.heading()}>{group.label}</Bits.GroupHeading>{/if}
                  {#each group.items as command (command.id)}
                    <Bits.Item value={command.id} label={command.label} disabled={command.disabled} aria-disabled={command.disabled || undefined} class={quietControl({ ink: "foreground", class: `group/command ${c.item()}` })}>
                      <span class={s.identity()}><span>{command.label}</span>
                        {#if command.description}<span class={s.description()}>{command.description}</span>{/if}</span>
                      {#if command.shortcut?.length}<span class={s.keys()} aria-hidden="true">
                        {#each command.shortcut as key, index (index)}<Kbd keys={[key]} size="sm" />{/each}
                      </span>{/if}
                    </Bits.Item>
                  {/each}
                </Bits.Group>
              {/each}
            </Bits.Viewport>
          </Bits.ContentStatic>
          {#if !groups.length}<p role="status" class={c.empty()}>{emptyLabel}</p>{/if}
        </Bits.Root>
      {/snippet}
    </Field>
  {/if}
{/snippet}
<div data-command-palette class={s.root({ class: className })}>
  {#if presentation === "dialog"}
    {#if triggerLabel}<Button size="sm" {disabled} aria-haspopup="dialog" aria-expanded={open}
      onclick={() => { open = true; onopenchange?.(true); }}>{triggerLabel}</Button>{/if}
    <Dialog title={contentLabel}
      bind:open {onopenchange} initialFocus="body" class={s.content({ class: contentClass })}>
      {@render search()}
    </Dialog>
  {:else}
    <Popover triggerLabel={triggerLabel ?? contentLabel} {contentLabel} {disabled}
      bind:open {onopenchange} class={s.content({ class: contentClass })}>
      {@render search()}
    </Popover>
  {/if}
</div>
