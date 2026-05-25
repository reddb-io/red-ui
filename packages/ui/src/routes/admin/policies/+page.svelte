<script lang="ts">
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { ShieldCheck } from 'lucide-svelte'
</script>

<PageHeader
  eyebrow="Admin"
  title="Policies"
  subtitle="Allow/deny rules that gate access to resources."
/>

<EmptyState
  icon={ShieldCheck}
  title="Policies endpoint not yet exposed"
  message="Policy management will surface here when reddb's policy API is reachable. The local /whoami already simulates per-role grants for the UI's permission-aware behavior."
  hint="reddb roadmap: GET /auth/policies, POST /auth/policies"
/>
