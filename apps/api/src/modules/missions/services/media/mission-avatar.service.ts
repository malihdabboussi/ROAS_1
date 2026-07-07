import { Injectable } from '@nestjs/common'
import type { SupabaseClient } from '@supabase/supabase-js'
import { MediaService } from '../../../media/services/media.service'
import {
  type AgentAvatarBackfillRow,
  MissionAvatarRepository,
} from '../../repositories/mission-avatar.repository'
import { MissionAgentGatewayService } from '../gateways/mission-agent-gateway.service'

@Injectable()
export class MissionAvatarService {
  constructor(
    private readonly mediaService: MediaService,
    missionAgentGatewayService: MissionAgentGatewayService,
    private readonly missionAvatarRepository: MissionAvatarRepository = new MissionAvatarRepository(
      missionAgentGatewayService,
    ),
  ) {}

  private static readonly AVATAR_PROMPTS = [
    (name: string, role: string) =>
      `Candid portrait of ${name}, a ${role} in their early 30s. Visible laugh lines around mouth, light freckles across nose bridge, natural skin texture with subtle pores. Warm hazel eyes with amber flecks, relaxed direct gaze, natural lashes. Wearing a sun-faded olive cotton henley, top button undone, fabric softened from years of wear. Thin braided leather bracelet on one wrist. Sitting near a tall window, warm afternoon light casting soft diagonal shadows across face, cream-colored wall behind. 85mm lens, f/2.0, shallow depth of field, high texture fidelity. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
    (name: string, role: string) =>
      `Editorial portrait of ${name}, a ${role} aged 28-33. Fine expression lines at corners of eyes, natural uneven skin tone, visible pore texture on cheeks. Dark brown eyes catching a soft neon reflection, steady half-smile gaze slightly off-camera. Wearing a broken-in cognac leather jacket over a plain charcoal tee, collar popped casually. Small silver hoop in one ear. Soft pink-purple neon accent light from the left, dark moody background with bokeh city lights. 50mm lens, f/1.8, high texture fidelity, no beauty smoothing. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, bloom.`,
    (name: string, role: string) =>
      `Lifestyle portrait of ${name}, a young ${role}. Visible dimples, natural skin redness around nose, subtle under-eye circles from real life. Clear grey-green eyes with fine dark lashes, open genuine expression looking into camera. Wearing an unstructured raw-hem linen overshirt in dusty sage, sleeves pushed up to elbows, white tee underneath. Worn canvas watch strap on wrist. Leaning against a weathered concrete wall, overcast daylight creating even soft illumination with cool blue-grey tones. 85mm lens, f/2.2, shallow depth of field, Kodak Portra 400 film tones. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated colors.`,
    (name: string, role: string) =>
      `Close-up portrait of ${name}, a ${role} in their late 20s. Pronounced cheekbone shadows, natural hyperpigmentation on forehead, visible pores and faint texture along jawline. Deep brown eyes with warm amber ring around pupil, direct intense gaze with half-smile. Wearing a well-worn black ribbed crew-neck, fabric stretched slightly at collar. No visible jewelry. Dramatic single-source side lighting from the right, deep shadows on opposite cheek, dark charcoal background. Medium format camera feel, 90mm equivalent, f/2.4, extremely high texture fidelity. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR, bloom.`,
    (name: string, role: string) =>
      `Outdoor portrait of ${name}, a ${role} aged 30-35. Sun-warmed skin with fine crow's feet starting at eye corners, a scattering of moles on neck, natural unretouched complexion. Bright amber-brown eyes squinting slightly against the light, easy relaxed grin showing teeth. Wearing a faded indigo denim trucker jacket, top snap undone, heather-grey tee visible beneath. Thin gold chain catching sunlight at collarbone. Standing on a quiet residential street, late golden-hour sun creating warm rim light on hair and shoulders, soft urban bokeh behind. 35mm lens, f/2.8, street photography aesthetic, natural grain. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
    (name: string, role: string) =>
      `Café portrait of ${name}, a ${role} in their early 30s. Fine smile lines around eyes, a faded scar near left eyebrow, natural skin with visible pore texture and slight flush across cheeks. Olive-green eyes with golden undertones, warm genuine eye-contact smile with crow's feet deepening. Wearing an oatmeal-colored chunky wool cardigan over a fitted dark navy tee, fabric texture visible in knit pattern. Delicate silver pendant on a thin chain. Seated near a window, cool natural daylight from the left mixing with warm interior amber, soft shadows on right side of face. 85mm lens, f/1.8, shallow depth of field, film-like color rendering. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated colors.`,
    (name: string, role: string) =>
      `Black and white portrait of ${name}, a ${role} aged 28-34. High contrast revealing every facial detail: fine forehead creases, nasolabial folds, subtle texture around chin, individual eyebrow hairs visible. Striking dark eyes with precise catchlight, contemplative expression with jaw slightly tensed, one hand near collar. Wearing a crisp but slightly wrinkled white oxford shirt, top two buttons open, sleeves rolled once. Thin-banded wristwatch with scratched crystal. Clean light grey backdrop, single large softbox from upper left creating Rembrandt lighting triangle on cheek. Medium format, 110mm equivalent, f/4, extremely sharp detail. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, low resolution.`,
    (name: string, role: string) =>
      `Rooftop portrait of ${name}, a ${role} around 32. Wind-tousled hair, natural sun weathering on cheekbones, visible pores and subtle peach fuzz catching backlight. Light brown eyes with green flecks, warm expression with a closed-lip smile. Wearing an unlined cotton-twill bomber jacket in washed navy, zippered halfway, over a cream waffle-knit thermal. Simple beaded bracelet on one wrist. City skyline blurred behind, setting sun creating strong warm rim light on hair and shoulders, lens flare kissing the frame edge. 50mm lens, f/2.0, natural backlit exposure, slight haze. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR, bloom.`,
    (name: string, role: string) =>
      `Documentary street portrait of ${name}, a ${role} in their early 30s. Natural complexion with slight redness at nose tip, fine lines forming at eye corners, a small beauty mark on right cheek. Dark eyes with warm depth, relaxed asymmetric smile captured mid-conversation. Wearing a washed olive field jacket with brass snaps, layered over a burgundy pocket tee, collar slightly askew. Thin-framed metal glasses pushed up into hair. Standing in open shade of a building awning, even diffused daylight with cool undertones, blurred pedestrians in background. 40mm lens, f/2.8, documentary candid feel, slight grain. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR.`,
    (name: string, role: string) =>
      `Studio portrait of ${name}, a ${role} in their mid-30s. Subtle crow's feet and laugh lines that show lived experience, natural uneven skin tone with slight warmth across cheekbones, visible pore texture. Blue-grey eyes with fine radiating iris detail, serene gaze directly into camera. Wearing a fitted black merino wool turtleneck, fabric draping naturally at shoulders. Single thin gold ring on right hand. Clean gradient backdrop from warm charcoal to cool slate, large octabox from upper right creating soft wrapped lighting with gentle shadow under chin. 85mm lens, f/2.0, ring light catch in eyes, high texture fidelity, editorial feel. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
    (name: string, role: string) =>
      `Library portrait of ${name}, a ${role} aged 29-34. Fine reading lines at inner brow, natural skin with visible pore texture and a faint mole on left temple. Warm brown eyes with honey undertones, thoughtful half-smile with one eyebrow slightly raised. Wearing a textured herringbone wool blazer in deep forest green over a cream oxford shirt, top button open, fabric showing natural drape at shoulders. Vintage tortoiseshell reading glasses hanging from a cord around neck. Seated in a quiet reading nook, warm tungsten desk lamp from the right mixing with cool daylight from tall windows behind, blurred bookshelves in background. 85mm lens, f/2.0, shallow depth of field, rich warm tones. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
    (name: string, role: string) =>
      `Coastal portrait of ${name}, a ${role} in their late 20s. Sun-kissed skin with fine salt-air weathering on cheeks, natural freckles across nose and cheekbones, visible pore texture. Bright blue-green eyes squinting gently against coastal glare, relaxed open smile. Wearing an unbuttoned chambray shirt in washed sky blue over a white ribbed tank, sleeves rolled to forearms, fabric slightly wind-tousled. Simple hemp cord bracelet on wrist. Standing on a wooden boardwalk, strong ocean-side backlight creating warm rim light on hair, soft blue horizon bokeh behind. 50mm lens, f/2.2, natural backlit exposure, airy coastal palette. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated blues.`,
    (name: string, role: string) =>
      `Workshop portrait of ${name}, a ${role} aged 31-35. Slight wood-dust on forearms, natural skin with visible pores and a small nick scar on chin, uneven tan from outdoor work. Hazel eyes with gold flecks, focused confident gaze with a closed-lip smirk. Wearing a red-and-black buffalo plaid flannel shirt, sleeves rolled twice, top two buttons open over a grey henley. Leather tool belt strap visible at waist edge. Warm overhead workshop bulbs mixed with cool daylight from a roll-up door, blurred workbench and hand tools in background. 40mm lens, f/2.8, documentary maker-space feel, slight grain. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR.`,
    (name: string, role: string) =>
      `Greenhouse portrait of ${name}, a ${role} in their early 30s. Dewy natural complexion with slight humidity flush on cheeks, fine smile lines, visible pore texture and subtle peach fuzz. Soft green-brown eyes with warm depth, gentle genuine smile. Wearing a sage-green canvas apron over a loose white linen blouse, a few soil smudges on apron strap, sleeves pushed up. Small terracotta pot held casually at chest edge. Diffused greenhouse daylight filtering through frosted glass panels, lush plant bokeh in background, even soft illumination with green undertones. 85mm lens, f/2.0, shallow depth of field, organic natural palette. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated greens.`,
    (name: string, role: string) =>
      `Backstage portrait of ${name}, a ${role} aged 27-32. Natural skin with visible pores, faint under-eye shadows from late nights, a small beauty mark below lower lip. Dark eyes with stage-light catchlights, energetic asymmetric grin. Wearing a faded vintage band tee with cracked screen-print lettering, black denim jacket draped off one shoulder, silver chain necklace. Warm amber stage spill light from the left, deep shadow on opposite side, blurred equipment cases and cable runs in background. 50mm lens, f/1.8, high contrast, gritty concert documentary feel. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, bloom, HDR glow.`,
    (name: string, role: string) =>
      `Farmers market portrait of ${name}, a ${role} in their early 30s. Fresh morning skin with natural redness at nose tip, visible pore texture, fine crow's feet when smiling. Warm amber eyes, bright genuine smile showing teeth. Wearing a waxed cotton barn jacket in olive over a striped Breton tee, canvas tote strap crossing chest. Early Saturday morning light, soft overcast sky, blurred produce stalls and canvas awnings behind. 35mm lens, f/2.8, candid street-market energy, natural grain. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated colors.`,
    (name: string, role: string) =>
      `Commuter portrait of ${name}, a ${role} aged 28-33. Tired-but-alert expression, natural skin with visible pores and slight dark circles under eyes, fine lines at eye corners. Grey-blue eyes with precise catchlight, steady direct gaze. Wearing a structured charcoal wool coat over a navy merino crew-neck, wool scarf loosely draped, no visible logos. Standing on an open-air train platform, cool overcast daylight from above, blurred platform signage and steel columns in background. 85mm lens, f/2.4, muted urban palette, crisp detail. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR, bloom.`,
    (name: string, role: string) =>
      `Hotel lobby portrait of ${name}, a ${role} in their mid-30s. Polished but natural complexion with visible pore texture, subtle warmth across cheekbones, fine expression lines. Dark brown eyes with calm confidence, relaxed closed-lip smile. Wearing a tailored soft-shoulder blazer in warm camel over a black silk tee, minimal gold stud earrings. Elegant hotel lobby with marble columns softly blurred behind, warm ambient chandelier light from above mixed with cool daylight from entrance. 85mm lens, f/2.0, shallow depth of field, muted luxury tones. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
    (name: string, role: string) =>
      `Bookstore portrait of ${name}, a ${role} aged 29-34. Natural skin with visible pores, slight flush on cheeks, fine smile lines deepening with expression. Warm hazel eyes, curious gentle smile looking slightly off-camera. Wearing a marled heather-grey wool sweater with visible knit texture, sleeves pushed to forearms, simple leather-band watch. Independent bookstore interior, warm tungsten shelf lighting from the right, towering book stacks blurred behind. 50mm lens, f/1.8, cozy analog tones, shallow depth of field. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated warmth.`,
    (name: string, role: string) =>
      `Pottery studio portrait of ${name}, a ${role} in their early 30s. Clay dust on forearms and cheekbone, natural skin with visible pores and uneven tone, authentic maker's hands near frame edge. Earthy brown eyes with warm depth, focused serene expression. Wearing a clay-stained canvas apron in natural ecru over a loose terracotta linen shirt, sleeves rolled up. Soft north-facing studio window light, earthy ceramic shelves and drying pots blurred in background. 85mm lens, f/2.2, warm muted earth tones, high texture fidelity. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR.`,
    (name: string, role: string) =>
      `Wine bar portrait of ${name}, a ${role} aged 30-35. Natural skin with visible pore texture, subtle wine-warm flush on cheeks, fine laugh lines. Deep brown eyes with amber ring, warm intimate half-smile. Wearing a fitted dark merino v-neck sweater in charcoal, fabric showing natural knit drape, thin silver chain at collarbone. Dim wine bar interior, warm candlelight and amber pendant glow from the left, dark wood and bottle racks blurred behind. 85mm lens, f/1.8, rich low-light tones, no beauty smoothing. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, bloom, HDR glow.`,
    (name: string, role: string) =>
      `Rainy day portrait of ${name}, a ${role} in their late 20s. Rain-damp skin with natural sheen, visible pores, fine droplets on hair strands, slight redness at nose from cold. Clear grey eyes with soft catchlight, calm resilient expression. Wearing a waxed olive raincoat with hood down, collar popped, navy scarf visible beneath, water beading on fabric shoulders. Overcast rainy sidewalk, wet pavement reflections creating soft upward fill light, blurred umbrella shapes in background. 50mm lens, f/2.0, cool muted palette with warm skin tones, slight grain. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated colors.`,
    (name: string, role: string) =>
      `Gallery portrait of ${name}, a ${role} aged 28-33. Clean natural complexion with visible pore texture, subtle asymmetry in expression, fine brow lines. Striking light grey eyes, contemplative gaze into camera. Wearing a minimalist black heavyweight cotton tee, clean lines, no jewelry, hair neatly styled with one strand slightly out of place. White gallery wall with a large abstract canvas blurred behind, even diffused track lighting from above, high-key clean environment. 90mm lens, f/2.8, crisp editorial detail, muted neutral palette. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR, bloom.`,
    (name: string, role: string) =>
      `Night market portrait of ${name}, a ${role} in their early 30s. Natural skin with visible pores, warm food-stall glow on cheeks, fine smile lines. Dark eyes reflecting colorful neon, animated genuine smile mid-laugh. Wearing a patterned block-print shirt in indigo and rust, open at collar over a plain white tee, simple woven bracelet. Vibrant night market stall lights — warm orange and cool teal neon — from both sides, steam and hanging lanterns blurred behind. 35mm lens, f/2.0, cinematic night-market energy, controlled color contrast. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated neon, bloom.`,
    (name: string, role: string) =>
      `Trailhead portrait of ${name}, a ${role} aged 30-34. Wind-flushed cheeks, sun weathering on forehead, visible pores and natural uneven tan lines. Bright green-brown eyes, determined relaxed grin. Wearing a technical fleece quarter-zip in slate blue over a moisture-wicking grey tee, small daypack strap visible on one shoulder. Alpine trailhead, overcast mountain sky with soft diffused light, pine trees and distant peaks blurred behind. 50mm lens, f/2.8, crisp outdoor detail, natural muted greens and greys. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
    (name: string, role: string) =>
      `Garage portrait of ${name}, a ${role} in their early 30s. Slight grease smudge on temple, natural skin with visible pores and stubble shadow, authentic working hands near collar. Blue eyes with steel undertones, confident easy smirk. Wearing a faded navy work shirt with rolled sleeves, top button open, faint oil stains on chest pocket. Vintage garage interior, warm single bare bulb overhead mixed with daylight from open bay door, classic car silhouette blurred behind. 40mm lens, f/2.4, gritty automotive documentary feel, slight grain. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR.`,
    (name: string, role: string) =>
      `Kitchen morning portrait of ${name}, a ${role} aged 28-32. Soft morning skin with visible pores, slight bedhead texture in hair, natural under-eye softness. Warm brown eyes with gentle catchlight, sleepy genuine smile. Wearing a chunky oatmeal waffle-knit cardigan over a soft grey tee, holding a ceramic mug at chest level. Bright kitchen window light from the left, white subway tile and hanging plants softly blurred behind, clean morning atmosphere. 85mm lens, f/2.0, warm natural tones, shallow depth of field. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, oversaturated warmth.`,
    (name: string, role: string) =>
      `Patio coworking portrait of ${name}, a ${role} in their early 30s. Natural skin with visible pore texture, fine sun lines at eye corners, relaxed outdoor flush. Hazel eyes with green flecks, approachable open smile. Wearing a breathable white linen shirt, top two buttons open, sleeves rolled, simple leather cord necklace. Outdoor coworking patio with string lights and potted monstera blurred behind, late-afternoon golden light from the right, warm bokeh. 50mm lens, f/2.0, lifestyle editorial feel, soft golden palette. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
    (name: string, role: string) =>
      `Recording studio portrait of ${name}, a ${role} aged 27-31. Natural skin with visible pores, faint fatigue under eyes, focused creative energy in expression. Dark eyes with purple accent light reflection, intense calm gaze. Wearing a black oversized hoodie, studio headphones resting around neck, silver nose stud. Dim recording booth, soft purple and amber accent lights from mixing desk behind, acoustic foam panels blurred in background. 85mm lens, f/1.8, moody low-key tones, high texture fidelity. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, bloom, oversaturated purple.`,
    (name: string, role: string) =>
      `Museum hall portrait of ${name}, a ${role} in their mid-30s. Refined natural complexion with visible pore texture, subtle age lines at eye corners, composed expression. Grey-blue eyes with measured gaze, subtle knowing smile. Wearing a structured herringbone tweed coat in warm brown over a cream turtleneck, vintage lapel pin on coat. Grand museum hall with marble floors and arched ceiling softly blurred behind, even diffused skylight from above, quiet dignified atmosphere. 85mm lens, f/2.4, classical editorial feel, muted heritage tones. Upper body only, chest-up portrait, no legs. Avoid: beauty filter, smooth skin, CGI look, AI plastic skin, waxy texture, retouched face, HDR glow.`,
  ]

  async generateOnboardingAvatar(userId: string): Promise<{ url: string } | null> {
    const tpl =
      MissionAvatarService.AVATAR_PROMPTS[
        Math.floor(Math.random() * MissionAvatarService.AVATAR_PROMPTS.length)
      ]!
    const prompt = tpl('Vibey', 'CEO')
    const result = await this.mediaService.generateImage(
      {
        prompt,
        aspect_ratio: '1:1',
        category: 'agent-avatar',
        tags: ['ai-generated', 'agent-portrait', 'onboarding'],
      },
      { id: userId },
    )
    if (!result.success || !result.url) return null
    return { url: result.url }
  }

  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    backoffMs = 3000,
  ): Promise<T> {
    let lastError: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn()
      } catch (e) {
        lastError = e
        if (attempt === maxAttempts) break
        await new Promise((r) => setTimeout(r, backoffMs * attempt))
      }
    }
    throw lastError
  }

  private async patchAgentRegistry(
    agentKey: string,
    userId: string,
    orgId: string | null | undefined,
    patch: Record<string, unknown>,
  ) {
    return this.missionAvatarRepository.patchAgentRegistry(agentKey, userId, orgId, patch)
  }

  async generateAgentAvatar(
    userId: string,
    agentKey: string,
    name: string,
    role: string,
    orgId?: string | null,
  ) {
    // Mark in-flight so concurrent backfill calls skip this agent
    await this.patchAgentRegistry(agentKey, userId, orgId, {
      generating_avatar_at: new Date().toISOString(),
    })

    try {
      await this.retryWithBackoff(async () => {
        const tpl =
          MissionAvatarService.AVATAR_PROMPTS[
            Math.floor(Math.random() * MissionAvatarService.AVATAR_PROMPTS.length)
          ]!
        const prompt = tpl(name, role)
        const result = await this.mediaService.generateImage(
          {
            prompt,
            aspect_ratio: '1:1',
            category: 'agent-avatar',
            tags: ['ai-generated', 'agent-portrait'],
          },
          { id: userId },
        )
        if (!result.success || !result.url) {
          throw new Error('Agent avatar image generation failed')
        }

        const { error: writeError } = await this.patchAgentRegistry(agentKey, userId, orgId, {
          image_url: result.url,
          generating_avatar_at: null,
        })
        if (writeError) {
          throw new Error(`Failed to persist agent avatar URL: ${writeError.message}`)
        }
      })
    } catch (err) {
      // Clear in-flight flag so backfill can retry on the next cycle
      await this.patchAgentRegistry(agentKey, userId, orgId, { generating_avatar_at: null })
      throw err
    }
  }

  async backfillMissingAgentAvatars(supabase: SupabaseClient) {
    const nonVibey = await this.missionAvatarRepository.listNonVibeyMissingAvatarAgents(supabase)
    const vibeyPortrait =
      await this.missionAvatarRepository.listVibeyPortraitMissingAvatarAgents(supabase)

    const agents = [
      ...(nonVibey as AgentAvatarBackfillRow[]),
      ...(vibeyPortrait as AgentAvatarBackfillRow[]),
    ]
    let processed = 0
    let failed = 0

    for (const agent of agents) {
      try {
        await this.generateAgentAvatar(
          agent.user_id,
          agent.agent_key,
          agent.name,
          agent.role,
          agent.org_id,
        )
        processed++
      } catch {
        failed++
      }
      await new Promise((r) => setTimeout(r, 1000))
    }

    return { ok: true, processed, failed }
  }
}
