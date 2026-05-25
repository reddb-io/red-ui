<script lang="ts">
  import PageHeader from '$lib/PageHeader.svelte'
  import EmptyState from '$lib/EmptyState.svelte'
  import { Building2 } from 'lucide-svelte'
</script>

<PageHeader
  eyebrow="Admin"
  title="Tenants"
  subtitle="Logical isolation boundaries for multi-tenant deployments."
/>

<EmptyState
  icon={Building2}
  title="Tenants endpoint not yet exposed"
  message="Multi-tenant management will surface here when reddb's tenant API is reachable. For now, tenant_id is just a user-defined column on collections."
  hint="reddb roadmap: GET /auth/tenants, POST /auth/tenants"
/>
