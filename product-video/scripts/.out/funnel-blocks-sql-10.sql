INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_53_slug$vsl-call-booking-brrr-guys-vsl-vsl$fb_53_slug$,
  $fb_53_name$VSL$fb_53_name$,
  $fb_53_description$The BRR Guys VSL extracted from vsl-call-booking/brrr-guys-vsl.md$fb_53_description$,
  $fb_53_category$navigation$fb_53_category$,
  ARRAY[$fb_53_page_types_0$vsl$fb_53_page_types_0$, $fb_53_page_types_1$vsl-call-booking$fb_53_page_types_1$, $fb_53_page_types_2$call-booking$fb_53_page_types_2$]::text[],
  ARRAY[$fb_53_funnel_types_0$vsl-call-booking$fb_53_funnel_types_0$]::text[],
  $fb_53_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_53_slot_schema$::jsonb,
  ARRAY[$fb_53_theme_tokens_0$colors$fb_53_theme_tokens_0$, $fb_53_theme_tokens_1$font_heading$fb_53_theme_tokens_1$, $fb_53_theme_tokens_2$font_body$fb_53_theme_tokens_2$]::text[],
  $fb_53_asset_slots${}$fb_53_asset_slots$::jsonb,
  $fb_53_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

// File: VSL.tsx


import { useEffect, useState } from "react";














const VSL = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isUnlocked, setIsUnlocked] = useState(() => {
    // Check localStorage on mount
    return localStorage.getItem("vsl_countdown_unlocked") === "true";
  });
  const [isSecondUnlocked, setIsSecondUnlocked] = useState(() => {
    // Check localStorage on mount for second countdown
    return localStorage.getItem("vsl_video_countdown_unlocked") === "true";
  });
  useUtmParams(); // Capture UTM parameters on page load
  usePageTracking(); // Track page view

  // Capture lead info from URL params (from GHL redirect)
  useEffect(() => {
    const firstName = searchParams.get('first_name') || searchParams.get('firstName');
    const lastName = searchParams.get('last_name') || searchParams.get('lastName');
    const email = searchParams.get('email');
    const phone = searchParams.get('phone');
    
    // If we have lead info from GHL, save to localStorage for later use
    if (firstName || email || phone) {
      const leadInfo = {
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
      };
      localStorage.setItem('brrrr_lead_info', JSON.stringify(leadInfo));
      console.log('📧 Lead info captured from URL:', leadInfo);
      
      // Track this as a lead from /info page
      trackFunnelEvent('lead_captured_from_info', leadInfo);
      
      // Also save to questionnaire_responses immediately so we don't lose them
      const sessionId = localStorage.getItem('brrrr_session_id') || localStorage.getItem('analytics_session_id');
      if (sessionId) {
        supabase.from('questionnaire_responses').upsert({
          session_id: sessionId,
          first_name: firstName || null,
          last_name: lastName || null,
          email: email || null,
          phone: phone || null,
          referrer: localStorage.getItem('brrrr_source_page') || null,
        }, { onConflict: 'session_id' }).then(({ error }) => {
          if (error) {
            console.error('Error saving lead info:', error);
          } else {
            console.log('✅ Lead info saved to database');
          }
        });
      }
    }
  }, [searchParams]);

  useEffect(() => {
    // Load Vidalytics embed script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.innerHTML = `
      (function (v, i, d, a, l, y, t, c, s) {
        y='_'+d.toLowerCase();c=d+'L';if(!v[d]){v[d]={};}if(!v[c]){v[c]={};}if(!v[y]){v[y]={};}var vl='Loader',vli=v[y][vl],vsl=v[c][vl + 'Script'],vlf=v[c][vl + 'Loaded'],ve='Embed';
        if (!vsl){vsl=function(u,cb){
          if(t){cb();return;}s=i.createElement("script");s.type="text/javascript";s.async=1;s.src=u;
          if(s.readyState){s.onreadystatechange=function(){if(s.readyState==="loaded"||s.readyState=="complete"){s.onreadystatechange=null;vlf=1;cb();}};}else{s.onload=function(){vlf=1;cb();};}
          i.getElementsByTagName("head")[0].appendChild(s);
        };}
        vsl(l+'loader.min.js',function(){if(!vli){var vlc=v[c][vl];vli=new vlc();}vli.loadScript(l+'player.min.js',function(){var vec=v[d][ve];t=new vec();t.run(a);});});
      })(window, document, 'Vidalytics', 'vidalytics_embed_Riih9VrTW2zKG4ZC', 'https://example.com/placeholder-video-embed/');
    `;
    document.body.appendChild(script);

    // Track video events via global callbacks
    (window as any).vidalyticsCallback = function(action: string, percentage?: number) {
      if (action === 'video_start') {
        trackVideoEvent('started');
      } else if (action === 'video_progress') {
        if (percentage === 25 || percentage === 50 || percentage === 75 || percentage === 100) {
          trackVideoEvent(`${percentage}`, percentage);
        }
      }
    };

    return () => {
      // Cleanup script on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete (window as any).vidalyticsCallback;
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEFEC' }}>
      <ExitIntentPopupVSL />
      {isUnlocked && <StickyBottomBar isSecondUnlocked={isSecondUnlocked} />}
      
      {/* Simplified Header */}
      <div className="py-3 md:py-4 px-4 md:px-6 lg:px-8" style={{ backgroundColor: '#EFEFEC' }}>
        <div className="container mx-auto px-2 md:px-4 flex justify-center">
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="BRRRR in 90" className="h-12 md:h-14 lg:h-16" />
        </div>
      </div>

      <div className="container mx-auto px-4 pt-4 pb-12 md:pb-16 max-w-5xl">
        <div className="space-y-6 md:space-y-8">
          {/* Simplified Tagline */}
          <div className="text-center pt-2 px-4">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-foreground font-bold leading-relaxed tracking-wide">
              Discover The Exact System <span className="text-primary">500+ Investors</span> Used To Build Cash-Flowing Portfolios
            </p>
          </div>

          <div className="text-center px-2 md:px-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold text-foreground leading-tight mb-8 md:mb-10 tracking-tight">
              Close Your First (or Next) Cash-Flowing Rental in the Next <span className="underline decoration-primary decoration-2 underline-offset-4 md:underline-offset-8">90 Days</span>… <span className="text-primary italic">And Pull Your Capital Back Out to Do It Again</span>
            </h1>
          </div>

          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-primary py-4 px-6 text-center shadow-md">
              <div className="flex items-center justify-center gap-3">
                <p className="text-lg md:text-xl font-extrabold text-white tracking-wider uppercase">
                  Watch This Free Training Now
                </p>
                <svg className="w-6 h-6 text-white animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            </div>

            <div className="relative w-full rounded-b-lg overflow-hidden bg-black aspect-video">
              <div 
                id="vidalytics_embed_VIDEO_ID"
                className="absolute top-0 left-0 w-full h-full"
                style={{ aspectRatio: '16/9' }}
              />
            </div>
          </div>

          {/* Countdown Timer */}
          {!isUnlocked && (
            <UnlockCountdown onComplete={async () => {
              setIsUnlocked(true);
              trackFunnelEvent('vsl_countdown_complete');
              trackFacebookPixelEvent('ViewContent', { 
                content_name: 'VSL_Engaged_2m45s',
                content_category: 'Video Engagement'
              });
              
              // Save video milestone to questionnaire_responses
              const sessionId = localStorage.getItem('brrrr_session_id') || localStorage.getItem('analytics_session_id');
              if (sessionId) {
                // Check if record exists first
                const { data: existing } = await supabase
                  .from('questionnaire_responses')
                  .select('id')
                  .eq('session_id', sessionId)
                  .maybeSingle();
                
                if (existing) {
                  await supabase.from('questionnaire_responses').update({
                    watched_past_2m30s: true,
                    last_video_milestone: '2m30s',
                  }).eq('session_id', sessionId);
                } else {
                  await supabase.from('questionnaire_responses').insert({
                    session_id: sessionId,
                    watched_past_2m30s: true,
                    last_video_milestone: '2m30s',
                  });
                }
              }
            }} />
          )}

          {/* Second Countdown Timer */}
          {isUnlocked && !isSecondUnlocked && (
            <VideoCountdown onComplete={async () => {
              setIsSecondUnlocked(true);
              trackFunnelEvent('vsl_video_countdown_complete');
              trackFacebookPixelEvent('ViewContent', { 
                content_name: 'VSL_Engaged_11m35s',
                content_category: 'Video Engagement'
              });
              
              // Save video milestone to questionnaire_responses
              const sessionId = localStorage.getItem('brrrr_session_id') || localStorage.getItem('analytics_session_id');
              if (sessionId) {
                // Check if record exists first
                const { data: existing } = await supabase
                  .from('questionnaire_responses')
                  .select('id')
                  .eq('session_id', sessionId)
                  .maybeSingle();
                
                if (existing) {
                  await supabase.from('questionnaire_responses').update({
                    watched_past_11m30s: true,
                    last_video_milestone: '11m30s',
                  }).eq('session_id', sessionId);
                } else {
                  await supabase.from('questionnaire_responses').insert({
                    session_id: sessionId,
                    watched_past_11m30s: true,
                    last_video_milestone: '11m30s',
                  });
                }
              }
            }} />
          )}

          {/* Content that unlocks after countdown */}
          {isUnlocked && (
            <>
              {/* Phase 1: Value Bullets - Shows after 2:35 */}
              <ValueBullets isSecondUnlocked={isSecondUnlocked} />

              {/* Phase 3: Main CTA - Shows after 2:35 under ValueBullets */}
              <div className="pt-2">
                <Button
                  size="lg" 
                  className="w-full h-auto py-4 md:py-6 text-sm sm:text-base md:text-lg lg:text-xl font-extrabold shadow-lg hover:shadow-xl transition-all hover:scale-105 tracking-wide uppercase bg-cta hover:bg-cta/90 text-cta-foreground flex flex-col gap-1"
                  onClick={() => {
                    // Get stored UTMs and append to navigation URL
                    const storedUtms = localStorage.getItem('brrrr_utm_params');
                    let url = '/call';
                    if (storedUtms) {
                      try {
                        const utms = JSON.parse(storedUtms);
                        const queryString = new URLSearchParams(utms).toString();
                        if (queryString) {
                          url = `/call?${queryString}`;
                        }
                      } catch (error) {
                        console.error('Error parsing UTMs:', error);
                      }
                    }
                    navigate(url);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <span>I'M READY TO TAKE ACTION</span>
                  <span className="text-xs md:text-sm font-semibold normal-case opacity-90">
                    Click Here to Apply To Work With Us Now
                  </span>
                </Button>
              </div>

              {/* Phase 2: Social Proof Bar - Hidden until second countdown */}
              {isSecondUnlocked && <SocialProofBar />}

              {/* Phase 2: Mini Testimonials - Hidden until second countdown */}
              {isSecondUnlocked && <TestimonialMini />}
            </>
          )}

        </div>
      </div>
      
      {/* Phase 4: Minimal Footer */}
      <FooterMinimal />
    </div>
  );
};

export default VSL;
$fb_53_tsx$,
  $fb_53_default_props${"headline":"Close Your First (or Next) Cash-Flowing Rental in the Next 90 Days … And Pull Your Capital Back Out to Do It Again","subheadline":"Discover The Exact System 500+ Investors Used To Build Cash-Flowing Portfolios","cta_label":"`; } } catch (error) } navigate(url); window.scrollTo( ); }} > I'M READY TO TAKE ACTION Click Here to Apply To Work With Us Now","bullets":[],"image_url":""}$fb_53_default_props$::jsonb,
  $fb_53_layout_signature$centered-stack$fb_53_layout_signature$,
  $fb_53_source_type$extracted$fb_53_source_type$,
  $fb_53_source_reference${"file_path":"vsl-call-booking/brrr-guys-vsl.md","heading":"","page_name":"BRR Guys - VSL Page","company":"The BRR Guys"}$fb_53_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_54_slug$webinar-freedom-builders-confirmation-casestudyvideos$fb_54_slug$,
  $fb_54_name$CaseStudyVideos$fb_54_name$,
  $fb_54_description$Freedom Builders CaseStudyVideos extracted from webinar/freedom-builders-confirmation.md$fb_54_description$,
  $fb_54_category$social-proof$fb_54_category$,
  ARRAY[$fb_54_page_types_0$webinar-confirmation$fb_54_page_types_0$, $fb_54_page_types_1$thank-you$fb_54_page_types_1$, $fb_54_page_types_2$webinar$fb_54_page_types_2$]::text[],
  ARRAY[$fb_54_funnel_types_0$webinar$fb_54_funnel_types_0$]::text[],
  $fb_54_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_54_slot_schema$::jsonb,
  ARRAY[$fb_54_theme_tokens_0$colors$fb_54_theme_tokens_0$, $fb_54_theme_tokens_1$font_heading$fb_54_theme_tokens_1$, $fb_54_theme_tokens_2$font_body$fb_54_theme_tokens_2$]::text[],
  $fb_54_asset_slots${}$fb_54_asset_slots$::jsonb,
  $fb_54_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

// File: CaseStudyVideos.tsx
import { useState, useRef, useEffect } from "react";
import { Play, X } from "lucide-react";










interface CaseStudy {
  thumb: string | null;
  name: string;
  tagline: string;
  result: string;
  videoUrl: string;
  copy: string;
}

const caseStudies = [
  {
    thumb: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
    name: "Paul Chek",
    tagline: "Holistic Health Expert",
    result: "$500,000+ Generated Organically",
    videoUrl: "/placeholder-video.mp4",
    copy: "World-renowned holistic health expert with 40+ years of experience. Came to us to bring his Spirit Gym methods online. We built the full brand, platform, and launch strategy.\n\nGenerated over $500,000 organically after launching. Called it \"the site of my dreams\" and \"more beautiful than I imagined possible.\" Said we were \"unbeatable — a team that actually does what they say, exceptionally well.\"",
  },
  {
    thumb: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
    name: "Jason Pickard",
    tagline: "Former Wall Street Trader",
    result: "$100K+ in First 30 Days",
    videoUrl: "/placeholder-video.mp4",
    copy: "Former Wall Street trader with zero brand or online presence. Came to us with just a powerful personal transformation. We built his brand, offer, and launch strategy from the ground up.\n\nGenerated $100K+ in the first 30 days of launch. Hit 4X ROI in under a year — now runs evergreen, profit-producing product.",
  },
  {
    thumb: null,
    name: "Christian Van Camp",
    tagline: "Retreat Leader & Health Coach",
    result: "Clarity & Structure to Launch",
    videoUrl: "/placeholder-video.mp4",
    copy: "Retreat leader and health coach with a brick-and-mortar practice who struggled to pull his online offer together. He was trying to do the branding and outline on his own but didn't know where to start.\n\nPartnering with Freedom Builderz gave him the clarity and structure he needed — we made the process simple and delivered exactly what to do at every step.",
  },
  {
    thumb: null,
    name: "Mary Buckingham",
    tagline: "Energy Worker",
    result: "Lifelong Business Partner",
    videoUrl: "/placeholder-video.mp4",
    copy: "Energy worker with a studio in California who didn't know how to translate her in-person practice into an online income stream. She came to Freedom Builderz looking for a trusted partner who valued relationship as much as results.\n\nMary shared, \"Mike has turned into a lifelong friend and business guide. His work ethic is incredible and anything that you need, he is there for you.\"",
  },
  {
    thumb: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
    name: "Sarah Rosser",
    tagline: "Midwife",
    result: "Six Figures in 6 Weeks",
    videoUrl: "/placeholder-video.mp4",
    copy: "Midwife with a powerful vision, but no tech, system, or marketing plan. Partnered with Freedom Builderz to bring her course to life.\n\nLaunched and profited over six figures organically in just 6 weeks. Focused on her mission while we handled everything behind the scenes.",
  },
  {
    thumb: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
    name: "Hamilton Souther",
    tagline: "Healer & Certification Creator",
    result: "$200K+ Generated Organically",
    videoUrl: "/placeholder-video.mp4",
    copy: "Globally respected healer with a mission but no digital infrastructure for this offer. Turned to Freedom Builderz to bring his certification program online.\n\nWe handled branding, copy, design, course creation, automation, and launch execution. Launch doubled expectations — generating over $200K organically.",
  },
  {
    thumb: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
    name: "Meagan \"Mimi\" Lindquist",
    tagline: "Wellness Coach",
    result: "On Track to Six Figures",
    videoUrl: "/placeholder-video.mp4",
    copy: "Wellness coach who tried to launch her course solo but ran into burnout and roadblocks with tech and strategy. Turned to Freedom Builderz to fully relaunch Clear and Free.\n\nWe handled branding, design, backend systems, and launch execution. Her course is now well on its way toward a six-figure milestone.",
  },
  {
    thumb: null,
    name: "Stacie Rae",
    tagline: "Medical Tattoo Artist",
    result: "Exceeded $25K Goal on First Launch",
    videoUrl: "/placeholder-video.mp4",
    copy: "Medical tattoo artist with multiple brick-and-mortar studios who wanted to turn her proprietary techniques into an online academy and certification program. Partnered with Freedom Builderz to bring her vision online.\n\nHer first launch surpassed goals of 10 students and $25K in sales — exceeding expectations right out of the gate. Said we \"changed her life\" and gave her the kind of reach and income stream she would have never had before.",
  },
];

interface ModalProps {
  study: typeof caseStudies[number];
  onClose: () => void;
}

const CaseStudyModal = ({ study, onClose }: ModalProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[800px] max-h-[90vh] overflow-y-auto rounded-[20px] z-10"
        style={{ background: "#131415" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient orbs */}
        <img
          src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
          alt=""
          className="absolute -top-[30%] -left-[30%] w-[500px] h-[500px] object-cover opacity-[0.2] pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        <img
          src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
          alt=""
          className="absolute -bottom-[30%] -right-[30%] w-[500px] h-[500px] object-cover opacity-[0.2] pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 md:w-8 md:h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Video */}
        <div className="relative z-10 p-4 pb-0">
          <video
            ref={videoRef}
            className="w-full rounded-xl"
            controls
            playsInline
            preload="auto"
          >
            <source src={study.videoUrl} type="video/mp4" />
          </video>
        </div>

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8">
          <h3 className="font-heading text-2xl md:text-3xl font-black uppercase text-white mb-1">
            {study.name}
          </h3>
          <p className="font-bold text-lg mb-4" style={{ color: "#FF5D2E" }}>
            {study.result}
          </p>
          <div className="text-white/70 text-base leading-relaxed whitespace-pre-line">
            {study.copy}
          </div>
        </div>
      </div>
    </div>
  );
};

const CaseStudyVideos = () => {
  const [activeStudy, setActiveStudy] = useState<typeof caseStudies[number] | null>(null);
  const [showMore, setShowMore] = useState(false);

  const withThumb = caseStudies.filter((s) => s.thumb !== null);
  const initialCards = withThumb.slice(0, 4);
  const remainingCards = [...withThumb.slice(4), ...caseStudies.filter((s) => s.thumb === null)];

  const renderCard = (study: CaseStudy) => (
    <div
      key={study.name}
      onClick={() => setActiveStudy(study)}
      className="cursor-pointer rounded-[20px] overflow-hidden group hover:-translate-y-1 hover:brightness-110 transition-all duration-300"
      style={{ background: "#232526", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
    >
      <div className="relative aspect-video overflow-hidden">
        {study.thumb ? (
          <img
            src={study.thumb}
            alt={study.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
            loop
            preload="metadata"
          >
            <source src={study.videoUrl} type="video/mp4" />
          </video>
        )}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-80 group-hover:opacity-100 transition-opacity">
          <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="font-heading text-lg font-bold uppercase text-white mb-1">
          {study.name}
        </h3>
        <p className="text-white/50 text-sm mb-2">{study.tagline}</p>
        <p className="font-bold text-sm" style={{ color: "#FF5D2E" }}>
          {study.result}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <section className="relative py-16 md:py-24 px-4 overflow-hidden bg-background">
        {/* Gradient orbs */}
        <img
          src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
          alt=""
          className="absolute -top-[20%] -right-[15%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        <img
          src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
          alt=""
          className="absolute -bottom-[20%] -left-[15%] w-[700px] h-[700px] object-cover opacity-[0.15] pointer-events-none"
          style={{
            maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
            WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)",
          }}
        />
        <img
          src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none"
        />

        <div className="relative z-10 max-w-5xl mx-auto">
          <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-center text-foreground mb-3">
            🔓 YOUR <span className="text-primary">8 SUCCESS STORIES</span> — UNLOCKED
          </h2>
          <p className="text-muted-foreground text-base md:text-lg text-center max-w-xl mx-auto mb-12">
            Real creators. Real results. Watch how they did it.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {initialCards.map(renderCard)}
          </div>

          {remainingCards.length > 0 && !showMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => setShowMore(true)}
                className="px-8 py-3.5 rounded-xl text-white text-sm font-bold transition-all hover:brightness-125"
                style={{ background: "#232526", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                Show More Success Stories →
              </button>
            </div>
          )}

          {showMore && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {remainingCards.map(renderCard)}
            </div>
          )}
        </div>
      </section>

      {activeStudy && (
        <CaseStudyModal study={activeStudy} onClose={() => setActiveStudy(null)} />
      )}
    </>
  );
};

export default CaseStudyVideos;
$fb_54_tsx$,
  $fb_54_default_props${"headline":"🔓 YOUR 8 SUCCESS STORIES — UNLOCKED","subheadline":"Real creators. Real results. Watch how they did it.","cta_label":"setShowMore(true)} className=\"px-8 py-3.5 rounded-xl text-white text-sm font-bold transition-all hover:brightness-125\" style= } > Show More Success Stories →","bullets":[],"image_url":""}$fb_54_default_props$::jsonb,
  $fb_54_layout_signature$split-2$fb_54_layout_signature$,
  $fb_54_source_type$extracted$fb_54_source_type$,
  $fb_54_source_reference${"file_path":"webinar/freedom-builders-confirmation.md","heading":"CaseStudyVideos.tsx","page_name":"Freedom Builders - Webinar Confirmation","company":"Freedom Builders"}$fb_54_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_55_slug$webinar-freedom-builders-confirmation-confirmationhero$fb_55_slug$,
  $fb_55_name$ConfirmationHero$fb_55_name$,
  $fb_55_description$Freedom Builders ConfirmationHero extracted from webinar/freedom-builders-confirmation.md$fb_55_description$,
  $fb_55_category$hero$fb_55_category$,
  ARRAY[$fb_55_page_types_0$webinar-confirmation$fb_55_page_types_0$, $fb_55_page_types_1$thank-you$fb_55_page_types_1$, $fb_55_page_types_2$webinar$fb_55_page_types_2$]::text[],
  ARRAY[$fb_55_funnel_types_0$webinar$fb_55_funnel_types_0$]::text[],
  $fb_55_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_55_slot_schema$::jsonb,
  ARRAY[$fb_55_theme_tokens_0$colors$fb_55_theme_tokens_0$, $fb_55_theme_tokens_1$font_heading$fb_55_theme_tokens_1$, $fb_55_theme_tokens_2$font_body$fb_55_theme_tokens_2$]::text[],
  $fb_55_asset_slots${}$fb_55_asset_slots$::jsonb,
  $fb_55_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

// File: ConfirmationHero.tsx
import { useRef, useState } from "react";
import { Play } from "lucide-react";





const VIDEO_SRC = "/placeholder-video.mp4";

const calendarButtons = [
  { label: "Apple", href: "#add-to-calendar" },
  { label: "Google", href: "#add-to-calendar" },
  { label: "Outlook", href: "#add-to-calendar" },
  { label: "Outlook.com", href: "#add-to-calendar" },
  { label: "Office 365", href: "#add-to-calendar" },
  { label: "Yahoo", href: "#add-to-calendar" },
];

const ConfirmationHero = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.muted = false;
    video.controls = true;
    video.play();
    setIsPlaying(true);
  };

  return (
    <>
      {/* Sticky header banner */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: "#090909" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-16 py-3 md:py-4 flex items-center justify-between gap-3">
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Freedom Builderz" className="h-6 md:h-8 shrink-0" />
          <p className="text-right text-xs md:text-base text-white font-bold leading-tight">
            Registration Confirmed — See You on Feb 17th
          </p>
        </div>
      </div>

      {/* Hero section */}
      <section className="relative py-14 md:py-20 px-4 overflow-hidden" style={{ background: "#090909" }}>
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          {/* Date/time reminder */}
          <p className="text-white font-bold text-sm md:text-lg mb-4 md:mb-6">
            📅 Tuesday, February 24th at 2:00 PM EST{" "}
            <span className="text-white/60 font-normal">(11:00 AM PST)</span>
          </p>

          {/* Headline */}
          <h1 className="font-heading text-2xl md:text-5xl font-black uppercase tracking-tight text-white mb-3 md:mb-4">
            HERE'S EVERYTHING YOU NEED{" "}
            <span style={{ color: "#FF5D2E" }}>BEFORE THE TRAINING</span>
          </h1>

          {/* Subhead */}
          <p className="text-white/60 text-sm md:text-lg mb-8 md:mb-10 max-w-xl mx-auto">
            Follow the steps below so you're fully prepared when we go live.
          </p>

          {/* Video */}
          <div
            className="relative w-full max-w-[800px] mx-auto mb-12 rounded-[20px] overflow-hidden group cursor-pointer"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}
            onClick={!isPlaying ? handlePlay : undefined}
          >
            <video
              ref={videoRef}
              className="w-full rounded-[20px]"
              playsInline
              muted
              autoPlay
              loop
              preload="auto"
            >
              <source src={VIDEO_SRC} type="video/mp4" />
            </video>

            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-all duration-300 group-hover:bg-black/40">
                <div className="relative flex items-center justify-center">
                  <span className="absolute w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary/30 animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110">
                    <Play className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Calendar section */}
          <div className="mb-4">
            <h2 className="font-heading text-xl md:text-2xl font-black uppercase tracking-tight text-white mb-2">
              🗓️ ADD THIS TO YOUR CALENDAR
            </h2>
            <p className="text-white/50 text-sm mb-6">
              Click below so you don't forget — set a reminder 10 minutes before.
            </p>

            <div className="flex flex-wrap justify-center gap-2 md:gap-3">
              {calendarButtons.map((btn) => (
                <a
                  key={btn.label}
                  href={btn.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 md:px-5 md:py-3 rounded-xl text-white text-xs md:text-sm font-medium transition-colors hover:brightness-125"
                  style={{ background: "#232526" }}
                >
                  {btn.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ConfirmationHero;
$fb_55_tsx$,
  $fb_55_default_props${"headline":"HERE'S EVERYTHING YOU NEED BEFORE THE TRAINING","subheadline":"Registration Confirmed — See You on Feb 17th","cta_label":"","bullets":[],"image_url":""}$fb_55_default_props$::jsonb,
  $fb_55_layout_signature$centered-stack$fb_55_layout_signature$,
  $fb_55_source_type$extracted$fb_55_source_type$,
  $fb_55_source_reference${"file_path":"webinar/freedom-builders-confirmation.md","heading":"ConfirmationHero.tsx","page_name":"Freedom Builders - Webinar Confirmation","company":"Freedom Builders"}$fb_55_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_56_slug$webinar-freedom-builders-confirmation-meetyourcoach$fb_56_slug$,
  $fb_56_name$MeetYourCoach$fb_56_name$,
  $fb_56_description$Freedom Builders MeetYourCoach extracted from webinar/freedom-builders-confirmation.md$fb_56_description$,
  $fb_56_category$stats$fb_56_category$,
  ARRAY[$fb_56_page_types_0$webinar-confirmation$fb_56_page_types_0$, $fb_56_page_types_1$thank-you$fb_56_page_types_1$, $fb_56_page_types_2$webinar$fb_56_page_types_2$]::text[],
  ARRAY[$fb_56_funnel_types_0$webinar$fb_56_funnel_types_0$]::text[],
  $fb_56_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_56_slot_schema$::jsonb,
  ARRAY[$fb_56_theme_tokens_0$colors$fb_56_theme_tokens_0$, $fb_56_theme_tokens_1$font_heading$fb_56_theme_tokens_1$, $fb_56_theme_tokens_2$font_body$fb_56_theme_tokens_2$]::text[],
  $fb_56_asset_slots${}$fb_56_asset_slots$::jsonb,
  $fb_56_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

// File: MeetYourCoach.tsx
import { useState, useRef, useEffect } from "react";
import { Play, X, Instagram } from "lucide-react";





const STORY_VIDEO = "/placeholder-video.mp4";

const MeetYourCoach = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section
        className="relative py-16 md:py-24 px-4 overflow-hidden"
        style={{ background: "#090909" }}
      >
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -top-[30%] -right-[20%] w-[700px] h-[700px] object-cover opacity-[0.2] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -bottom-[30%] -left-[20%] w-[700px] h-[700px] object-cover opacity-[0.15] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
          {/* Left: Photo + links */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="relative mb-5">
              <div className="absolute inset-0 rounded-[20px] blur-[40px] opacity-20" style={{ background: "#FF5D2E" }} />
              <img
                src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
                alt="Mike Gonzalez"
                className="relative w-full md:w-[280px] rounded-[20px] object-cover max-h-[380px]"
                style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.4)" }}
              />
            </div>

            {/* Links below photo */}
            <div className="flex items-center gap-5">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline transition-colors cursor-pointer bg-transparent border-none text-white"
              >
                <Play className="w-4 h-4" style={{ color: "#FF5D2E" }} fill="#FF5D2E" />
                Watch Mike's Story
              </button>
              <a
                href="https://instagram.com/your-handle/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white hover:underline text-sm font-medium transition-colors"
              >
                <Instagram className="w-4 h-4" style={{ color: "#FF5D2E" }} />
                @mikegbuilds
              </a>
            </div>
          </div>

          {/* Right: Bio + Credentials */}
          <div className="flex-1 max-w-[520px] text-center md:text-left">
            <h2 className="font-heading text-2xl md:text-4xl font-black uppercase tracking-tight text-white mb-5">
              MEET YOUR <span style={{ color: "#FF5D2E" }}>COACH</span>
            </h2>

            <div className="text-white/70 text-base leading-relaxed space-y-3.5 mb-6">
              <p>Mike Gonzalez spent years in the corporate world before walking away to go all-in on coaching. He built a real practice and got real results for real people. But he hit the same wall every great coach hits — his income was chained to his calendar and there were only so many hours in the day.</p>
              <p>So he figured out how to take everything he knew and package it into a digital program that could reach people without him being in the room. It worked. Then other coaches started asking him to do it for them. That's how Freedom Builderz was born.</p>
              <p>Today Mike and his team have built over 150 online programs for creators, coaches, and experts. They don't teach you how to build it — they build it for you. Branding, copy, tech, sales pages, email sequences, everything. Their clients have generated over a million dollars from programs that never would have existed without this team.</p>
            </div>

            <div className="w-16 h-px mb-5" style={{ background: "rgba(255,93,46,0.3)" }} />

            <div className="space-y-0.5">
              <p className="text-white font-bold">Michael Gonzalez</p>
              <p className="text-white/50 text-sm">Founder of Freedom Builderz</p>
              <p className="text-sm font-bold" style={{ color: "#FF5D2E" }}>7-Figure Success Coach</p>
            </div>
          </div>
        </div>
      </section>

      {showModal && <StoryModal onClose={() => setShowModal(false)} />}
    </>
  );
};

const StoryModal = ({ onClose }: { onClose: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    videoRef.current?.play().catch(() => {});
    return () => { document.removeEventListener("keydown", handleEsc); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="relative z-10 w-[95%] md:w-[90%] rounded-[20px] p-5 md:p-8 flex flex-col items-center"
        style={{ maxWidth: 450, background: "#090909" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Orange accent line */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-b-full" style={{ background: "#FF5D2E" }} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:-top-4 md:-right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80 z-20"
          style={{ background: "#232526" }}
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Title */}
        <h3 className="font-heading text-xl font-black uppercase tracking-tight text-white mb-1 mt-2">
          MIKE'S STORY
        </h3>
        <p className="text-white/40 text-sm mb-5">How Freedom Builderz Started</p>

        {/* Video */}
        <video
          ref={videoRef}
          className="w-full rounded-xl"
          controls
          playsInline
          preload="auto"
          style={{ maxHeight: "60vh" }}
        >
          <source src={STORY_VIDEO} type="video/mp4" />
        </video>

        {/* Instagram link */}
        <a
          href="https://instagram.com/your-handle/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-5 text-sm font-medium transition-colors hover:underline"
        >
          <Instagram className="w-4 h-4" style={{ color: "#FF5D2E" }} />
          <span className="text-white">@mikegbuilds</span>
        </a>
      </div>
    </div>
  );
};

export default MeetYourCoach;
$fb_56_tsx$,
  $fb_56_default_props${"headline":"MEET YOUR COACH","subheadline":"Watch Mike's Story @mikegbuilds MEET YOUR COACH Mike Gonzalez spent years in the corporate world before walking away to go all-in on coaching. He built a real practice and got real results for real people. But he hit the same wall every great coach hits — his income was chained to his calendar and there were only so many hours in the day.","cta_label":"setShowModal(true)} className=\"inline-flex items-center gap-2 text-sm font-medium hover:underline transition-colors cursor-pointer bg-transparent border-none text-white\" > Watch Mike's Story","bullets":[],"image_url":""}$fb_56_default_props$::jsonb,
  $fb_56_layout_signature$centered-stack$fb_56_layout_signature$,
  $fb_56_source_type$extracted$fb_56_source_type$,
  $fb_56_source_reference${"file_path":"webinar/freedom-builders-confirmation.md","heading":"MeetYourCoach.tsx","page_name":"Freedom Builders - Webinar Confirmation","company":"Freedom Builders"}$fb_56_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_57_slug$webinar-freedom-builders-confirmation-podcastappearances$fb_57_slug$,
  $fb_57_name$PodcastAppearances$fb_57_name$,
  $fb_57_description$Freedom Builders PodcastAppearances extracted from webinar/freedom-builders-confirmation.md$fb_57_description$,
  $fb_57_category$gallery$fb_57_category$,
  ARRAY[$fb_57_page_types_0$webinar-confirmation$fb_57_page_types_0$, $fb_57_page_types_1$thank-you$fb_57_page_types_1$, $fb_57_page_types_2$webinar$fb_57_page_types_2$]::text[],
  ARRAY[$fb_57_funnel_types_0$webinar$fb_57_funnel_types_0$]::text[],
  $fb_57_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_57_slot_schema$::jsonb,
  ARRAY[$fb_57_theme_tokens_0$colors$fb_57_theme_tokens_0$, $fb_57_theme_tokens_1$font_heading$fb_57_theme_tokens_1$, $fb_57_theme_tokens_2$font_body$fb_57_theme_tokens_2$]::text[],
  $fb_57_asset_slots${}$fb_57_asset_slots$::jsonb,
  $fb_57_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

// File: PodcastAppearances.tsx
import { ExternalLink } from "lucide-react";


const podcasts = [
  {
    name: "Paul Chek's Podcast",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
  {
    name: "Tips to Creating Amazing Content",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
  {
    name: "The Medicin Podcast",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
  {
    name: "The Be Extraordinary Podcast",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
  {
    name: "The Captain's Lifestyle Podcast",
    link: "#video-link",
    thumb: "/placeholder-thumbnail.jpg",
  },
];

const PodcastAppearances = () => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 80%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-10">
          HEAR MORE FROM <span style={{ color: "#FF5D2E" }}>MIKE</span>
        </h2>

        {/* 3 + 2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 mb-4 md:mb-5">
          {podcasts.slice(0, 3).map((pod) => (
            <PodcastCard key={pod.name} podcast={pod} />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 max-w-full sm:max-w-[66%] md:max-w-[440px] mx-auto">
          {podcasts.slice(3).map((pod) => (
            <PodcastCard key={pod.name} podcast={pod} />
          ))}
        </div>
      </div>
    </section>
  );
};

const PodcastCard = ({ podcast }: { podcast: { name: string; link: string; thumb: string } }) => (
  <a
    href={podcast.link}
    target="_blank"
    rel="noopener noreferrer"
    className="group cursor-pointer rounded-[20px] overflow-hidden hover:-translate-y-1 hover:brightness-110 transition-all duration-300"
    style={{ background: "#232526", boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}
  >
    <div className="relative aspect-video overflow-hidden">
      <img
        src={podcast.thumb}
        alt={podcast.name}
        className="w-full h-full object-cover"
      />
    </div>
    <div className="p-4 flex items-center justify-between gap-2">
      <p className="text-white text-sm font-bold leading-tight text-left">
        {podcast.name}
      </p>
      <ExternalLink className="w-4 h-4 text-white/40 shrink-0 group-hover:text-white/70 transition-colors" />
    </div>
  </a>
);

export default PodcastAppearances;
$fb_57_tsx$,
  $fb_57_default_props${"headline":"HEAR MORE FROM MIKE","subheadline":"))} ); }; const PodcastCard = ( : }) => (","cta_label":"","bullets":[],"image_url":""}$fb_57_default_props$::jsonb,
  $fb_57_layout_signature$grid-3$fb_57_layout_signature$,
  $fb_57_source_type$extracted$fb_57_source_type$,
  $fb_57_source_reference${"file_path":"webinar/freedom-builders-confirmation.md","heading":"PodcastAppearances.tsx","page_name":"Freedom Builders - Webinar Confirmation","company":"Freedom Builders"}$fb_57_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_58_slug$webinar-freedom-builders-confirmation-preparationsteps$fb_58_slug$,
  $fb_58_name$PreparationSteps$fb_58_name$,
  $fb_58_description$Freedom Builders PreparationSteps extracted from webinar/freedom-builders-confirmation.md$fb_58_description$,
  $fb_58_category$team$fb_58_category$,
  ARRAY[$fb_58_page_types_0$webinar-confirmation$fb_58_page_types_0$, $fb_58_page_types_1$thank-you$fb_58_page_types_1$, $fb_58_page_types_2$webinar$fb_58_page_types_2$]::text[],
  ARRAY[$fb_58_funnel_types_0$webinar$fb_58_funnel_types_0$]::text[],
  $fb_58_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_58_slot_schema$::jsonb,
  ARRAY[$fb_58_theme_tokens_0$colors$fb_58_theme_tokens_0$, $fb_58_theme_tokens_1$font_heading$fb_58_theme_tokens_1$, $fb_58_theme_tokens_2$font_body$fb_58_theme_tokens_2$]::text[],
  $fb_58_asset_slots${}$fb_58_asset_slots$::jsonb,
  $fb_58_tsx$// __FB_SHIM_START__
const __fbButton = (p) => React.createElement('button', { ...p, className: ['fb-shadcn-btn', p?.className].filter(Boolean).join(' ') }, p?.children);
const __fbDiv = (tag) => (p) => React.createElement(tag, p, p?.children);
const Button = __fbButton;
const Card = __fbDiv('div');
const CardHeader = __fbDiv('div');
const CardTitle = __fbDiv('div');
const CardContent = __fbDiv('div');
const CardFooter = __fbDiv('div');
const CardDescription = __fbDiv('div');
const Badge = (p) => React.createElement('span', { ...p, className: ['fb-shadcn-badge', p?.className].filter(Boolean).join(' ') }, p?.children);
const Input = (p) => React.createElement('input', p);
const Label = (p) => React.createElement('label', p, p?.children);
const Textarea = (p) => React.createElement('textarea', p);
const Separator = (p) => React.createElement('hr', p);
const Progress = (p) => React.createElement('div', { ...p, className: ['fb-shadcn-progress', p?.className].filter(Boolean).join(' ') }, React.createElement('div', { style: { width: ((p?.value ?? 0) + '%'), height: '100%', background: 'currentColor' } }));
const Switch = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Checkbox = (p) => React.createElement('input', { ...p, type: 'checkbox' });
const Avatar = __fbDiv('div');
const AvatarImage = (p) => React.createElement('img', p);
const AvatarFallback = __fbDiv('span');
const Accordion = __fbDiv('div');
const AccordionItem = __fbDiv('div');
const AccordionTrigger = (p) => React.createElement('button', p, p?.children);
const AccordionContent = __fbDiv('div');
const RadioGroup = (p) => React.createElement('div', { ...p, role: 'radiogroup' }, p?.children);
const RadioGroupItem = (p) => React.createElement('input', { ...p, type: 'radio' });
const Select = __fbDiv('div');
const SelectTrigger = (p) => React.createElement('button', p, p?.children);
const SelectValue = __fbDiv('span');
const SelectContent = __fbDiv('div');
const SelectItem = __fbDiv('div');
const Tabs = __fbDiv('div');
const TabsList = __fbDiv('div');
const TabsTrigger = (p) => React.createElement('button', p, p?.children);
const TabsContent = __fbDiv('div');
const Dialog = __fbDiv('div');
const DialogTrigger = (p) => React.createElement('button', p, p?.children);
const DialogContent = __fbDiv('div');
const DialogHeader = __fbDiv('div');
const DialogTitle = __fbDiv('div');
const DialogDescription = __fbDiv('div');
const Sheet = __fbDiv('div');
const SheetTrigger = (p) => React.createElement('button', p, p?.children);
const SheetContent = __fbDiv('div');
const Popover = __fbDiv('div');
const PopoverTrigger = (p) => React.createElement('button', p, p?.children);
const PopoverContent = __fbDiv('div');
const Tooltip = __fbDiv('div');
const TooltipTrigger = (p) => React.createElement('span', p, p?.children);
const TooltipContent = __fbDiv('div');
const TooltipProvider = (p) => p?.children ?? null;
const ScrollArea = __fbDiv('div');
const useNavigate = () => () => {};
const Link = (p) => React.createElement('a', { ...p, href: p?.to ?? p?.href }, p?.children);
const NavLink = Link;
const useLocation = () => ({ pathname: '/' });
const useParams = () => ({});
const useSearchParams = () => [new URLSearchParams(), () => {}];
const useCountdown = () => ({ days: 0, hours: 0, minutes: 0, seconds: 0 });
const useToast = () => ({ toast: () => {} });
const useCart = () => ({ addItem: () => {}, removeItem: () => {}, items: [] });
const cn = (...args) => args.filter(Boolean).flat(Infinity).filter((v) => typeof v === 'string').join(' ');
const confetti = () => {};
const __FB_PLACEHOLDER_IMG = 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset';
// __FB_SHIM_END__

// File: PreparationSteps.tsx





const steps = [
  {
    num: "01",
    title: "ACCEPT THE CALENDAR INVITE",
    desc: "Set a reminder 10 minutes before. Find a quiet setting to make the most of your time.",
    bg: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
  },
  {
    num: "02",
    title: "SAVE YOUR EMAIL",
    desc: "Your email contains the Zoom link. Keep it saved so you can access the training.",
    bg: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
  },
  {
    num: "03",
    title: "PREPARE YOUR QUESTIONS",
    desc: "This training could change everything. Come ready with questions for Mike and the team.",
    bg: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
  },
];

const PreparationSteps = () => {
  return (
    <section
      className="relative py-16 md:py-20 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      {/* Purple gradient orb top-left */}
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -top-[30%] -left-[20%] w-[600px] h-[600px] object-cover opacity-[0.25] pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      {/* Orange gradient orb bottom-right */}
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -bottom-[30%] -right-[20%] w-[600px] h-[600px] object-cover opacity-[0.2] pointer-events-none mix-blend-soft-light blur-[40px]"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 65%)",
        }}
      />
      {/* Pattern overlay */}
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute top-0 left-0 w-full h-[30%] object-cover opacity-[0.07] pointer-events-none"
        style={{
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        <h2
          className="font-heading text-xl md:text-4xl font-black uppercase tracking-tight text-center mb-8 md:mb-10 text-white"
        >
          BEFORE THE TRAINING, DO THIS:
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div
              key={step.title}
              className="relative overflow-hidden rounded-[16px] md:rounded-[20px] min-h-[220px] md:min-h-[280px] flex flex-col justify-end"
            >
              <img
                src={step.bg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20" />

              <div className="relative z-10 p-7 flex flex-col h-full">
                <span className="font-heading text-5xl font-black text-white/80 mb-4">
                  {step.num}
                </span>
                <h3 className="font-heading text-white font-bold text-lg uppercase tracking-wide mb-2">
                  {step.title}
                </h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PreparationSteps;
$fb_58_tsx$,
  $fb_58_default_props${"headline":"BEFORE THE TRAINING, DO THIS:","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_58_default_props$::jsonb,
  $fb_58_layout_signature$grid-3$fb_58_layout_signature$,
  $fb_58_source_type$extracted$fb_58_source_type$,
  $fb_58_source_reference${"file_path":"webinar/freedom-builders-confirmation.md","heading":"PreparationSteps.tsx","page_name":"Freedom Builders - Webinar Confirmation","company":"Freedom Builders"}$fb_58_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
