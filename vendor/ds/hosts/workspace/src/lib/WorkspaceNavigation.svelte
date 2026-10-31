<script lang="ts">
  import { NavigationScope } from '@reddb-io/design-system/base'
  import { SidebarRail } from '@reddb-io/design-system/app'
  import Sparkles from '@lucide/svelte/icons/sparkles'
  import FileCode2 from '@lucide/svelte/icons/file-code-2'
  import Database from '@lucide/svelte/icons/database'
  import Network from '@lucide/svelte/icons/network'
  import Shield from '@lucide/svelte/icons/shield'
  import LineChart from '@lucide/svelte/icons/line-chart'
  import Settings2 from '@lucide/svelte/icons/settings-2'
  import { useRouter } from './router.svelte'

  let { label = 'Workspace' }: { label?: string } = $props()
  const router = useRouter()
  const destinations = [
    { id: 'ask', label: 'Ask', icon: Sparkles },
    { id: 'query', label: 'Query', icon: FileCode2 },
    { id: 'collections', label: 'Collections', icon: Database },
    { id: 'cluster', label: 'Cluster', icon: Network, separatorBefore: true },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'settings', label: 'Settings', icon: Settings2, separatorBefore: true },
  ] as const
  const items = $derived(destinations.map(item => ({ ...item, href: router.href({ view: item.id }) })))
  const currentId = $derived(router.view === 'appearance' ? 'settings' : router.view)
</script>

<!-- Native destinations also work in embedded workspaces, whose router owns
     its own state. The scope preserves modified clicks and native link menus. -->
<NavigationScope navigate={href => {
  const item = destinations.find(item => router.href({ view: item.id }) === href)
  if (item) router.go({ view: item.id })
}}>
  <SidebarRail label={`${label} navigation`} {items} {currentId} showLabels class="hidden sm:flex" />
  <SidebarRail label={`${label} navigation`} {items} {currentId} class="sm:hidden" />
</NavigationScope>
