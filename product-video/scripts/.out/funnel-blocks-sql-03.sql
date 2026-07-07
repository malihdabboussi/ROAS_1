INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_13_slug$general-home-page-origin-studios-home-starrating$fb_13_slug$,
  $fb_13_name$StarRating$fb_13_name$,
  $fb_13_description$Origin Studios StarRating extracted from general-home-page/origin-studios-home.md$fb_13_description$,
  $fb_13_category$faq$fb_13_category$,
  ARRAY[$fb_13_page_types_0$home$fb_13_page_types_0$, $fb_13_page_types_1$general-home-page$fb_13_page_types_1$]::text[],
  ARRAY[$fb_13_funnel_types_0$general-home-page$fb_13_funnel_types_0$]::text[],
  $fb_13_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_13_slot_schema$::jsonb,
  ARRAY[$fb_13_theme_tokens_0$colors$fb_13_theme_tokens_0$, $fb_13_theme_tokens_1$font_heading$fb_13_theme_tokens_1$, $fb_13_theme_tokens_2$font_body$fb_13_theme_tokens_2$]::text[],
  $fb_13_asset_slots${}$fb_13_asset_slots$::jsonb,
  $fb_13_tsx$// __FB_SHIM_START__
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

// File: FAQSection.tsx
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Clock, Star, ExternalLink, PenLine } from "lucide-react";







const faqItems = [
  {
    question: "How do I book a session?",
    answer:
      "Booking a session is easy! If you're a member, you'll receive your own personalized booking link to reserve sessions at your convenience. Simply select your preferred studio and time slot, and you're all set. If you have any questions about reservations or need help getting started, don't hesitate to reach out to us—we're here to help!",
  },
  {
    question: "What happens if I'm late to my session?",
    answer:
      "We understand that things happen! However, your session time is reserved specifically for you, so arriving late will reduce your available recording time. We recommend arriving 10-15 minutes early to get settled. If you're running more than 15 minutes late, please contact us.",
  },
  {
    question: "Do you provide editing and production services?",
    answer:
      "Yes! Our Full Service and The Total membership plans include comprehensive editing and production services. This includes real-time editing, post-production work, episode thumbnails, short-form content creation, and distribution to all major podcast platforms.",
  },
  {
    question: "Can I bring my own production team?",
    answer:
      "Absolutely! You're welcome to bring your own production team to any of our studios. Our facilities are designed to accommodate both solo creators and full production crews. Just let us know in advance so we can ensure the space is set up appropriately.",
  },
  {
    question: "Who has recorded here before?",
    answer:
      "We've had the privilege of hosting some incredible guests including Flex Lewis, Ric Flair, Dan Bilzerian, Charlie Kirk, Dave Asprey, Roger Stone, Suga Sean O'Malley, Ari Shaffir, Fresh & Fit, and many more. At Origin, we welcome all guests, regardless of political affiliation, personal viewpoint, or background.",
  },
];

const GOOGLE_MAPS_EMBED_URL = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3224.0!2d-115.1537!3d36.0840!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80c8c41d4e5c5c5d%3A0x5c5c5c5c5c5c5c5c!2s6565+Spencer+St+%23+100%2C+Las+Vegas%2C+NV+89119!5e0!3m2!1sen!2sus!4v1234567890";
const GOOGLE_REVIEWS_URL = "https://www.google.com/maps/place/Origin+Studios/@36.084,-115.1537,17z/data=!4m8!3m7!1s0x0:0x0!8m2!3d36.084!4d-115.1537!9m1!1b1!16s";
const GOOGLE_LEAVE_REVIEW_URL = "https://g.page/r/CdVFRXfY3QqgEAI/review";

const contactInfo = {
  address: "6565 Spencer Street Unit 101",
  city: "Las Vegas, NV 89119",
  phone: "+1 702-200-4-POD (4763)",
  email: "info@originpodcasting.com",
  hours: [
    { days: "Sunday – Monday", time: "Closed" },
    { days: "Tuesday", time: "11 AM – 7 PM" },
    { days: "Wednesday", time: "8 AM – 7 PM" },
    { days: "Thursday", time: "11 AM – 7 PM" },
    { days: "Friday", time: "11 AM – 7 PM" },
    { days: "Saturday", time: "11 AM – 7 PM" },
  ],
  afterHoursNote: "After hours available by appointment",
};

const overallRating = 5.0;
const totalReviews = 8;

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-5 h-5 ${
            i < rating 
              ? "fill-primary text-primary" 
              : "fill-muted text-muted"
          }`}
        />
      ))}
    </div>
  );
}

export function FAQSection() {
  const skipAnimation = useSkipInitialAnimation();

  return (
    <section className="section-padding bg-gradient-to-b from-card via-card to-background relative overflow-hidden">
      {/* Subtle gradient accent */}
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="container-custom relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={skipAnimation ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <p className="text-primary text-sm font-medium tracking-wider uppercase mb-2">
              Got Questions?
            </p>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
              Frequently Asked <span className="text-primary">Questions</span>
            </h2>
          </motion.div>

          <motion.div
            initial={skipAnimation ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="bg-secondary/50 rounded-xl border border-border/50 px-6 overflow-hidden"
                >
                  <AccordionTrigger className="text-left font-display text-lg font-medium hover:text-primary hover:no-underline py-6">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-6">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>

        {/* Location Section */}
        <motion.div
          initial={skipAnimation ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 md:mt-20"
        >
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-stretch">
            {/* Map Container */}
            <div className="relative rounded-2xl overflow-hidden bg-background border border-border shadow-lg min-h-[400px]">
              <iframe
                src={GOOGLE_MAPS_EMBED_URL}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "400px" }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Origin Studios Location - Las Vegas Podcast Studio"
                className="absolute inset-0"
              />
            </div>

            {/* Contact Info Card */}
            <div className="bg-background rounded-2xl border border-border p-8 md:p-10 flex flex-col">
              <div className="space-y-5">
                {/* Address */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground">{contactInfo.address}</p>
                    <p className="text-muted-foreground">{contactInfo.city}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <a 
                    href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    {contactInfo.phone}
                  </a>
                </div>

                {/* Email */}
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <a 
                    href={`mailto:${contactInfo.email}`}
                    className="text-foreground hover:text-primary transition-colors"
                  >
                    {contactInfo.email}
                  </a>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    {contactInfo.hours.map((schedule, index) => (
                      <p key={index} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{schedule.days}:</span>{" "}
                        {schedule.time}
                      </p>
                    ))}
                    <p className="text-sm text-primary mt-2 italic">
                      {contactInfo.afterHoursNote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Google Reviews Section */}
          <motion.div
            initial={skipAnimation ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-8 bg-background rounded-2xl border border-border p-6 md:p-8"
          >
            {/* Rating Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 pb-6 border-b border-border">
              {/* Rating Info */}
              <div className="flex flex-col items-center md:items-start gap-2">
                <div className="flex items-center gap-2">
                  <img 
                    src="/placeholder.jpg
                    alt="Google" 
                    className="w-5 h-5"
                  />
                  <span className="text-2xl font-bold text-primary">{overallRating}</span>
                  <StarRating rating={overallRating} />
                </div>
                <a 
                  href={GOOGLE_REVIEWS_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  See all reviews on Google
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Leave Review Button */}
              <Button asChild size="sm" className="group">
                <a 
                  href={GOOGLE_LEAVE_REVIEW_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <PenLine className="w-3.5 h-3.5 mr-1.5" />
                  Leave a Review
                </a>
              </Button>
            </div>

            {/* Review Highlights */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} 
                    alt="Chris Oram" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">Chris Oram</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "Origin Podcast Studio is a hidden gem. World class facility and incredible staff members. They exceed the standards for how a video podcast should look in 2025."
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} 
                    alt="Kate Gray" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">Kate Gray</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "We have loved our time working at Origin Podcast Studio! Professional team and high quality sound/lights/camera! Amazing value!"
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <img 
                    src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} 
                    alt="Good Vibes" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="font-medium text-sm">Good Vibes</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  "Mics, cameras, and headphones were top notch. This is the best place in Las Vegas for Podcast and it's next to the airport, very central."
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
$fb_13_tsx$,
  $fb_13_default_props${"headline":"Frequently Asked Questions","subheadline":"Got Questions?","cta_label":"Leave a Review","bullets":[],"image_url":""}$fb_13_default_props$::jsonb,
  $fb_13_layout_signature$grid-3$fb_13_layout_signature$,
  $fb_13_source_type$extracted$fb_13_source_type$,
  $fb_13_source_reference${"file_path":"general-home-page/origin-studios-home.md","heading":"","page_name":"Origin Studios - Home Page","company":"Origin Studios"}$fb_13_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_14_slug$general-home-page-origin-studios-home-studiossection$fb_14_slug$,
  $fb_14_name$StudiosSection$fb_14_name$,
  $fb_14_description$Origin Studios StudiosSection extracted from general-home-page/origin-studios-home.md$fb_14_description$,
  $fb_14_category$pricing$fb_14_category$,
  ARRAY[$fb_14_page_types_0$home$fb_14_page_types_0$, $fb_14_page_types_1$general-home-page$fb_14_page_types_1$]::text[],
  ARRAY[$fb_14_funnel_types_0$general-home-page$fb_14_funnel_types_0$]::text[],
  $fb_14_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_14_slot_schema$::jsonb,
  ARRAY[$fb_14_theme_tokens_0$colors$fb_14_theme_tokens_0$, $fb_14_theme_tokens_1$font_heading$fb_14_theme_tokens_1$, $fb_14_theme_tokens_2$font_body$fb_14_theme_tokens_2$]::text[],
  $fb_14_asset_slots${}$fb_14_asset_slots$::jsonb,
  $fb_14_tsx$// __FB_SHIM_START__
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

// File: StudiosSection.tsx
import { motion } from "framer-motion";




// Import studio images




const studios = [
  {
    name: "STUDIO A",
    price: "$200/HR",
    image: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
    description: "Intimate recording space for one-on-one interviews and voiceovers",
  },
  {
    name: "STUDIO B",
    price: "$250/HR",
    image: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
    description: "Premium 4-person podcasting setup with dynamic displays",
  },
  {
    name: "STUDIO C",
    price: "$350/HR",
    image: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset',
    description: "State-of-the-art video wall studio for premium productions",
  },
];

export function StudiosSection() {
  const skipAnimation = useSkipInitialAnimation();

  return (
    <section className="section-padding bg-gradient-to-b from-background via-background to-card relative overflow-hidden">
      <div className="container-custom">
        <motion.div
          initial={skipAnimation ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-primary text-sm font-medium tracking-wider uppercase mb-2">
            Our Spaces
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold">
            Premium Podcast <span className="text-primary">Studios</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {studios.map((studio, index) => (
            <motion.div
              key={studio.name}
              initial={skipAnimation ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative rounded-2xl overflow-hidden card-hover bg-card"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={studio.image}
                  alt={studio.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-xl font-bold">{studio.name}</h3>
                  <span className="text-primary font-bold">{studio.price}</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">
                  {studio.description}
                </p>
                <Button
                  asChild
                  className="w-full btn-glow bg-primary text-primary-foreground hover:bg-accent rounded-lg"
                >
                  <Link to="/hourly">Book Now</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
$fb_14_tsx$,
  $fb_14_default_props${"headline":"Premium Podcast Studios","subheadline":"Our Spaces","cta_label":"Book Now","bullets":[],"image_url":""}$fb_14_default_props$::jsonb,
  $fb_14_layout_signature$grid-3$fb_14_layout_signature$,
  $fb_14_source_type$extracted$fb_14_source_type$,
  $fb_14_source_reference${"file_path":"general-home-page/origin-studios-home.md","heading":"","page_name":"Origin Studios - Home Page","company":"Origin Studios"}$fb_14_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_15_slug$lead-magnet-brrr-guys-optin-info$fb_15_slug$,
  $fb_15_name$Info$fb_15_name$,
  $fb_15_description$The BRR Guys Info extracted from lead-magnet/brrr-guys-optin.md$fb_15_description$,
  $fb_15_category$footer$fb_15_category$,
  ARRAY[$fb_15_page_types_0$lead-magnet-optin$fb_15_page_types_0$, $fb_15_page_types_1$opt-in$fb_15_page_types_1$, $fb_15_page_types_2$lead-magnet$fb_15_page_types_2$]::text[],
  ARRAY[$fb_15_funnel_types_0$lead-magnet$fb_15_funnel_types_0$]::text[],
  $fb_15_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_15_slot_schema$::jsonb,
  ARRAY[$fb_15_theme_tokens_0$colors$fb_15_theme_tokens_0$, $fb_15_theme_tokens_1$font_heading$fb_15_theme_tokens_1$, $fb_15_theme_tokens_2$font_body$fb_15_theme_tokens_2$]::text[],
  $fb_15_asset_slots${}$fb_15_asset_slots$::jsonb,
  $fb_15_tsx$// __FB_SHIM_START__
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

// File: Info.tsx

import { useEffect } from "react";


import { Check, AlertTriangle } from "lucide-react";

const Info = () => {
  const { utmQueryString } = useUtmParams();
  usePageTracking();

  const getCurrentMonth = () => {
    return new Date().toLocaleString('default', { month: 'long' });
  };

  useEffect(() => {
    localStorage.setItem('brrrr_source_page', '/info');
    
    const script = document.createElement('script');
    script.src = "https://your-form-provider.com/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const bulletPoints = [
    "The Google Map showing our 800+ Memphis properties (with addresses)",
    "Why 90% of course buyers never close deals (the Guru Profit Gap)",
    "Our exact contractors and lenders (warm introductions included)",
    "How to close your first rental in 90 days, not 90 weeks",
    `Limited to 20 Partner Track spots (${getCurrentMonth()} cohort)`,
  ];

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3 leading-tight">
              90% Who Buy Real Estate Courses Never Close a Deal.{" "}
              <span className="text-primary">Here's Why.</span>
            </h1>
            
            <p className="text-base md:text-lg text-muted-foreground mb-4 leading-relaxed">
              Give me twelve minutes to show you how to close your first rental property in 90 days using our contractors, lenders, and proven playbook
            </p>

          </div>

            <iframe
              src={`https://your-form-provider.com/embed/YOUR_FORM_ID${utmQueryString ? `?${utmQueryString}` : ''}`}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '3px', minHeight: '462px' }}
              id="inline-YOUR_FORM_ID" 
              data-layout="{'id':'INLINE'}"
              data-trigger-type="alwaysShow"
              data-trigger-value=""
              data-activation-type="alwaysActivated"
              data-activation-value=""
              data-deactivation-type="neverDeactivate"
              data-deactivation-value=""
              data-form-name="VSL - Opt- In - Info Form "
              data-height="462"
              data-layout-iframe-id="YOUR_FORM_ID"
              data-form-id="YOUR_FORM_ID"
            title="VSL - Opt- In - Info Form "
            />

          {/* Trust Element */}
          <div className="flex justify-center mt-4">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-600 px-4 py-2 rounded-lg">
              <span className="text-sm font-semibold">
                🏠 From the owners of 800+ rental properties (proof on next page)
              </span>
            </div>
          </div>

          {/* Bullet Points Section */}

          {/* Bullet Points Section */}
          <div className="mt-4 pt-4 border-t border-border/30">
              <p className="text-lg font-semibold text-foreground mb-4">
                In this video you'll discover:
              </p>
              <ul className="space-y-3">
                {bulletPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

          {/* Disclaimer */}
          <p className="text-xs text-muted-foreground/70 text-center mt-6">
            By continuing, you agree to receive SMS and email about BRRRR in 90. This is a paid program with limited spots.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Info;
$fb_15_tsx$,
  $fb_15_default_props${"headline":"90% Who Buy Real Estate Courses Never Close a Deal. Here's Why.","subheadline":"Give me twelve minutes to show you how to close your first rental property in 90 days using our contractors, lenders, and proven playbook","cta_label":"","bullets":[],"image_url":""}$fb_15_default_props$::jsonb,
  $fb_15_layout_signature$centered-stack$fb_15_layout_signature$,
  $fb_15_source_type$extracted$fb_15_source_type$,
  $fb_15_source_reference${"file_path":"lead-magnet/brrr-guys-optin.md","heading":"","page_name":"BRR Guys - Lead Magnet Opt-In","company":"The BRR Guys"}$fb_15_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_16_slug$lead-magnet-freedom-builders-delivery-blueprint$fb_16_slug$,
  $fb_16_name$Blueprint$fb_16_name$,
  $fb_16_description$Freedom Builders Blueprint extracted from lead-magnet/freedom-builders-delivery.md$fb_16_description$,
  $fb_16_category$hero$fb_16_category$,
  ARRAY[$fb_16_page_types_0$lead-magnet-delivery$fb_16_page_types_0$, $fb_16_page_types_1$lead-magnet$fb_16_page_types_1$]::text[],
  ARRAY[$fb_16_funnel_types_0$lead-magnet$fb_16_funnel_types_0$]::text[],
  $fb_16_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false},"image_url":{"type":"asset","role":"section","aspect":"16:9","required":false}}$fb_16_slot_schema$::jsonb,
  ARRAY[$fb_16_theme_tokens_0$colors$fb_16_theme_tokens_0$, $fb_16_theme_tokens_1$font_heading$fb_16_theme_tokens_1$, $fb_16_theme_tokens_2$font_body$fb_16_theme_tokens_2$]::text[],
  $fb_16_asset_slots${"image_url":{"role":"section","aspect":"16:9","required":false}}$fb_16_asset_slots$::jsonb,
  $fb_16_tsx$// __FB_SHIM_START__
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

// File: Blueprint.tsx






import { ExternalLink } from "lucide-react";

const Blueprint = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 border-b border-white/10" style={{ background: "#090909" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-16 py-4 flex items-center justify-center">
          <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="Freedom Builderz" className="h-8 shrink-0" />
        </div>
      </div>

      {/* Hero */}
      <section className="relative py-14 md:py-20 px-4 overflow-hidden" style={{ background: "#090909" }}>
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -top-[30%] -left-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute -bottom-[30%] -right-[20%] w-[800px] h-[800px] object-cover opacity-[0.3] pointer-events-none" style={{ maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)", WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)" }} />
        <img src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <p className="text-[#FF5D2E] font-bold text-sm uppercase tracking-widest mb-4">
            Special Access
          </p>

          <h1 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
            YOUR STEP-BY-STEP PLAN TO{" "}
            <span style={{ color: "#FF5D2E" }}>LAUNCH AN ONLINE PROGRAM</span>
          </h1>

          <p className="text-white/60 text-base md:text-lg mb-10 max-w-xl mx-auto">
            Use this blueprint to map out, structure, and launch your digital business. Watch the walkthrough, then use the button below the video to grab the template.
          </p>

          {/* Embedded YouTube */}
          <div className="max-w-2xl mx-auto">
            <div
              className="relative w-full rounded-[16px] overflow-hidden"
              style={{ paddingBottom: "56.25%", boxShadow: "0 8px 40px rgba(0,0,0,0.4)" }}
            >
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://example.com/placeholder-video-embed"
                title="Builderz Blueprint Walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* Canva CTA */}
          <div className="mt-10 max-w-2xl mx-auto">
            <a
              href="https://www.canva.com/design/DAFfrfBI1YI/pkmB-PSzYBTq9w0T74eVnQ/view?utm_content=DAFfrfBI1YI&utm_campaign=designshare&utm_medium=link&utm_source=publishsharelink&mode=preview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl text-white text-base font-bold transition-all hover:brightness-110"
              style={{ background: "#FF5D2E" }}
            >
              <ExternalLink className="w-5 h-5" />
              Open the Canva Template
            </a>
          </div>
        </div>
      </section>

      {/* Calendar Booking Section */}
      <section className="relative py-14 md:py-20 px-4 overflow-hidden" style={{ background: "#090909" }}>
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col lg:flex-row gap-10 lg:gap-14 items-start">
          {/* Left: Mike intro */}
          <div className="lg:w-[340px] shrink-0 text-center lg:text-left lg:sticky lg:top-28">
            <img
              src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
              alt="Mike G."
              className="w-36 h-36 rounded-full object-cover mx-auto lg:mx-0 mb-6 border-2 border-[#FF5D2E]/30"
            />
            <h2 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-3">
              READY TO GO DEEPER?
            </h2>
            <p className="text-white/60 text-base md:text-lg">
              Book a free one-on-one call with{" "}
              <span className="text-white font-semibold">Mike G.</span>, founder
              of Freedom Builderz, and get personalized guidance on launching
              your program.
            </p>
          </div>

          {/* Right: Booking calendar */}
          <div className="flex-1 min-w-0 rounded-[20px] overflow-hidden" style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.08)" }}>
            <iframe
              src="https://your-form-provider.com/embed/YOUR_FORM_ID"
              style={{ width: "100%", minHeight: "1000px", border: "none" }}
              scrolling="no"
              id="IsH4zinswqcsggqaBikA_booking"
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Blueprint;
$fb_16_tsx$,
  $fb_16_default_props${"headline":"YOUR STEP-BY-STEP PLAN TO LAUNCH AN ONLINE PROGRAM","subheadline":"Special Access","cta_label":"","bullets":[],"image_url":"https://your-form-provider.com/embed/YOUR_FORM_ID"}$fb_16_default_props$::jsonb,
  $fb_16_layout_signature$centered-stack$fb_16_layout_signature$,
  $fb_16_source_type$extracted$fb_16_source_type$,
  $fb_16_source_reference${"file_path":"lead-magnet/freedom-builders-delivery.md","heading":"","page_name":"Freedom Builders - Lead Magnet Delivery","company":"Freedom Builders"}$fb_16_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_17_slug$lead-magnet-freedom-builders-optin-blueprintaboutmike$fb_17_slug$,
  $fb_17_name$BlueprintAboutMike$fb_17_name$,
  $fb_17_description$Freedom Builders BlueprintAboutMike extracted from lead-magnet/freedom-builders-optin.md$fb_17_description$,
  $fb_17_category$stats$fb_17_category$,
  ARRAY[$fb_17_page_types_0$lead-magnet-optin$fb_17_page_types_0$, $fb_17_page_types_1$opt-in$fb_17_page_types_1$, $fb_17_page_types_2$lead-magnet$fb_17_page_types_2$]::text[],
  ARRAY[$fb_17_funnel_types_0$lead-magnet$fb_17_funnel_types_0$]::text[],
  $fb_17_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_17_slot_schema$::jsonb,
  ARRAY[$fb_17_theme_tokens_0$colors$fb_17_theme_tokens_0$, $fb_17_theme_tokens_1$font_heading$fb_17_theme_tokens_1$, $fb_17_theme_tokens_2$font_body$fb_17_theme_tokens_2$]::text[],
  $fb_17_asset_slots${}$fb_17_asset_slots$::jsonb,
  $fb_17_tsx$// __FB_SHIM_START__
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

// File: BlueprintAboutMike.tsx
import { useState } from "react";
import { Play, Instagram, ArrowRight } from "lucide-react";





const STORY_VIDEO = "/placeholder-video.mp4";

interface BlueprintAboutMikeProps {
  onCtaClick: () => void;
}

const BlueprintAboutMike = ({ onCtaClick }: BlueprintAboutMikeProps) => {
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

        <div className="relative z-10 max-w-5xl mx-auto flex flex-col md:flex-row items-start gap-12">
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

            <div className="flex items-center gap-5">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 text-sm font-medium hover:underline transition-colors cursor-pointer bg-transparent border-none text-white"
              >
                <Play className="w-4 h-4 text-primary" fill="currentColor" />
                Watch Mike's Story
              </button>
              <a
                href="https://instagram.com/your-handle/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-white hover:underline text-sm font-medium transition-colors"
              >
                <Instagram className="w-4 h-4 text-primary" />
                @mikegbuilds
              </a>
            </div>
          </div>

          {/* Right: Bio */}
          <div className="flex-1 max-w-[520px]">
            <h2 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-5">
              WHO'S BEHIND <span className="text-primary">THIS?</span>
            </h2>

            <div className="text-white/70 text-base leading-relaxed space-y-3.5 mb-6">
              <p>
                I'm <span className="text-white font-semibold">Mike Gonzalez</span>, founder of Freedom Builderz.
              </p>
              <p>
                We've built 150+ online programs for coaches, creators, and
                experts — and the #1 thing that holds people back isn't tech,
                time, or talent.
              </p>
              <p className="text-white font-semibold">It's clarity.</p>
              <p>
                They can't see what's in their head. So they never build it.
              </p>
              <p>
                I created The Builderz Blueprint to fix that. It's the same tool
                we use on every client build — and now it's yours.
              </p>
            </div>

            <div className="w-16 h-px mb-5" style={{ background: "rgba(255,93,46,0.3)" }} />

            <div className="space-y-0.5 mb-6">
              <p className="text-white font-bold">Michael Gonzalez</p>
              <p className="text-white/50 text-sm">Founder of Freedom Builderz</p>
              <p className="text-sm font-bold text-primary">7-Figure Program Architect</p>
            </div>

            <button
              onClick={onCtaClick}
              className="inline-flex items-center gap-2 text-primary font-bold text-base hover:gap-3 transition-all bg-transparent border-none cursor-pointer"
            >
              DOWNLOAD THE BLUEPRINT
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {showModal && <StoryModal onClose={() => setShowModal(false)} />}
    </>
  );
};

const StoryModal = ({ onClose }: { onClose: () => void }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="relative z-10 w-[95%] md:w-[90%] rounded-[20px] p-5 md:p-8 flex flex-col items-center"
        style={{ maxWidth: 450, background: "#090909" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-b-full" style={{ background: "#FF5D2E" }} />
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:-top-4 md:-right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-80 z-20"
          style={{ background: "#232526" }}
        >
          ✕
        </button>
        <h3 className="font-heading text-xl font-black uppercase tracking-tight text-white mb-1 mt-2">
          MIKE'S STORY
        </h3>
        <p className="text-white/40 text-sm mb-5">How Freedom Builderz Started</p>
        <video
          className="w-full rounded-xl"
          controls
          playsInline
          preload="auto"
          autoPlay
          style={{ maxHeight: "60vh" }}
        >
          <source src={STORY_VIDEO} type="video/mp4" />
        </video>
      </div>
    </div>
  );
};

export default BlueprintAboutMike;
$fb_17_tsx$,
  $fb_17_default_props${"headline":"WHO'S BEHIND THIS?","subheadline":"Watch Mike's Story @mikegbuilds WHO'S BEHIND THIS? I'm Mike Gonzalez , founder of Freedom Builderz.","cta_label":"setShowModal(true)} className=\"inline-flex items-center gap-2 text-sm font-medium hover:underline transition-colors cursor-pointer bg-transparent border-none text-white\" > Watch Mike's Story","bullets":[],"image_url":""}$fb_17_default_props$::jsonb,
  $fb_17_layout_signature$sticky-bar$fb_17_layout_signature$,
  $fb_17_source_type$extracted$fb_17_source_type$,
  $fb_17_source_reference${"file_path":"lead-magnet/freedom-builders-optin.md","heading":"BlueprintAboutMike.tsx","page_name":"Freedom Builders - Lead Magnet Opt-In","company":"Freedom Builders"}$fb_17_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_18_slug$lead-magnet-freedom-builders-optin-blueprintcredibility$fb_18_slug$,
  $fb_18_name$BlueprintCredibility$fb_18_name$,
  $fb_18_description$Freedom Builders BlueprintCredibility extracted from lead-magnet/freedom-builders-optin.md$fb_18_description$,
  $fb_18_category$stats$fb_18_category$,
  ARRAY[$fb_18_page_types_0$lead-magnet-optin$fb_18_page_types_0$, $fb_18_page_types_1$opt-in$fb_18_page_types_1$, $fb_18_page_types_2$lead-magnet$fb_18_page_types_2$]::text[],
  ARRAY[$fb_18_funnel_types_0$lead-magnet$fb_18_funnel_types_0$]::text[],
  $fb_18_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_18_slot_schema$::jsonb,
  ARRAY[$fb_18_theme_tokens_0$colors$fb_18_theme_tokens_0$, $fb_18_theme_tokens_1$font_heading$fb_18_theme_tokens_1$, $fb_18_theme_tokens_2$font_body$fb_18_theme_tokens_2$]::text[],
  $fb_18_asset_slots${}$fb_18_asset_slots$::jsonb,
  $fb_18_tsx$// __FB_SHIM_START__
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

// File: BlueprintCredibility.tsx


const stats = [
  { stat: "$500K+", desc: "Generated by a holistic health expert", niche: "Holistic Health" },
  { stat: "$200K", desc: "Launch for a healer's certification program", niche: "Healing & Certification" },
  { stat: "6 Weeks", desc: "Midwife's first course to six figures", niche: "Midwifery" },
  { stat: "$100K+", desc: "Wall Street trader, zero online presence — in 30 days", niche: "Finance & Trading" },
];

const BlueprintCredibility = () => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#121212" }}
    >
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-[0.03] pointer-events-none"
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <h2 className="font-heading text-2xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-14 leading-[0.95]">
          TRUSTED BY{" "}
          <span className="text-primary">150+</span>{" "}
          PROGRAM CREATORS
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-14">
          {stats.map((item, i) => (
            <div
              key={i}
              className="rounded-[20px] p-6 flex flex-col items-center gap-3 group hover:-translate-y-1 transition-transform duration-300"
              style={{
                background: "#232526",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="font-heading text-3xl md:text-4xl lg:text-5xl font-black text-primary">
                {item.stat}
              </span>
              <span className="text-muted-foreground text-xs md:text-sm leading-snug">
                {item.desc}
              </span>
              <span
                className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-full"
                style={{ background: "rgba(255, 93, 46, 0.1)", color: "hsl(14, 100%, 59%)" }}
              >
                {item.niche}
              </span>
            </div>
          ))}
        </div>

        <p className="text-foreground text-base md:text-lg max-w-2xl mx-auto">
          Different niches. Different backgrounds. Same starting point:{" "}
          <span className="text-primary font-bold">The Builderz Blueprint.</span>
        </p>
      </div>
    </section>
  );
};

export default BlueprintCredibility;
$fb_18_tsx$,
  $fb_18_default_props${"headline":"TRUSTED BY 150+ PROGRAM CREATORS","subheadline":"Different niches. Different backgrounds. Same starting point: The Builderz Blueprint.","cta_label":"","bullets":[],"image_url":""}$fb_18_default_props$::jsonb,
  $fb_18_layout_signature$split-2$fb_18_layout_signature$,
  $fb_18_source_type$extracted$fb_18_source_type$,
  $fb_18_source_reference${"file_path":"lead-magnet/freedom-builders-optin.md","heading":"BlueprintCredibility.tsx","page_name":"Freedom Builders - Lead Magnet Opt-In","company":"Freedom Builders"}$fb_18_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_19_slug$lead-magnet-freedom-builders-optin-blueprintform$fb_19_slug$,
  $fb_19_name$BlueprintForm$fb_19_name$,
  $fb_19_description$Freedom Builders BlueprintForm extracted from lead-magnet/freedom-builders-optin.md$fb_19_description$,
  $fb_19_category$form$fb_19_category$,
  ARRAY[$fb_19_page_types_0$lead-magnet-optin$fb_19_page_types_0$, $fb_19_page_types_1$opt-in$fb_19_page_types_1$, $fb_19_page_types_2$lead-magnet$fb_19_page_types_2$]::text[],
  ARRAY[$fb_19_funnel_types_0$lead-magnet$fb_19_funnel_types_0$]::text[],
  $fb_19_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_19_slot_schema$::jsonb,
  ARRAY[$fb_19_theme_tokens_0$colors$fb_19_theme_tokens_0$, $fb_19_theme_tokens_1$font_heading$fb_19_theme_tokens_1$, $fb_19_theme_tokens_2$font_body$fb_19_theme_tokens_2$]::text[],
  $fb_19_asset_slots${}$fb_19_asset_slots$::jsonb,
  $fb_19_tsx$// __FB_SHIM_START__
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

// File: BlueprintForm.tsx
import { forwardRef } from "react";
import { Lock } from "lucide-react";




const BlueprintForm = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <section
      className="relative py-16 md:py-24 px-4 overflow-hidden"
      style={{ background: "#090909" }}
    >
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -top-[30%] -left-[25%] w-[800px] h-[800px] object-cover opacity-[0.35] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 55%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 55%)",
        }}
      />
      <img
        src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
        alt=""
        className="absolute -bottom-[30%] -right-[25%] w-[800px] h-[800px] object-cover opacity-[0.35] pointer-events-none"
        style={{
          maskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 55%)",
          WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 55%)",
        }}
      />

      <div ref={ref} className="relative z-10 max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-5xl font-black uppercase tracking-tight text-foreground mb-3 leading-[0.95] text-center">
          GET THE BLUEPRINT —{" "}
          <span className="text-primary">FREE</span>
        </h2>

        <p className="text-muted-foreground text-base md:text-lg mb-12 max-w-md mx-auto text-center">
          Enter your info below and get instant access to the template + video
          walkthrough.
        </p>

        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">
          {/* Left: Form */}
          <div className="flex-1 w-full max-w-lg">
            <div
              className="rounded-[20px] p-8 md:p-10"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "0 0 80px rgba(255, 93, 46, 0.1)",
              }}
            >
              <div className="space-y-5">
                <div>
                  <label className="block text-muted-foreground text-sm mb-2 font-medium">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your full name"
                    className="w-full px-4 py-3.5 rounded-xl text-foreground placeholder:text-muted-foreground/50 text-base outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    style={{ background: "#232526", border: "1px solid #333" }}
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground text-sm mb-2 font-medium">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@email.com"
                    className="w-full px-4 py-3.5 rounded-xl text-foreground placeholder:text-muted-foreground/50 text-base outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    style={{ background: "#232526", border: "1px solid #333" }}
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground text-sm mb-2 font-medium">
                    Phone{" "}
                    <span className="text-muted-foreground/50 font-normal">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3.5 rounded-xl text-foreground placeholder:text-muted-foreground/50 text-base outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    style={{ background: "#232526", border: "1px solid #333" }}
                  />
                </div>

                <button
                  className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-[20px] hover:bg-primary/90 transition-all mt-2"
                  style={{ boxShadow: "0 0 40px rgba(255, 93, 46, 0.2)" }}
                >
                  SEND ME THE BLUEPRINT
                </button>

                <p className="text-muted-foreground text-xs text-center flex items-center justify-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  No spam. Unsubscribe anytime.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Blueprint mockup */}
          <div className="hidden lg:block shrink-0">
            <div className="relative">
              <div
                className="absolute inset-0 blur-[60px] opacity-25 rounded-[20px]"
                style={{ background: "hsl(14, 100%, 59%)" }}
              />
              <img
                src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
                alt="The Builderz Blueprint"
                className="relative w-[280px] rounded-[16px] rotate-[-2deg]"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

BlueprintForm.displayName = "BlueprintForm";

export default BlueprintForm;
$fb_19_tsx$,
  $fb_19_default_props${"headline":"GET THE BLUEPRINT — FREE","subheadline":"Enter your info below and get instant access to the template + video walkthrough.","cta_label":"SEND ME THE BLUEPRINT","bullets":[],"image_url":""}$fb_19_default_props$::jsonb,
  $fb_19_layout_signature$centered-stack$fb_19_layout_signature$,
  $fb_19_source_type$extracted$fb_19_source_type$,
  $fb_19_source_reference${"file_path":"lead-magnet/freedom-builders-optin.md","heading":"BlueprintForm.tsx","page_name":"Freedom Builders - Lead Magnet Opt-In","company":"Freedom Builders"}$fb_19_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
