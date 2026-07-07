import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { applyOwnerScope, findOwnedFunnel, findOwnedFunnelPage } from './ownership.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AGENT_TOKEN = Deno.env.get('VIBEY_AGENT_TOKEN')?.trim() ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-vibey-user-id, x-vibey-campaign-id, x-vibey-conversation-id, x-vibey-org-id, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const VALID_FUNNEL_TYPES = [
  'lead-magnet',
  'call-booking',
  'webinar',
  'home-page',
  'live-event',
  'ecommerce-product',
  'cart-checkout',
  'vsl',
  'custom',
  'website',
]

const VALID_WEBSITE_PAGE_TYPES = [
  'home',
  'about',
  'services',
  'pricing',
  'team',
  'contact',
  'blog-listing',
  'blog-post',
  'faq',
  'testimonials',
  'portfolio',
  'custom',
]

const FUNNEL_TYPE_ALIASES: Record<string, string> = {
  'general-home-page': 'home-page',
  'business website': 'website',
  'company site': 'website',
  'full website': 'website',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function err(message: string, status = 400) {
  return json({ error: message }, status)
}

function normalizeFunnelType(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return 'lead-magnet'
  const value = String(raw).trim().toLowerCase()
  const mapped = FUNNEL_TYPE_ALIASES[value] ?? value
  return VALID_FUNNEL_TYPES.includes(mapped) ? mapped : null
}

function normalizeWebsitePageType(raw: unknown, path: unknown): string | null {
  const inferred = typeof path === 'string' && path.trim() === '/' ? 'home' : 'custom'
  const value = String(raw ?? inferred)
    .trim()
    .toLowerCase()
  const mapped = value === 'homepage' || value === 'home-page' ? 'home' : value
  return VALID_WEBSITE_PAGE_TYPES.includes(mapped) ? mapped : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Auth check
  if (!AGENT_TOKEN) {
    return err('server misconfigured', 500)
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? ''
  if (!token || token !== AGENT_TOKEN) {
    return err('unauthorized', 401)
  }

  const userId = req.headers.get('x-vibey-user-id')
  const campaignId = req.headers.get('x-vibey-campaign-id')
  const conversationId = req.headers.get('x-vibey-conversation-id')
  const orgId = req.headers.get('x-vibey-org-id')

  if (!userId) return err('x-vibey-user-id header required')

  const { action, data } = await req.json()
  if (!action) return err('action required')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const ownerScope = { userId, orgId }
  const scopeQuery = (query: any): any => applyOwnerScope(query, ownerScope)

  try {
    switch (action) {
      // ── OFFERS ────────────────────────────────────────────
      case 'list_offers': {
        const query = scopeQuery(supabase.from('offers').select('*'))
        if (campaignId) query.eq('campaign_id', campaignId)
        const { data: offers, error } = await query.order('created_at', { ascending: false })
        if (error) return err(error.message)
        return json(offers)
      }

      case 'get_offer': {
        const offerId = data?.offer_id
        if (!offerId) return err('offer_id required')
        const { data: offer, error } = await scopeQuery(
          supabase.from('offers').select('*').eq('id', offerId),
        ).single()
        if (error) return err(error.message)
        return json(offer)
      }

      case 'create_offer': {
        const { data: offer, error } = await supabase
          .from('offers')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            name: data?.name ?? 'Untitled Offer',
            processing_status: data?.processing_status ?? 'draft',
            step1_data: data?.step1_data ?? null,
            step2_data: data?.step2_data ?? null,
            step3_data: data?.step3_data ?? null,
            step4_data: data?.step4_data ?? null,
            step5_data: data?.step5_data ?? null,
            step6_data: data?.step6_data ?? null,
          })
          .select()
          .single()
        if (error) return err(error.message)
        return json(offer)
      }

      case 'update_offer': {
        const offerId = data?.offer_id
        if (!offerId) return err('offer_id required')
        const updates: Record<string, unknown> = {}
        for (const key of [
          'name',
          'processing_status',
          'step1_data',
          'step2_data',
          'step3_data',
          'step4_data',
          'step5_data',
          'step6_data',
        ]) {
          if (data?.[key] !== undefined) updates[key] = data[key]
        }
        const { data: offer, error } = await scopeQuery(
          supabase.from('offers').update(updates).eq('id', offerId),
        )
          .select()
          .single()
        if (error) return err(error.message)
        return json(offer)
      }

      // ── FUNNELS ────────────────────────────────────────────
      case 'list_funnels': {
        const query = scopeQuery(
          supabase
            .from('funnels')
            .select('*, funnel_pages(id, name, slug, page_type, order_index)'),
        )
        if (campaignId) query.eq('campaign_id', campaignId)
        const { data: funnels, error } = await query.order('created_at', { ascending: false })
        if (error) return err(error.message)
        return json(funnels)
      }

      case 'get_funnel': {
        const funnelId = data?.funnel_id
        if (!funnelId) return err('funnel_id required')
        const { data: funnel, error } = await scopeQuery(
          supabase.from('funnels').select('*, funnel_pages(*)').eq('id', funnelId),
        ).single()
        if (error) return err(error.message)
        return json(funnel)
      }

      case 'create_funnel': {
        const funnelName = data?.name ?? 'Untitled Funnel'
        const funnelType = normalizeFunnelType(data?.funnel_type)
        if (!funnelType) {
          return err(
            `Invalid funnel_type "${String(data?.funnel_type)}". Allowed values: ${VALID_FUNNEL_TYPES.join(', ')}. general-home-page may only map to home-page or website; never retry homepage failures as lead-magnet.`,
          )
        }
        let slug =
          (data?.slug as string) ||
          funnelName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60)

        const { data: existingSlug } = await scopeQuery(
          supabase.from('funnels').select('id').eq('slug', slug),
        ).maybeSingle()
        if (existingSlug) {
          const suffix = Math.random().toString(36).slice(2, 6)
          slug = `${slug}-${suffix}`
        }

        const { data: funnel, error } = await supabase
          .from('funnels')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            name: funnelName,
            funnel_type: funnelType,
            slug,
            status: data?.status ?? 'draft',
          })
          .select()
          .single()
        if (error) {
          if (error.code === '23505' && error.message.includes('slug')) {
            return err(
              `SLUG_CONFLICT: A funnel with slug "${slug}" already exists. Retry with a different, more unique slug.`,
            )
          }
          return err(error.message)
        }
        return json(funnel)
      }

      case 'create_website': {
        const websiteData = { ...data, funnel_type: 'website' }
        const funnelName = websiteData?.name ?? 'Untitled Website'
        let slug =
          (websiteData?.slug as string) ||
          funnelName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .slice(0, 60)

        const { data: existingSlug } = await scopeQuery(
          supabase.from('funnels').select('id').eq('slug', slug),
        ).maybeSingle()
        if (existingSlug) {
          const suffix = Math.random().toString(36).slice(2, 6)
          slug = `${slug}-${suffix}`
        }

        const { data: website, error } = await supabase
          .from('funnels')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            name: funnelName,
            funnel_type: 'website',
            slug,
            status: websiteData?.status ?? 'draft',
          })
          .select()
          .single()
        if (error) return err(error.message)
        return json(website)
      }

      case 'list_websites': {
        const query = scopeQuery(
          supabase
            .from('funnels')
            .select('*, funnel_pages(id, name, slug, page_type, order_index)'),
        ).eq('funnel_type', 'website')
        if (campaignId) query.eq('campaign_id', campaignId)
        const { data: websites, error } = await query.order('created_at', { ascending: false })
        if (error) return err(error.message)
        return json(websites)
      }

      case 'get_website': {
        const funnelId = data?.funnel_id
        if (!funnelId) return err('funnel_id required')
        const { data: website, error } = await scopeQuery(
          supabase
            .from('funnels')
            .select('*, funnel_pages(*), blog_posts(id, title, slug, status, published_at)')
            .eq('id', funnelId)
            .eq('funnel_type', 'website'),
        ).single()
        if (error) return err(error.message)
        return json(website)
      }

      case 'add_funnel_page': {
        if (!data?.funnel_id) return err('funnel_id required')
        const funnel = await findOwnedFunnel(supabase, ownerScope, String(data.funnel_id))
        if (!funnel) return err('funnel not found or access denied', 403)
        const { data: page, error } = await supabase
          .from('funnel_pages')
          .insert({
            funnel_id: funnel.id,
            user_id: userId,
            name: data?.name ?? 'Untitled Page',
            slug: data?.slug ?? 'untitled',
            page_type: data?.page_type ?? 'opt-in',
            generated_html: data?.generated_html ?? '',
            generated_css: data?.generated_css ?? '',
            order_index: data?.order_index ?? 0,
            generation_mode: data?.generation_mode ?? 'generated',
          })
          .select()
          .single()
        if (error) return err(error.message)
        return json(page)
      }

      case 'add_website_page': {
        if (!data?.funnel_id) return err('funnel_id required')
        const funnel = await findOwnedFunnel(supabase, ownerScope, String(data.funnel_id), {
          funnelType: 'website',
        })
        if (!funnel) return err('website not found or access denied', 403)
        const pageType = normalizeWebsitePageType(data?.page_type, data?.path)
        if (!pageType) {
          return err(
            `Invalid website page_type "${String(data?.page_type)}". Allowed values: ${VALID_WEBSITE_PAGE_TYPES.join(', ')}.`,
          )
        }
        const pagePath =
          typeof data?.path === 'string' && data.path.trim()
            ? data.path.trim()
            : pageType === 'home'
              ? '/'
              : null
        const { data: page, error } = await supabase
          .from('funnel_pages')
          .insert({
            funnel_id: funnel.id,
            user_id: userId,
            name: data?.name ?? 'Untitled Page',
            slug: data?.slug ?? (pageType === 'home' ? 'home' : 'untitled'),
            page_type: pageType,
            path: pagePath,
            generated_html: data?.generated_html ?? '',
            generated_css: data?.generated_css ?? '',
            order_index: data?.order_index ?? 0,
            generation_mode: data?.generation_mode ?? 'generated',
          })
          .select()
          .single()
        if (error) return err(error.message)
        return json(page)
      }

      case 'update_funnel_page': {
        if (!data?.page_id) return err('page_id required')
        const owned = await findOwnedFunnelPage(supabase, ownerScope, String(data.page_id))
        if (!owned) return err('funnel page not found or access denied', 403)
        const updates: Record<string, unknown> = {}
        for (const key of [
          'name',
          'slug',
          'page_type',
          'generated_html',
          'generated_css',
          'order_index',
          'generation_mode',
        ]) {
          if (data?.[key] !== undefined) updates[key] = data[key]
        }
        const { data: page, error } = await supabase
          .from('funnel_pages')
          .update(updates)
          .eq('id', owned.page.id)
          .eq('funnel_id', owned.page.funnel_id)
          .select()
          .single()
        if (error) return err(error.message)
        return json(page)
      }

      case 'update_website_page': {
        const pageId = data?.funnel_page_id ?? data?.page_id
        if (!pageId) return err('funnel_page_id required')
        const owned = await findOwnedFunnelPage(supabase, ownerScope, String(pageId), {
          funnelType: 'website',
        })
        if (!owned) return err('website page not found or access denied', 403)
        const updates: Record<string, unknown> = {}
        if (data?.page_type !== undefined || data?.path !== undefined) {
          const pageType = normalizeWebsitePageType(data?.page_type, data?.path)
          if (!pageType) {
            return err(
              `Invalid website page_type "${String(data?.page_type)}". Allowed values: ${VALID_WEBSITE_PAGE_TYPES.join(', ')}.`,
            )
          }
          updates.page_type = pageType
          if (data?.path !== undefined) updates.path = data.path
        }
        for (const key of [
          'name',
          'slug',
          'generated_html',
          'generated_css',
          'order_index',
          'generation_mode',
        ]) {
          if (data?.[key] !== undefined) updates[key] = data[key]
        }
        const { data: page, error } = await supabase
          .from('funnel_pages')
          .update(updates)
          .eq('id', owned.page.id)
          .eq('funnel_id', owned.page.funnel_id)
          .select()
          .single()
        if (error) return err(error.message)
        return json(page)
      }

      case 'delete_website': {
        if (!data?.funnel_id) return err('funnel_id required')
        const { data: website, error } = await scopeQuery(
          supabase
            .from('funnels')
            .select('id, name')
            .eq('id', data.funnel_id)
            .eq('funnel_type', 'website'),
        ).single()
        if (error) return err(error.message)
        return json({
          success: true,
          status: 'pending_approval',
          ui_blocks: [
            {
              type: 'delete_confirm',
              id: `delete-website-${website.id}-${Date.now()}`,
              delete_action: 'delete_website',
              entity_type: 'website',
              entity_id: website.id,
              entity_name: website.name ?? 'Untitled Website',
              status: 'pending',
            },
          ],
        })
      }

      // ── PRESENTATIONS ────────────────────────────────────────
      case 'list_presentations': {
        const query = scopeQuery(supabase.from('presentations').select('*'))
        if (campaignId) query.eq('campaign_id', campaignId)
        const { data: lms, error } = await query.order('created_at', { ascending: false })
        if (error) return err(error.message)
        return json(lms)
      }

      case 'create_presentation': {
        const { data: lm, error } = await supabase
          .from('presentations')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            offer_id: data?.offer_id ?? null,
            name: data?.name ?? 'Untitled Presentation',
            slides: data?.slides ?? [],
            generated_html: data?.generated_html ?? null,
            status: data?.status ?? 'draft',
          })
          .select()
          .single()
        if (error) return err(error.message)
        return json(lm)
      }

      case 'update_presentation': {
        if (!data?.presentation_id) return err('presentation_id required')
        const updates: Record<string, unknown> = {}
        for (const key of ['name', 'slides', 'file_url', 'status', 'generated_html']) {
          if (data?.[key] !== undefined) updates[key] = data[key]
        }
        const { data: lm, error } = await scopeQuery(
          supabase.from('presentations').update(updates).eq('id', data.presentation_id),
        )
          .select()
          .single()
        if (error) return err(error.message)
        return json(lm)
      }

      // ── DOCUMENTS ────────────────────────────────────────────
      case 'list_documents': {
        const query = scopeQuery(supabase.from('documents').select('*'))
        if (campaignId) query.eq('campaign_id', campaignId)
        if (data?.document_type) query.eq('document_type', data.document_type)
        const { data: docs, error } = await query.order('created_at', { ascending: false })
        if (error) return err(error.message)
        return json(docs)
      }

      case 'save_document': {
        if (!data?.title || !data?.content) return err('title and content required')
        const { data: doc, error } = await supabase
          .from('documents')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            title: data.title,
            content: data.content,
            document_type: data?.document_type ?? 'general',
            offer_id: data?.offer_id ?? null,
          })
          .select()
          .single()
        if (error) return err(error.message)
        return json(doc)
      }

      // ── SEQUENCES ────────────────────────────────────────────
      case 'list_sequences': {
        const query = scopeQuery(
          supabase.from('email_sequences').select('*, sequence_emails(id, subject, order_index)'),
        )
        if (campaignId) query.eq('campaign_id', campaignId)
        const { data: seqs, error } = await query.order('created_at', { ascending: false })
        if (error) return err(error.message)
        return json(seqs)
      }

      case 'create_sequence': {
        const { data: seq, error } = await supabase
          .from('email_sequences')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            name: data?.name ?? 'Untitled Sequence',
            sequence_type: data?.sequence_type ?? 'welcome',
            status: data?.status ?? 'draft',
          })
          .select()
          .single()
        if (error) return err(error.message)
        return json(seq)
      }

      case 'add_sequence_email': {
        if (!data?.sequence_id) return err('sequence_id required')
        const { data: email, error } = await supabase
          .from('sequence_emails')
          .insert({
            sequence_id: data.sequence_id,
            user_id: userId,
            subject: data?.subject ?? 'Untitled Email',
            body_html: data?.body_html ?? '',
            order_index: data?.order_index ?? 0,
            delay_hours: data?.delay_hours ?? 0,
          })
          .select()
          .single()
        if (error) return err(error.message)
        return json(email)
      }

      // ── AVATARS ────────────────────────────────────────────
      case 'list_avatars': {
        const query = scopeQuery(supabase.from('avatars').select('*'))
        if (campaignId) query.eq('campaign_id', campaignId)
        const { data: avatars, error } = await query.order('created_at', { ascending: false })
        if (error) return err(error.message)
        return json(avatars)
      }

      case 'create_avatar': {
        const { data: avatar, error } = await supabase
          .from('avatars')
          .insert({
            user_id: userId,
            campaign_id: campaignId,
            offer_id: data?.offer_id ?? null,
            name: data?.name ?? 'Untitled Avatar',
            avatar_data: data?.avatar_data ?? {},
          })
          .select()
          .single()
        if (error) return err(error.message)
        return json(avatar)
      }

      default:
        return err(`unknown action: ${action}`)
    }
  } catch (e) {
    return err(`Server error: ${(e as Error).message}`, 500)
  }
})
