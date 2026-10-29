<script lang="ts">
  import { Select } from '@reddb-io/design-system/base'
  import { SettingsRow } from '@reddb-io/design-system/app'
  import PageHeader from './PageHeader.svelte'
  import { useWorkspace } from './workspace-context'
  const { theme } = useWorkspace()
</script>

<div class="h-full overflow-auto bg-background p-6 text-foreground">
  <PageHeader eyebrow="Settings" title="Appearance" subtitle="Choose the workspace color scheme." />
  <SettingsRow label="Color scheme" description="Uses the Design System application theme and preserves the host's density.">
    {#snippet children(control)}
      <Select {...control} value={theme.current} onvaluechange={value => theme.set(value === 'dark' ? 'dark' : 'light')}
        options={[{value: 'light', label: 'Light'}, {value: 'dark', label: 'Dark'}]} />
    {/snippet}
  </SettingsRow>
</div>
