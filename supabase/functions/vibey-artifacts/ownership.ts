export type OwnerScope = {
  userId: string
  orgId: string | null
}

export type OwnedFunnel = {
  id: string
  user_id?: string | null
  org_id?: string | null
  funnel_type?: string | null
}

export type OwnedFunnelPage = {
  page: {
    id: string
    funnel_id: string
  }
  funnel: OwnedFunnel
}

type QueryBuilder = {
  eq: (column: string, value: unknown) => QueryBuilder
  is: (column: string, value: unknown) => QueryBuilder
  maybeSingle: () => Promise<{ data: unknown; error?: unknown }>
}

type SupabaseLike = {
  from: (table: string) => any
}

export function applyOwnerScope<T extends QueryBuilder>(query: T, scope: OwnerScope): T {
  if (scope.orgId) return query.eq('org_id', scope.orgId) as T
  return query.eq('user_id', scope.userId).is('org_id', null) as T
}

export async function findOwnedFunnel(
  supabase: SupabaseLike,
  scope: OwnerScope,
  funnelId: string,
  options: { funnelType?: string } = {},
): Promise<OwnedFunnel | null> {
  let query = applyOwnerScope(
    supabase.from('funnels').select('id,user_id,org_id,funnel_type').eq('id', funnelId),
    scope,
  )
  if (options.funnelType) {
    query = query.eq('funnel_type', options.funnelType)
  }

  const { data, error } = await query.maybeSingle()
  if (error || !data || typeof data !== 'object') return null
  return data as OwnedFunnel
}

export async function findOwnedFunnelPage(
  supabase: SupabaseLike,
  scope: OwnerScope,
  pageId: string,
  options: { funnelType?: string } = {},
): Promise<OwnedFunnelPage | null> {
  const { data: page, error } = await supabase
    .from('funnel_pages')
    .select('id,funnel_id')
    .eq('id', pageId)
    .maybeSingle()

  if (error || !page || typeof page !== 'object') return null
  const candidate = page as { id?: unknown; funnel_id?: unknown }
  const id = typeof candidate.id === 'string' ? candidate.id : ''
  const funnelId = typeof candidate.funnel_id === 'string' ? candidate.funnel_id : ''
  if (!id || !funnelId) return null

  const funnel = await findOwnedFunnel(supabase, scope, funnelId, options)
  if (!funnel) return null

  return {
    page: { id, funnel_id: funnelId },
    funnel,
  }
}
