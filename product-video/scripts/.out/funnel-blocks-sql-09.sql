INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_51_slug$vsl-call-booking-brrr-guys-application-book$fb_51_slug$,
  $fb_51_name$Book$fb_51_name$,
  $fb_51_description$The BRR Guys Book extracted from vsl-call-booking/brrr-guys-application.md$fb_51_description$,
  $fb_51_category$footer$fb_51_category$,
  ARRAY[$fb_51_page_types_0$application$fb_51_page_types_0$, $fb_51_page_types_1$vsl-call-booking$fb_51_page_types_1$, $fb_51_page_types_2$call-booking$fb_51_page_types_2$]::text[],
  ARRAY[$fb_51_funnel_types_0$vsl-call-booking$fb_51_funnel_types_0$]::text[],
  $fb_51_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_51_slot_schema$::jsonb,
  ARRAY[$fb_51_theme_tokens_0$colors$fb_51_theme_tokens_0$, $fb_51_theme_tokens_1$font_heading$fb_51_theme_tokens_1$, $fb_51_theme_tokens_2$font_body$fb_51_theme_tokens_2$]::text[],
  $fb_51_asset_slots${}$fb_51_asset_slots$::jsonb,
  $fb_51_tsx$// __FB_SHIM_START__
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

// File: Book.tsx
import { useState, useEffect, useRef } from "react";







import { toast } from "sonner";







interface FormData {
  workSituation: string;
  experience: string;
  financial: string;
  familiarity: string;
  obstacle: string;
  goal: string;
  action: string;
  why: string;
}

const Book = () => {
  const { utmQueryString } = useUtmParams();
  console.log('📄 Book.tsx - UTM Query String:', utmQueryString);
  console.log('📄 Book.tsx - localStorage:', localStorage.getItem('brrrr_utm_params'));
  const sessionId = usePageTracking(); // Track page view and get unified session ID
  const [step, setStep] = useState(1);
  const totalSteps = 9;
  const isAdvancing = useRef(false);
  const hasTrackedStart = useRef(false);
  const [formData, setFormData] = useState<FormData>({
    workSituation: "",
    experience: "",
    financial: "",
    familiarity: "",
    obstacle: "",
    goal: "",
    action: "",
    why: "",
  });

  const trackedSteps = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Track application started on first render
    if (!hasTrackedStart.current) {
      trackApplicationEvent(0, { event: 'application_started' });
      hasTrackedStart.current = true;
    }

    // Load the calendar embed script
    const script = document.createElement('script');
    script.src = 'https://your-form-provider.com/embed.js';
    script.type = 'text/javascript';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Track when user views each question step
  useEffect(() => {
    if (!trackedSteps.current.has(step)) {
      trackedSteps.current.add(step);
      trackApplicationEvent(step, { event: `question_${step}_view` });
    }
  }, [step]);


  // Save partial progress to database
  const savePartialProgress = async (field: keyof FormData, value: string) => {
    if (!sessionId) return;
    
    // Map form field to database column
    const fieldMapping: Record<keyof FormData, string> = {
      workSituation: 'work_situation',
      experience: 'experience',
      financial: 'financial',
      familiarity: 'familiarity',
      obstacle: 'obstacle',
      goal: 'goal',
      action: 'action',
      why: 'why',
    };
    
    const dbField = fieldMapping[field];
    if (!dbField) return;
    
    // Get UTM params for initial save
    const storedUtms = localStorage.getItem('brrrr_utm_params');
    let utmData: Record<string, string> = {};
    if (storedUtms) {
      try {
        utmData = JSON.parse(storedUtms);
      } catch (e) {
        console.error('Error parsing stored UTMs:', e);
      }
    }
    
    // Get preserved lead info
    const preservedLeadInfo = {
      first_name: localStorage.getItem('brrrr_first_name') || null,
      last_name: localStorage.getItem('brrrr_last_name') || null,
      email: localStorage.getItem('brrrr_email') || null,
      phone: localStorage.getItem('brrrr_phone') || null,
    };
    
    try {
      const { error } = await supabase.from('questionnaire_responses').upsert({
        session_id: sessionId,
        [dbField]: value,
        // Include UTM params and lead info on every update
        ...(preservedLeadInfo.first_name && { first_name: preservedLeadInfo.first_name }),
        ...(preservedLeadInfo.last_name && { last_name: preservedLeadInfo.last_name }),
        ...(preservedLeadInfo.email && { email: preservedLeadInfo.email }),
        ...(preservedLeadInfo.phone && { phone: preservedLeadInfo.phone }),
        utm_source: utmData.utm_source || null,
        utm_medium: utmData.utm_medium || null,
        utm_campaign: utmData.utm_campaign || null,
        utm_content: utmData.utm_content || null,
        utm_term: utmData.utm_term || null,
        referrer: document.referrer || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'session_id' });
      
      if (error) {
        console.error('Error saving partial progress:', error);
      } else {
        console.log(`📝 Saved partial progress: ${field} = ${value}`);
      }
    } catch (err) {
      console.error('Error saving partial progress:', err);
    }
  };

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Track step completion
    trackApplicationEvent(step, { field, value });
    
    // Save partial progress to database immediately
    savePartialProgress(field, value);
    
    // Auto-advance to next step after selection for radio options (except textarea)
    // Use ref to prevent multiple advances if user clicks quickly or events fire twice
    if (field !== 'why' && step < totalSteps && !isAdvancing.current) {
      isAdvancing.current = true;
      setTimeout(() => {
        setStep((prev) => prev + 1);
        isAdvancing.current = false;
      }, 400);
    }
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.workSituation) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 2:
        if (!formData.experience) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 3:
        if (!formData.financial) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 4:
        if (!formData.familiarity) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 5:
        if (!formData.obstacle) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 6:
        if (!formData.goal) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 7:
        if (!formData.action) {
          toast.error("Please select an option");
          return false;
        }
        return true;
      case 8:
        if (!formData.why || formData.why.trim().length < 10) {
          toast.error("Please provide a detailed answer (at least 10 characters)");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    
    // Save form data to localStorage and database at step 8
    if (step === 8) {
      const formNotes = `Work Situation: ${formData.workSituation}\n\nReal Estate Experience: ${formData.experience}\n\nFinancial Readiness: ${formData.financial}\n\nBRRRR Familiarity: ${formData.familiarity}\n\nBiggest Obstacle: ${formData.obstacle}\n\nPrimary Goal: ${formData.goal}\n\nTimeline: ${formData.action}\n\nWhy Real Estate Matters:\n${formData.why}`;
      
      localStorage.setItem('brrrr_form_responses', formNotes);
      localStorage.setItem('brrrr_form_data', JSON.stringify(formData));
      console.log('📋 Form data saved to localStorage');

      // Save to database with session_id
      if (sessionId) {
        console.log('💾 Saving questionnaire to database with session_id:', sessionId);
        console.log('📊 Form data to save:', formData);
        
        // Get UTM params from localStorage
        const storedUtms = localStorage.getItem('brrrr_utm_params');
        let utmData: Record<string, string> = {};
        if (storedUtms) {
          try {
            utmData = JSON.parse(storedUtms);
            console.log('📊 UTM data to save:', utmData);
          } catch (e) {
            console.error('❌ Error parsing stored UTMs:', e);
          }
        }

        // Get preserved lead info from localStorage (captured from /info page redirect)
        const preservedLeadInfo = {
          first_name: localStorage.getItem('brrrr_first_name') || null,
          last_name: localStorage.getItem('brrrr_last_name') || null,
          email: localStorage.getItem('brrrr_email') || null,
          phone: localStorage.getItem('brrrr_phone') || null,
        };
        console.log('📊 Preserved lead info:', preservedLeadInfo);
        
        try {
          const { error } = await supabase.from('questionnaire_responses').upsert({
            session_id: sessionId,
            // Survey responses
            work_situation: formData.workSituation,
            experience: formData.experience,
            financial: formData.financial,
            familiarity: formData.familiarity,
            obstacle: formData.obstacle,
            goal: formData.goal,
            action: formData.action,
            why: formData.why,
            // Preserve lead contact info (don't overwrite with null if already exists)
            ...(preservedLeadInfo.first_name && { first_name: preservedLeadInfo.first_name }),
            ...(preservedLeadInfo.last_name && { last_name: preservedLeadInfo.last_name }),
            ...(preservedLeadInfo.email && { email: preservedLeadInfo.email }),
            ...(preservedLeadInfo.phone && { phone: preservedLeadInfo.phone }),
            // UTM params
            utm_source: utmData.utm_source || null,
            utm_medium: utmData.utm_medium || null,
            utm_campaign: utmData.utm_campaign || null,
            utm_content: utmData.utm_content || null,
            utm_term: utmData.utm_term || null,
            referrer: document.referrer || null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'session_id'
          });

          if (error) {
            console.error('❌ Database error:', error);
            console.error('❌ Error details:', JSON.stringify(error, null, 2));
            toast.error(`Failed to save: ${error.message}`);
            return; // Don't advance to next step if save fails
          } else {
            console.log('✅ Questionnaire saved successfully');
            // Track survey completed (even if they don't book a call, we have their data)
            trackApplicationEvent(8, { event: 'survey_completed' });
            trackApplicationEvent(8, { event: 'application_completed' });
          }
        } catch (err) {
          console.error('❌ Unexpected error:', err);
          toast.error('An unexpected error occurred');
          return;
        }
      } else {
        console.error('❌ No session ID found!');
        toast.error('Session error - please refresh the page');
        return;
      }
    }
    
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const getStepTitle = () => {
    if (step === totalSteps) return "Schedule Your Call";
    return `Question ${step} of ${totalSteps - 1}`;
  };

  const getProgressPercentage = () => {
    return ((step - 1) / (totalSteps - 1)) * 100;
  };

  return (
    <div className="min-h-screen bg-background">
      <ExitIntentPopupApp />
      <div className="bg-background py-4">
        <div className="container mx-auto px-4 flex justify-center">
          <div className="bg-background rounded-lg px-6 py-2">
            <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="BRRRR in 90" className="h-12 md:h-14" />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        {/* Headline */}
        <div className="text-center mb-8 md:mb-12 space-y-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight">
            Ready To Close Your First (Or Next) BRRRR Deal In{" "}
            <span className="text-primary">The Next 90 Days?</span>
          </h1>
          <p className="text-xl md:text-2xl font-bold text-foreground">
            Complete This Quick Assessment To See If You Qualify For A Strategy Call
          </p>
        </div>

        <div className="mb-6 md:mb-8">
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        <Card className="p-6 md:p-8 animate-fade-in">
          {step === 1 && (
            <div className="space-y-4 md:space-y-6">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-foreground mb-2">What best describes your current work situation?</h2>
                <p className="text-xs md:text-sm text-muted-foreground">This helps us understand your availability and resources</p>
              </div>

              <RadioGroup value={formData.workSituation}>
                {["Full-time employee", "Self-employed / business owner", "Real estate agent", "Part-time / side-hustle income", "Not currently working"].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-3 md:p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("workSituation", option)}
                  >
                    <RadioGroupItem value={option} id={`work-${option}`} />
                    <Label htmlFor={`work-${option}`} className="font-normal cursor-pointer flex-1 text-sm md:text-base">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">How much real estate investing experience do you have?</h2>
                <p className="text-sm text-muted-foreground">Be honest - we work with investors at all levels</p>
              </div>

              <RadioGroup value={formData.experience}>
                {["I've never done a deal before", "I've analyzed deals but haven't bought anything yet", "I've bought 1–2 rentals", "I've bought 3–5 rentals", "I own 6+ rental properties"].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("experience", option)}
                  >
                    <RadioGroupItem value={option} id={`exp-${option}`} />
                    <Label htmlFor={`exp-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">What best describes your current financial readiness to invest in a BRRRR deal?</h2>
                <p className="text-sm text-muted-foreground">This helps us tailor our guidance to your situation</p>
              </div>

              <RadioGroup value={formData.financial}>
                {[
                  "I have $50k+ saved and ready to invest",
                  "I have $20k–$50k available",
                  "I have under $20k but I'm working on saving more",
                  "I don't have much saved yet, but I have strong income or credit",
                  "I'm still learning and want to understand funding options"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("financial", option)}
                  >
                    <RadioGroupItem value={option} id={`fin-${option}`} />
                    <Label htmlFor={`fin-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">How familiar are you with the BRRRR strategy?</h2>
                <p className="text-sm text-muted-foreground">Be honest - we'll meet you where you are</p>
              </div>

              <RadioGroup value={formData.familiarity}>
                {[
                  "I understand it well and I'm ready to start doing deals",
                  "I know the basics but need help with the execution",
                  "I've heard of it but don't fully understand how it works",
                  "This is brand new to me"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("familiarity", option)}
                  >
                    <RadioGroupItem value={option} id={`fam-${option}`} />
                    <Label htmlFor={`fam-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">What's the biggest obstacle keeping you from closing your next (or first) BRRRR deal?</h2>
                <p className="text-sm text-muted-foreground">Understanding your challenge helps us help you</p>
              </div>

              <RadioGroup value={formData.obstacle}>
                {[
                  "Finding the right property / deal analysis",
                  "Securing financing / funding the deal",
                  "Managing the rehab / finding contractors",
                  "Understanding the refinance process",
                  "Not sure where to start / need a clear roadmap"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("obstacle", option)}
                  >
                    <RadioGroupItem value={option} id={`obs-${option}`} />
                    <Label htmlFor={`obs-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">What's your primary goal with BRRRR investing?</h2>
                <p className="text-sm text-muted-foreground">This helps us understand what success looks like for you</p>
              </div>

              <RadioGroup value={formData.goal}>
                {[
                  "Build long-term passive income / cash flow",
                  "Grow a rental portfolio quickly",
                  "Build wealth / equity to retire early",
                  "Replace my W-2 income with real estate",
                  "Learn a strategy I can repeat over and over"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("goal", option)}
                  >
                    <RadioGroupItem value={option} id={`goal-${option}`} />
                    <Label htmlFor={`goal-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">If we could help you close a BRRRR deal in the next 90 days, how quickly would you take action?</h2>
                <p className="text-sm text-muted-foreground">Understanding your timeline helps us prioritize your success</p>
              </div>

              <RadioGroup value={formData.action}>
                {[
                  "I'd start immediately—I'm all in",
                  "I'd start within a few weeks once I line everything up",
                  "I'd need a month or two to prepare",
                  "I'm still exploring, but I want to learn more"
                ].map((option) => (
                  <div 
                    key={option} 
                    className="flex items-center space-x-3 p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-muted/50 transition-all cursor-pointer"
                    onClick={() => updateFormData("action", option)}
                  >
                    <RadioGroupItem value={option} id={`action-${option}`} />
                    <Label htmlFor={`action-${option}`} className="font-normal cursor-pointer flex-1">{option}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {step === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">Why is building financial freedom through real estate important to you right now?</h2>
                <p className="text-sm text-muted-foreground">Share your story - this helps us understand your motivation</p>
              </div>

              <Textarea
                value={formData.why}
                onChange={(e) => updateFormData("why", e.target.value)}
                placeholder="Tell us about your goals, dreams, and why this matters to you..."
                className="min-h-[150px]"
              />
              <p className="text-xs text-muted-foreground">{formData.why.length} characters</p>
            </div>
          )}

          {step === 9 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Last Step: Schedule a 15-Minute Call to Learn More</h2>
                <p className="text-muted-foreground">Based on your answers, you could be a strong candidate for our program. Let's discuss your goals and how we can help.</p>
              </div>

              {(() => {
                const redirectUrl = `https://brrrrin90.lovable.app/pre-call${utmQueryString ? `?${utmQueryString}` : ''}`;
                const baseUrl = "https://your-booking-provider.com/embed/YOUR_CALENDAR_ID";
                const params = new URLSearchParams();
                
                // Add redirect URL
                params.append('redirect', redirectUrl);
                
                // Add form data as custom parameters
                if (formData.workSituation) params.append('q1_work_situation', formData.workSituation);
                if (formData.experience) params.append('q2_experience', formData.experience);
                if (formData.financial) params.append('q3_financial', formData.financial);
                if (formData.familiarity) params.append('q4_familiarity', formData.familiarity);
                if (formData.obstacle) params.append('q5_obstacle', formData.obstacle);
                if (formData.goal) params.append('q6_goal', formData.goal);
                if (formData.action) params.append('q7_action', formData.action);
                if (formData.why) params.append('q8_why', formData.why);
                
                // Add UTM parameters
                if (utmQueryString) {
                  const utmParams = new URLSearchParams(utmQueryString);
                  utmParams.forEach((value, key) => {
                    params.append(key, value);
                  });
                }
                
                const iframeUrl = `${baseUrl}?${params.toString()}`;
                
                console.log('📅 GHL Calendar iframe URL being generated');
                console.log('🧪 Questionnaire parameters being passed:', {
                  q1_work_situation: formData.workSituation,
                  q2_experience: formData.experience,
                  q3_financial: formData.financial,
                  q4_familiarity: formData.familiarity,
                  q5_obstacle: formData.obstacle,
                  q6_goal: formData.goal,
                  q7_action: formData.action,
                  q8_why: formData.why?.substring(0, 50) + '...'
                });
                console.log('📅 Redirect URL:', redirectUrl);
                console.log('📅 UTM params from hook:', utmQueryString || 'none');
                console.log('📅 All iframe params:', params.toString());
                console.log('📅 Full iframe URL:', iframeUrl);
                
                return (
                  <div className="w-full overflow-auto -mx-2 px-2" style={{ maxHeight: '80vh' }}>
                    <iframe
                      src={iframeUrl}
                      style={{ width: '100%', border: 'none', overflow: 'auto', minHeight: '1100px' }}
                      scrolling="yes"
                      id="gzO6aWgjPxb6225lKIUj_1763487062586"
                      title="Schedule Your Call"
                      onLoad={() => console.log('📅 GHL Calendar iframe loaded successfully')}
                      onError={() => console.error('❌ GHL Calendar iframe failed to load')}
                    />
                  </div>
                );
              })()}
            </div>
          )}

          {step < 9 && (
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          )}
        </Card>

        <div className="text-center mt-8">
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            We only work with serious, action-oriented investors. Answer 8 quick questions so we can customize your roadmap to success.
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Book;
$fb_51_tsx$,
  $fb_51_default_props${"headline":"Ready To Close Your First (Or Next) BRRRR Deal In The Next 90 Days?","subheadline":"Complete This Quick Assessment To See If You Qualify For A Strategy Call","cta_label":"Back","bullets":[],"image_url":""}$fb_51_default_props$::jsonb,
  $fb_51_layout_signature$centered-stack$fb_51_layout_signature$,
  $fb_51_source_type$extracted$fb_51_source_type$,
  $fb_51_source_reference${"file_path":"vsl-call-booking/brrr-guys-application.md","heading":"","page_name":"BRR Guys - Application Page","company":"The BRR Guys"}$fb_51_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_52_slug$vsl-call-booking-brrr-guys-pre-call-confirmed$fb_52_slug$,
  $fb_52_name$Confirmed$fb_52_name$,
  $fb_52_description$The BRR Guys Confirmed extracted from vsl-call-booking/brrr-guys-pre-call.md$fb_52_description$,
  $fb_52_category$hero$fb_52_category$,
  ARRAY[$fb_52_page_types_0$pre-call$fb_52_page_types_0$, $fb_52_page_types_1$vsl-call-booking$fb_52_page_types_1$, $fb_52_page_types_2$call-booking$fb_52_page_types_2$]::text[],
  ARRAY[$fb_52_funnel_types_0$vsl-call-booking$fb_52_funnel_types_0$]::text[],
  $fb_52_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_52_slot_schema$::jsonb,
  ARRAY[$fb_52_theme_tokens_0$colors$fb_52_theme_tokens_0$, $fb_52_theme_tokens_1$font_heading$fb_52_theme_tokens_1$, $fb_52_theme_tokens_2$font_body$fb_52_theme_tokens_2$]::text[],
  $fb_52_asset_slots${}$fb_52_asset_slots$::jsonb,
  $fb_52_tsx$// __FB_SHIM_START__
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

// File: Confirmed.tsx




import { CheckCircle2, UserCheck, Brain, HelpCircle, Star, Users, BookOpen, Video as VideoIcon, Award, Gift, ChevronLeft, ChevronRight } from "lucide-react";

import { useEffect, useRef } from "react";









const testimonialVideos = [
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4",
  "https://example.com/placeholder-video.mp4"
];

const Confirmed = () => {
  usePageTracking(); // Track page view
  const topRowRef = useRef<HTMLDivElement>(null);
  const bottomRowRef = useRef<HTMLDivElement>(null);

  const scrollRow = (ref: React.RefObject<HTMLDivElement>, direction: 'left' | 'right') => {
    if (!ref.current) return;
    
    const scrollAmount = 300;
    const container = ref.current;
    const itemWidth = 272; // 256px width + 16px gap
    const halfWidth = (container.scrollWidth / 4); // Since we have 4 copies
    
    if (direction === 'left') {
      const newScroll = container.scrollLeft - scrollAmount;
      
      // If we're at or near the start, jump to the equivalent position in the third set
      if (newScroll <= 0) {
        container.scrollLeft = halfWidth * 2 + scrollAmount;
        setTimeout(() => {
          container.scrollTo({ left: halfWidth * 2, behavior: 'smooth' });
        }, 10);
      } else {
        container.scrollTo({ left: newScroll, behavior: 'smooth' });
      }
    } else {
      const newScroll = container.scrollLeft + scrollAmount;
      
      // If we're at or near the end, jump to the equivalent position in the second set
      if (newScroll >= halfWidth * 3) {
        container.scrollLeft = halfWidth - scrollAmount;
        setTimeout(() => {
          container.scrollTo({ left: halfWidth, behavior: 'smooth' });
        }, 10);
      } else {
        container.scrollTo({ left: newScroll, behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    // Initialize scroll position to middle of carousel for infinite scrolling
    if (topRowRef.current) {
      const halfWidth = topRowRef.current.scrollWidth / 4;
      topRowRef.current.scrollLeft = halfWidth * 2;
    }
    if (bottomRowRef.current) {
      const halfWidth = bottomRowRef.current.scrollWidth / 4;
      bottomRowRef.current.scrollLeft = halfWidth * 2;
    }
  }, []);

  useEffect(() => {
    // Capture email from GHL redirect and link to questionnaire
    const syncEmailToDatabase = async () => {
      const params = new URLSearchParams(window.location.search);
      const email = params.get('email');
      const firstName = params.get('first_name');
      const lastName = params.get('last_name');
      const phone = params.get('phone');
      const sessionId = localStorage.getItem('brrrr_session_id');
      
      console.log('📧 Email from GHL redirect:', email);
      console.log('👤 Name:', firstName, lastName);
      console.log('📞 Phone:', phone);
      console.log('🔑 Session ID from localStorage:', sessionId);
      console.log('🔍 Current URL:', window.location.href);
      console.log('📋 All URL params:', Array.from(params.entries()));
      
      if (email && sessionId) {
        console.log('💾 Attempting UPDATE for session_id:', sessionId, 'with email:', email);
        
        // First check if a record exists with this session_id
        const { data: existingRecords, error: queryError } = await supabase
          .from('questionnaire_responses')
          .select('vibey')
          .eq('session_id', sessionId);
        
        console.log('🔍 Records found with this session_id:', existingRecords);
        
        if (queryError) {
          console.error('❌ Error querying records:', queryError);
        } else if (!existingRecords || existingRecords.length === 0) {
          console.warn('⚠️ NO RECORDS FOUND with session_id:', sessionId);
          console.warn('⚠️ The questionnaire was never submitted, or session_id was cleared');
        } else {
          // Record exists, now update it
          const { data, error } = await supabase
            .from('questionnaire_responses')
            .update({ 
              email: email,
              first_name: firstName || null,
              last_name: lastName || null,
              phone: phone || null
            })
            .eq('session_id', sessionId)
            .select();
          
          if (error) {
            console.error('❌ Error updating email:', error);
          } else if (!data || data.length === 0) {
            console.error('❌ UPDATE succeeded but matched 0 rows!');
          } else {
            console.log('✅ Successfully linked email to questionnaire. Updated rows:', data);
            // Track call booked event
            trackFunnelEvent('call_booked', { email, firstName, lastName, phone });
            
            // Sync lead data to Google Sheets
            let leadData = data[0];
            console.log('📊 Preparing to sync lead to Google Sheets...');
            
            try {
              // Check if AI messages exist, if not generate them first
              if (!leadData.ai_pitch || !leadData.intro_sms) {
                console.log('🤖 AI messages missing, generating now...');
                
                const { data: aiData, error: aiError } = await supabase.functions.invoke('generate-sales-pitch', {
                  body: {
                    email: email,
                    work_situation: leadData.work_situation,
                    experience: leadData.experience,
                    financial: leadData.financial,
                    familiarity: leadData.familiarity,
                    obstacle: leadData.obstacle,
                    goal: leadData.goal,
                    action: leadData.action,
                    why: leadData.why,
                  }
                });
                
                if (aiError) {
                  console.error('❌ Error generating AI messages:', aiError);
                } else if (aiData) {
                  console.log('✅ AI messages generated successfully');
                  // Update leadData with the newly generated AI messages
                  leadData = {
                    ...leadData,
                    ai_pitch: aiData.ai_pitch,
                    intro_sms: aiData.intro_sms
                  };
                }
              }
              
              // Now sync to Google Sheets with AI messages included
              const { error: syncError } = await supabase.functions.invoke('sync-google-sheet', {
                body: {
                  email: email,
                  first_name: firstName || '',
                  last_name: lastName || '',
                  phone: phone || '',
                  work_situation: leadData.work_situation,
                  experience: leadData.experience,
                  financial: leadData.financial,
                  familiarity: leadData.familiarity,
                  obstacle: leadData.obstacle,
                  goal: leadData.goal,
                  action: leadData.action,
                  why: leadData.why,
                  ai_pitch: leadData.ai_pitch,
                  intro_sms: leadData.intro_sms,
                  submitted_at: leadData.created_at,
                  utm_source: leadData.utm_source,
                  utm_medium: leadData.utm_medium,
                  utm_campaign: leadData.utm_campaign,
                  utm_content: leadData.utm_content,
                  utm_term: leadData.utm_term,
                  referrer: leadData.referrer,
                  session_id: sessionId,
                }
              });
              
              if (syncError) {
                console.error('❌ Error syncing to Google Sheets:', syncError);
              } else {
                console.log('✅ Successfully synced lead to Google Sheets with AI messages');
              }
            } catch (syncError) {
              console.error('❌ Failed to sync to Google Sheets:', syncError);
            }
            
            // Clear session_id from localStorage after successful sync
            localStorage.removeItem('brrrr_session_id');
          }
        }
      } else if (!sessionId) {
        console.log('⚠️ No session_id found - user may have skipped questionnaire');
      } else if (!email) {
        console.log('⚠️ No email parameter in URL');
      }
    };
    
    syncEmailToDatabase();

    // Trigger confetti animation on page load
    const triggerConfetti = () => {
      const count = 200;
      const defaults = {
        origin: { y: 1.1 }, // Shoot from bottom
        colors: ['#2f7a4f', '#1c4d6b', '#3d8b5e', '#244d73'], // Brand greens and navies
        spread: 100,
        startVelocity: 45,
      };

      confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.5),
        angle: 60,
        origin: { x: 0, y: 1.1 }
      });
      
      confetti({
        ...defaults,
        particleCount: Math.floor(count * 0.5),
        angle: 120,
        origin: { x: 1, y: 1.1 }
      });
    };
    
    // Trigger confetti after a short delay
    setTimeout(triggerConfetti, 300);

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
      })(window, document, 'Vidalytics', 'vidalytics_embed_xeTPIHChb_HJiC55', 'https://example.com/placeholder-video-embed/');
    `;
    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EFEFEC' }}>
      <div className="sticky top-0 z-50 py-4 border-b border-border px-6 md:px-8" style={{ backgroundColor: '#EFEFEC' }}>
        <div className="container mx-auto px-4 flex justify-center">
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="BRRRR in 90" className="h-16 md:h-20" />
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8 lg:py-12 max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 mb-4 px-2">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
              <span className="italic">You've Made a Great Decision!</span>
            </h1>
          </div>
          <p className="text-lg sm:text-xl md:text-2xl text-foreground font-bold mb-3 md:mb-4 px-2">
            Your Session is <span className="text-primary underline decoration-2 underline-offset-4">Confirmed</span>...
          </p>
          <p className="text-base sm:text-lg md:text-xl text-foreground font-semibold px-4">
            Follow the Below Steps to Confirm Everything Before Your Appointment
          </p>
        </div>

        <div className="space-y-6 md:space-y-8 lg:space-y-12">
          {/* Step 1 - Video */}
          <div className="relative pt-6 md:pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-4 md:px-6 lg:px-8 py-2 md:py-3 rounded-full font-bold text-lg md:text-xl lg:text-2xl shadow-lg">
                Step 1
              </div>
            </div>
            <Card className="p-4 md:p-6 lg:p-8 shadow-lg">
            <div className="mb-4 md:mb-6">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-2 md:mb-3 text-center px-2">
                Watch the video below in full before moving on to the rest of the page
              </h2>
            </div>
            
            <div className="w-full max-w-4xl mx-auto mb-6">
              <div className="relative w-full rounded-lg overflow-hidden bg-black shadow-md aspect-video">
                <div 
                  id="vidalytics_embed_VIDEO_ID" 
                  className="absolute top-0 left-0 w-full h-full"
                  style={{ aspectRatio: '16/9' }}
                />
              </div>
            </div>

            <div className="bg-green-light/30 border-l-4 border-primary p-6 md:p-8 rounded-r-lg shadow-sm">
              <p className="text-base md:text-lg text-foreground leading-relaxed">
                You've just taken the first step towards understanding how <span className="font-bold">BRRRR investing</span> could change your financial future. This call is your opportunity to ask <span className="font-bold text-primary">ALL your questions</span> and see if our approach to building cash-flowing rental properties makes sense for you.
              </p>
            </div>
            
            <div className="flex justify-center">
              <StepCompletionButton stepId="step-1" />
            </div>
          </Card>
          </div>

          {/* Step 2 - Quick Prep Tips */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-8 py-3 rounded-full font-bold text-2xl shadow-lg">
                Step 2
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-6 text-center">
              Quick Prep Tips
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4 p-3 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary">
                    <UserCheck className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-1">Be Ready</h3>
                  <p className="text-foreground">Be ready to share your current situation</p>
                </div>
              </div>

              <div className="flex gap-4 p-3 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-1">Think</h3>
                  <p className="text-foreground">Think about what's blocking your real estate goals</p>
                </div>
              </div>

              <div className="flex gap-4 p-3 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-1">Questions</h3>
                  <p className="text-foreground">Prepare some questions you really want answered</p>
                </div>
              </div>

              <div className="flex gap-4 p-3 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-lg mb-1">Be Honest</h3>
                  <p className="text-foreground">Be open and honest</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center">
              <StepCompletionButton stepId="step-2" />
            </div>
          </Card>

          {/* What to Expect */}
          <Card className="p-6 md:p-8 shadow-lg bg-green-light/20">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-6 text-center">
              What to Expect
            </h2>
            
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold text-xl mt-1">✓</span>
                <p className="text-lg text-foreground font-semibold">Ask anything you want to know</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold text-xl mt-1">✓</span>
                <p className="text-lg text-foreground font-semibold">No pressure, just pure information</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-primary font-bold text-xl mt-1">✓</span>
                <p className="text-lg text-foreground font-semibold">Find out if this could be your path to financial freedom</p>
              </div>
            </div>
          </Card>
          </div>

          {/* Step 3 - Calendar Confirmation */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-8 py-3 rounded-full font-bold text-2xl shadow-lg">
                Step 3
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg">
            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-4 text-center">
                Confirm Your Calendar Invite
              </h2>
            </div>

            <div className="space-y-6">
              <p className="text-lg text-foreground leading-relaxed">
                You will receive a <span className="font-bold text-primary">calendar invite via email</span> (Google, Apple, or Outlook). It will look just like the one shown below:
              </p>

              <div className="bg-white p-4 rounded-lg shadow-md border border-border">
                <img 
                  src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} 
                  alt="Calendar Invite Example" 
                  className="w-full h-auto rounded"
                />
              </div>

              <div className="bg-green-light/30 border-l-4 border-primary p-6 rounded-r-lg space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-xl flex-shrink-0">1.</span>
                  <p className="text-foreground leading-relaxed">
                    <span className="font-bold">Accept the Invite</span> and add it to your calendar so you don't forget. Set a reminder 10 minutes before.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-xl flex-shrink-0">2.</span>
                  <p className="text-foreground leading-relaxed">
                    Your email will include a clickable <span className="font-bold">Zoom or Google Meet link</span>. Keep that email saved so you can access the call at the right time.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-primary font-bold text-xl flex-shrink-0">3.</span>
                  <p className="text-foreground leading-relaxed">
                    This call could be <span className="font-bold text-primary">step #1 toward completely changing your life</span>. If you see the invite, reply "I'll be there!" to lock it in.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-center">
                <StepCompletionButton stepId="step-3" />
              </div>
            </div>
          </Card>
          </div>

          {/* Step 4 - FAQ Video Section */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-8 py-3 rounded-full font-bold text-2xl shadow-lg">
                Step 4
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-4 text-center">
              Do Your Research / <span className="italic text-primary">Due Diligence</span>
            </h2>
            <p className="text-lg text-center text-foreground mb-8">
              Watch these videos to get answers to common questions
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { title: "What is the BRRRR method?", url: "https://example.com/placeholder-video.mp4" },
                { title: "I'm not ready yet but I'll be ready soon", url: "https://example.com/placeholder-video.mp4" },
                { title: "I'm too busy to invest in real estate", url: "https://example.com/placeholder-video.mp4" },
                { title: "How we help reduce your risk", url: "https://example.com/placeholder-video.mp4" },
                { title: "The cost of waiting another year", url: "https://example.com/placeholder-video.mp4" },
                { title: "What if I buy at the wrong time?", url: "https://example.com/placeholder-video.mp4" },
                { title: "Do I need $100,000 or more in order to get started investing?", url: "https://example.com/placeholder-video.mp4" },
                { title: "Why do you guys like Memphis market so much?", url: "https://example.com/placeholder-video.mp4" },
                { title: "Can I just get the same information for free online?", url: "https://example.com/placeholder-video.mp4" },
                { title: "What if my friends and family don't approve of this?", url: "https://example.com/placeholder-video.mp4" }
              ].map((video, index) => (
                <div key={index} className="group relative">
                  <div className="relative bg-black rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300" style={{ aspectRatio: '9/16' }}>
                    <video 
                      className="w-full h-full object-cover"
                      preload="metadata"
                      onClick={(e) => {
                        const video = e.currentTarget;
                        if (video.paused) {
                          video.play();
                          video.setAttribute('controls', 'true');
                        }
                      }}
                    >
                      <source src={video.url} type="video/mp4" />
                    </video>
                    
                    {/* Custom Play Button Overlay with Title */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/80 via-black/50 to-black/30 group-hover:from-black/90 group-hover:via-black/60 group-hover:to-black/40 transition-all duration-300 cursor-pointer p-6"
                         onClick={(e) => {
                           const video = e.currentTarget.previousElementSibling as HTMLVideoElement;
                           if (video && video.paused) {
                             video.play();
                             video.setAttribute('controls', 'true');
                             e.currentTarget.classList.add('opacity-0', 'pointer-events-none');
                           }
                         }}>
                      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg mb-4">
                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                      </div>
                      <h3 className="font-bold text-white text-center text-base md:text-lg leading-tight">
                        {video.title}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center">
              <StepCompletionButton stepId="step-4" />
            </div>
          </Card>
          </div>

          {/* Step 5 - If We're a Match Section */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-8 py-3 rounded-full font-bold text-2xl shadow-lg">
                Step 5
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg bg-primary/5">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-6 text-center">
              If We're a Match, Here's <span className="italic text-primary">What Happens</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">15 In-Depth Courses</h3>
                  <p className="text-foreground text-sm">Comprehensive training on every aspect of BRRRR investing</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <VideoIcon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Three Weekly Live Calls</h3>
                  <p className="text-foreground text-sm">Direct access to mentors and expert guidance</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Accountability Partnership</h3>
                  <p className="text-foreground text-sm">Stay on track with dedicated support</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <Star className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Supportive Investor Community</h3>
                  <p className="text-foreground text-sm">Network with like-minded investors</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <Award className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Lifetime Course Access</h3>
                  <p className="text-foreground text-sm">Learn at your own pace, forever</p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <Gift className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground text-lg mb-1">Exclusive Bonuses</h3>
                  <p className="text-foreground text-sm">Additional resources and templates</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
              <p className="text-sm text-foreground italic">
                <span className="font-semibold">Note:</span> Ask about our Done-For-You Program if You Are Interested in Learning How That Works
              </p>
            </div>
            
            <div className="flex justify-center">
              <StepCompletionButton stepId="step-5" />
            </div>
          </Card>
          </div>

          {/* Live BRRRR Case Study */}
          <LiveDealCaseStudy />

          {/* Step 6 - Testimonials Section */}
          <div className="relative pt-6 md:pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-4 md:px-6 lg:px-8 py-2 md:py-3 rounded-full font-bold text-lg md:text-xl lg:text-2xl shadow-lg">
                Step 6
              </div>
            </div>
            <Card className="p-4 md:p-6 lg:p-8 shadow-lg text-center">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-3 md:mb-4 px-2">
              Meanwhile, If you Want <span className="italic text-primary">Inspiration</span>…
            </h2>
            <p className="text-base md:text-lg text-foreground mb-4 md:mb-6 px-2">
              Go through these success stories of our students who were once excited about this call just as you are!
            </p>
            
            {/* Top Row - Scrollable */}
            <div className="mb-4 md:mb-6 relative">
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm h-8 w-8 md:h-10 md:w-10"
                onClick={() => scrollRow(topRowRef, 'left')}
              >
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm h-8 w-8 md:h-10 md:w-10"
                onClick={() => scrollRow(topRowRef, 'right')}
              >
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <div ref={topRowRef} className="overflow-x-auto pb-4 scroll-smooth px-8 md:px-12" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex gap-3 md:gap-4 min-w-min">
                  {[...testimonialVideos.slice(0, 6), ...testimonialVideos.slice(0, 6), ...testimonialVideos.slice(0, 6), ...testimonialVideos.slice(0, 6)].map((videoUrl, index) => (
                    <div key={index} className="group relative flex-shrink-0 w-48 md:w-56 lg:w-64">
                      <div className="relative bg-black rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300" style={{ aspectRatio: '9/16' }}>
                        <video 
                          className="w-full h-full object-cover"
                          preload="metadata"
                          onClick={(e) => {
                            const video = e.currentTarget;
                            if (video.paused) {
                              video.play();
                              video.setAttribute('controls', 'true');
                            }
                          }}
                        >
                          <source src={videoUrl} type="video/mp4" />
                        </video>
                        
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all duration-300 cursor-pointer"
                             onClick={(e) => {
                               const video = e.currentTarget.previousElementSibling as HTMLVideoElement;
                               if (video && video.paused) {
                                 video.play();
                                 video.setAttribute('controls', 'true');
                                 e.currentTarget.classList.add('opacity-0', 'pointer-events-none');
                               }
                             }}>
                          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Bottom Row - Scrollable */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="absolute left-0 md:left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm h-8 w-8 md:h-10 md:w-10"
                onClick={() => scrollRow(bottomRowRef, 'left')}
              >
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 md:right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm h-8 w-8 md:h-10 md:w-10"
                onClick={() => scrollRow(bottomRowRef, 'right')}
              >
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <div ref={bottomRowRef} className="overflow-x-auto pb-4 scroll-smooth px-8 md:px-12" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex gap-3 md:gap-4 min-w-min">
                  {[...testimonialVideos.slice(6), ...testimonialVideos.slice(6), ...testimonialVideos.slice(6), ...testimonialVideos.slice(6)].map((videoUrl, index) => (
                    <div key={index + 6} className="group relative flex-shrink-0 w-48 md:w-56 lg:w-64">
                      <div className="relative bg-black rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300" style={{ aspectRatio: '9/16' }}>
                        <video 
                          className="w-full h-full object-cover"
                          preload="metadata"
                          onClick={(e) => {
                            const video = e.currentTarget;
                            if (video.paused) {
                              video.play();
                              video.setAttribute('controls', 'true');
                            }
                          }}
                        >
                          <source src={videoUrl} type="video/mp4" />
                        </video>
                        
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all duration-300 cursor-pointer"
                             onClick={(e) => {
                               const video = e.currentTarget.previousElementSibling as HTMLVideoElement;
                               if (video && video.paused) {
                                 video.play();
                                 video.setAttribute('controls', 'true');
                                 e.currentTarget.classList.add('opacity-0', 'pointer-events-none');
                               }
                             }}>
                          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300 shadow-lg">
                            <div className="w-0 h-0 border-t-[12px] border-t-transparent border-l-[20px] border-l-white border-b-[12px] border-b-transparent ml-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-6">
              <StepCompletionButton stepId="step-6" />
            </div>
          </Card>
          </div>

          {/* Step 7 - Skool Community CTA with Confetti */}
          <div className="relative pt-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
              <div className="bg-primary text-white px-4 sm:px-6 md:px-8 py-2 md:py-3 rounded-full font-bold text-base sm:text-lg md:text-xl lg:text-2xl shadow-lg whitespace-nowrap">
                Step 7
              </div>
            </div>
            <Card className="p-6 md:p-8 shadow-lg text-center bg-gradient-to-br from-primary/10 via-background to-primary/5 border-2 border-primary/20">
            <h2 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight mb-4">
              Want Even More <span className="italic text-primary">Free Value</span>?
            </h2>
            <p className="text-lg text-foreground mb-6">
              Join our free Real Estate Investor Network community on Skool to learn more, connect with other investors, and get exclusive content!
            </p>
            <button
              onClick={() => {
                // Trigger confetti
                confetti({
                  particleCount: 100,
                  spread: 70,
                  origin: { y: 0.6 }
                });
                // Delay navigation slightly to see confetti
                setTimeout(() => {
                  window.open('https://www.skool.com/section8guys/about', '_blank');
                }, 300);
              }}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 sm:px-6 md:px-8 py-3 md:py-4 rounded-lg font-bold text-sm sm:text-base md:text-lg shadow-lg hover:bg-primary/90 hover:scale-105 transition-all duration-300 whitespace-nowrap"
            >
              <Users className="w-6 h-6" />
              Join Free Community
            </button>
            
            <div className="mt-4">
              <StepCompletionButton stepId="step-7" />
            </div>
          </Card>
          </div>
        </div>
      </div>
      
      <Footer />
      <ProgressTracker />
      <ExitIntentPopup />
    </div>
  );
};

export default Confirmed;
$fb_52_tsx$,
  $fb_52_default_props${"headline":"You've Made a Great Decision!","subheadline":"Your Session is Confirmed ...","cta_label":"scrollRow(topRowRef, 'left')} >","bullets":[],"image_url":""}$fb_52_default_props$::jsonb,
  $fb_52_layout_signature$grid-3$fb_52_layout_signature$,
  $fb_52_source_type$extracted$fb_52_source_type$,
  $fb_52_source_reference${"file_path":"vsl-call-booking/brrr-guys-pre-call.md","heading":"","page_name":"BRR Guys - Pre-Call Page","company":"The BRR Guys"}$fb_52_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
