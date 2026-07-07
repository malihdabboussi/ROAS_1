INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_4_slug$ecommerce-product-ae1-product-page-finalcta$fb_4_slug$,
  $fb_4_name$FinalCTA$fb_4_name$,
  $fb_4_description$AE1 FinalCTA extracted from ecommerce-product/ae1-product-page.md$fb_4_description$,
  $fb_4_category$navigation$fb_4_category$,
  ARRAY[$fb_4_page_types_0$product$fb_4_page_types_0$, $fb_4_page_types_1$ecommerce-product$fb_4_page_types_1$]::text[],
  ARRAY[$fb_4_funnel_types_0$ecommerce-product$fb_4_funnel_types_0$]::text[],
  $fb_4_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_4_slot_schema$::jsonb,
  ARRAY[$fb_4_theme_tokens_0$colors$fb_4_theme_tokens_0$, $fb_4_theme_tokens_1$font_heading$fb_4_theme_tokens_1$, $fb_4_theme_tokens_2$font_body$fb_4_theme_tokens_2$]::text[],
  $fb_4_asset_slots${}$fb_4_asset_slots$::jsonb,
  $fb_4_tsx$// __FB_SHIM_START__
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

// File: FinalCTA.tsx
import { motion } from "framer-motion";



export const FinalCTA = () => {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Header */}
              <h3 className="text-3xl md:text-4xl font-black uppercase mb-6">
                3RD PARTY <span className="text-accent">TESTED</span>
              </h3>

              {/* Main Content */}
              <div className="space-y-4 text-base md:text-lg leading-relaxed">
                <p className="font-bold">
                  Train with confidence. Every batch of <span className="font-black">AE1 Rocket Fuel®</span> is tested and 
                  certified for quality, purity, and potency.
                </p>

                <p>
                  This means zero banned substances, no compromises and total trust in every scoop. 
                  If it doesn't pass rigorous testing, it doesn't make it to you.
                </p>

                <p className="font-bold text-lg md:text-xl mt-6">
                  We don't just claim purity... we prove it.
                </p>

                <p>
                  We rigorously test for label accuracy, heavy metals, microbial contaminants, 
                  and overall quality. That's science-backed performance, backed by real data.
                </p>

                <p className="font-black text-xl md:text-2xl text-accent mt-8">
                  Stop settling for average.
                </p>

                <p className="text-base">
                  Your body is either building or breaking down. There's no middle ground. Every day 
                  you wait is another day of suboptimal testosterone, weak energy, and fertility decline.
                </p>

                <p className="font-bold text-lg">
                  Most guys will keep making excuses. Are you most guys?
                </p>
              </div>

              {/* CTA Button */}
              <div className="pt-6">
                <Button
                  size="lg"
                  className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-xl px-12 py-6 shadow-glow mb-4"
                >
                  GET THE POWDER + CAPSULE COMBO
                </Button>

              </div>
            </motion.div>

            {/* Right Column - Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="rounded-lg overflow-hidden shadow-strong">
                <img
                  src={'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset'}
                  alt="AE1 Rocket Fuel Results"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
$fb_4_tsx$,
  $fb_4_default_props${"headline":"Replace this headline","subheadline":"Train with confidence. Every batch of AE1 Rocket Fuel® is tested and certified for quality, purity, and potency.","cta_label":"GET THE POWDER + CAPSULE COMBO","bullets":[],"image_url":""}$fb_4_default_props$::jsonb,
  $fb_4_layout_signature$split-2$fb_4_layout_signature$,
  $fb_4_source_type$extracted$fb_4_source_type$,
  $fb_4_source_reference${"file_path":"ecommerce-product/ae1-product-page.md","heading":"","page_name":"AE1 - Product Page","company":"AE1"}$fb_4_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_5_slug$ecommerce-product-ae1-product-page-hero$fb_5_slug$,
  $fb_5_name$Hero$fb_5_name$,
  $fb_5_description$AE1 Hero extracted from ecommerce-product/ae1-product-page.md$fb_5_description$,
  $fb_5_category$hero$fb_5_category$,
  ARRAY[$fb_5_page_types_0$product$fb_5_page_types_0$, $fb_5_page_types_1$ecommerce-product$fb_5_page_types_1$]::text[],
  ARRAY[$fb_5_funnel_types_0$ecommerce-product$fb_5_funnel_types_0$]::text[],
  $fb_5_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_5_slot_schema$::jsonb,
  ARRAY[$fb_5_theme_tokens_0$colors$fb_5_theme_tokens_0$, $fb_5_theme_tokens_1$font_heading$fb_5_theme_tokens_1$, $fb_5_theme_tokens_2$font_body$fb_5_theme_tokens_2$]::text[],
  $fb_5_asset_slots${}$fb_5_asset_slots$::jsonb,
  $fb_5_tsx$// __FB_SHIM_START__
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

// File: Hero.tsx
import { motion } from "framer-motion";









import { Check, Star, Award, Package, Shield, ChevronRight } from "lucide-react";
import { useState } from "react";


const productImages = [
  { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "AE1 Rocket Fuel Powder & Capsules Combo" },
  { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "AE1 Rocket Fuel Capsules" },
  { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "AE1 Rocket Fuel Lifestyle - Training" },
  { src: 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset', alt: "AE1 Rocket Fuel with Shaker" },
];

const trustBadges = [
  { icon: Award, label: "70+ Clinical Ingredients" },
  { icon: Shield, label: "3rd Party Tested" },
  { icon: Package, label: "Free Shipping" },
];

export const Hero = () => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [purchaseType, setPurchaseType] = useState("subscribe");
  const { addItem } = useCart();

  const handleAddToCart = () => {
    const currentImage = purchaseType === "onetime" && selectedImage === 0 ? 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset' : productImages[selectedImage].src;
    
    addItem({
      id: `ae1-rocket-fuel-${purchaseType}`,
      name: "AE1 Rocket Fuel® - Premium Powder + Pill Combo",
      price: purchaseType === "subscribe" ? 129 : 197,
      type: purchaseType as "onetime" | "subscribe",
      image: currentImage,
    });
  };

  return (
    <section id="hero" className="bg-background py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 max-w-7xl mx-auto">
          {/* Left Column - Product Images */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            <div className="bg-muted rounded-lg overflow-hidden">
              <img
                src={purchaseType === "onetime" && selectedImage === 0 ? 'https://placehold.co/1280x720/0f1116/9ca3af?text=Asset' : productImages[selectedImage].src}
                alt={purchaseType === "onetime" && selectedImage === 0 ? "AE1 Rocket Fuel One-Time Purchase" : productImages[selectedImage].alt}
                className="w-full h-auto"
              />
            </div>

            {/* Thumbnails */}
            <div className="grid grid-cols-4 gap-2 md:gap-3">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative rounded-lg overflow-hidden border-2 transition-all touch-manipulation ${
                    selectedImage === index
                      ? "border-accent"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-16 md:h-24 object-cover"
                  />
                </button>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-2 md:gap-4 pt-4 md:pt-6 border-t border-border">
              {trustBadges.map((badge, index) => {
                const Icon = badge.icon;
                return (
                  <div key={index} className="flex flex-col items-center text-center">
                    <div className="bg-accent/10 rounded-full p-2 md:p-3 mb-2">
                      <Icon className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                    </div>
                    <p className="text-[10px] md:text-xs font-medium leading-tight">{badge.label}</p>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Right Column - Product Details */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Trust Badge */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                ))}
              </div>
              <span className="text-sm font-medium">
                Premium Clinical Grade Formula
              </span>
            </div>

            {/* Product Title */}
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-5xl font-black leading-tight mb-2">
                AE1 Rocket Fuel®
              </h1>
              <p className="text-lg md:text-xl font-bold text-accent">
                PREMIUM POWDER + PILL COMBO
              </p>
            </div>

            {/* Flavor Selection */}
            <div>
              <p className="text-sm font-medium mb-2">Flavor</p>
              <Badge className="bg-secondary text-secondary-foreground border-accent border-2 px-4 py-2">
                🌶️ Spicy Watermelon
              </Badge>
            </div>

            {/* Purchase Options */}
            <div className="space-y-3">
              <RadioGroup value={purchaseType} onValueChange={setPurchaseType}>
                {/* One-time Purchase */}
                <div
                  className={`border-2 rounded-lg p-3 md:p-4 cursor-pointer transition-all touch-manipulation ${
                    purchaseType === "onetime"
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                  onClick={() => setPurchaseType("onetime")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3">
                      <RadioGroupItem value="onetime" id="onetime" />
                      <div>
                        <Label htmlFor="onetime" className="font-bold cursor-pointer text-sm md:text-base">
                          Buy one time
                        </Label>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          Includes free shaker
                        </p>
                      </div>
                    </div>
                    <span className="text-lg md:text-xl font-black">$197</span>
                  </div>
                </div>

                {/* Subscribe & Save */}
                <div
                  className={`border-2 rounded-lg p-3 md:p-4 cursor-pointer transition-all touch-manipulation ${
                    purchaseType === "subscribe"
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                  onClick={() => setPurchaseType("subscribe")}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="subscribe" id="subscribe" />
                      <div>
                        <Label
                          htmlFor="subscribe"
                          className="font-bold cursor-pointer flex items-center gap-2"
                        >
                          Subscribe & Save
                          <Badge className="bg-accent text-accent-foreground text-xs">
                            BEST VALUE
                          </Badge>
                        </Label>
                        <p className="text-xl font-black">
                          $129<span className="text-sm font-normal">/mo</span>
                          <span className="text-base line-through text-muted-foreground ml-2">
                            $197
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pl-9">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>Free shipping delivered every 30 days</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>Free Travel Capsules Bottle</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>Free Welcome Kit* with Scoop, and Shaker</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>Easily edit, skip, or cancel anytime</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-accent shrink-0" />
                      <span>90-Day Money Back Guarantee</span>
                    </div>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Add to Cart Button */}
            <Button
              size="lg"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-bold text-lg py-6 shadow-glow"
              onClick={handleAddToCart}
            >
              Add to Cart
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>

            {/* View Supplement Facts */}
            <Button
              variant="outline"
              size="lg"
              className="w-full font-bold border-2"
              onClick={() => {
                const element = document.getElementById("ingredients");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              View Supplement Facts
            </Button>

            {/* Key Benefits */}
            <div className="pt-4 border-t border-border">
              <h3 className="font-bold text-lg mb-3">What You Get:</h3>
              <div className="space-y-2">
                {[
                  "70+ clinical-grade ingredients at upper daily limits",
                  "62g monster scoop with research-backed compounds",
                  "Enhance circulation, energy, and mitochondrial function",
                  "Support longevity markers and reduce inflammation",
                  "Boost testosterone, libido, and alpha-male performance",
                ].map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm leading-relaxed">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
$fb_5_tsx$,
  $fb_5_default_props${"headline":"AE1 Rocket Fuel®","subheadline":"PREMIUM POWDER + PILL COMBO","cta_label":"setSelectedImage(index)} className= `} >","bullets":[],"image_url":""}$fb_5_default_props$::jsonb,
  $fb_5_layout_signature$grid-3$fb_5_layout_signature$,
  $fb_5_source_type$extracted$fb_5_source_type$,
  $fb_5_source_reference${"file_path":"ecommerce-product/ae1-product-page.md","heading":"","page_name":"AE1 - Product Page","company":"AE1"}$fb_5_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_6_slug$ecommerce-product-ae1-product-page-index$fb_6_slug$,
  $fb_6_name$Index$fb_6_name$,
  $fb_6_description$AE1 Index extracted from ecommerce-product/ae1-product-page.md$fb_6_description$,
  $fb_6_category$hero$fb_6_category$,
  ARRAY[$fb_6_page_types_0$product$fb_6_page_types_0$, $fb_6_page_types_1$ecommerce-product$fb_6_page_types_1$]::text[],
  ARRAY[$fb_6_funnel_types_0$ecommerce-product$fb_6_funnel_types_0$]::text[],
  $fb_6_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_6_slot_schema$::jsonb,
  ARRAY[$fb_6_theme_tokens_0$colors$fb_6_theme_tokens_0$, $fb_6_theme_tokens_1$font_heading$fb_6_theme_tokens_1$, $fb_6_theme_tokens_2$font_body$fb_6_theme_tokens_2$]::text[],
  $fb_6_asset_slots${}$fb_6_asset_slots$::jsonb,
  $fb_6_tsx$// __FB_SHIM_START__
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

// File: Index.tsx















const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <ComparisonTable />
      <IngredientOverview />
      <ResearchBacked />
      <ClinicalIngredients />
      <HowItWorks />
      <AE1Difference />
      <FinalCTA />
      <FAQ />
      <Footer />
    </div>
  );
};

export default Index;
$fb_6_tsx$,
  $fb_6_default_props${"headline":"Replace this headline","subheadline":"","cta_label":"","bullets":[],"image_url":""}$fb_6_default_props$::jsonb,
  $fb_6_layout_signature$section$fb_6_layout_signature$,
  $fb_6_source_type$extracted$fb_6_source_type$,
  $fb_6_source_reference${"file_path":"ecommerce-product/ae1-product-page.md","heading":"","page_name":"AE1 - Product Page","company":"AE1"}$fb_6_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
INSERT INTO public.funnel_blocks (
  slug, name, description, category, page_types, funnel_types, slot_schema,
  theme_tokens, asset_slots, tsx_template, default_props, layout_signature,
  source_type, source_reference, is_system, quality_status, is_published
) VALUES (
  $fb_7_slug$general-home-page-anson-park-home-index$fb_7_slug$,
  $fb_7_name$Index$fb_7_name$,
  $fb_7_description$Anson Park Investing Index extracted from general-home-page/anson-park-home.md$fb_7_description$,
  $fb_7_category$hero$fb_7_category$,
  ARRAY[$fb_7_page_types_0$home$fb_7_page_types_0$, $fb_7_page_types_1$general-home-page$fb_7_page_types_1$]::text[],
  ARRAY[$fb_7_funnel_types_0$general-home-page$fb_7_funnel_types_0$]::text[],
  $fb_7_slot_schema${"headline":{"type":"string","max":90,"required":true},"subheadline":{"type":"string","max":220,"required":false},"cta_label":{"type":"string","max":32,"required":false}}$fb_7_slot_schema$::jsonb,
  ARRAY[$fb_7_theme_tokens_0$colors$fb_7_theme_tokens_0$, $fb_7_theme_tokens_1$font_heading$fb_7_theme_tokens_1$, $fb_7_theme_tokens_2$font_body$fb_7_theme_tokens_2$]::text[],
  $fb_7_asset_slots${}$fb_7_asset_slots$::jsonb,
  $fb_7_tsx$// __FB_SHIM_START__
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

// File: Index.tsx
import { useState, useEffect } from "react";












import { ArrowRight, TrendingUp, Shield, Lock } from "lucide-react";


const Index = () => {
  const [bookCallOpen, setBookCallOpen] = useState(false);
  const [propertyAccessOpen, setPropertyAccessOpen] = useState(false);
  const [exitIntentOpen, setExitIntentOpen] = useState(false);
  const [hasShownExitIntent, setHasShownExitIntent] = useState(false);
  const navigate = useNavigate();

  // Exit intent detection
  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShownExitIntent) {
        setExitIntentOpen(true);
        setHasShownExitIntent(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShownExitIntent]);

  return (
    <main className="min-h-screen">
      <Navigation 
        variant="home"
        onUnlockDetails={() => setPropertyAccessOpen(true)}
      />
      <Hero 
        onBookCall={() => setBookCallOpen(true)}
        onUnlockDetails={() => setPropertyAccessOpen(true)}
      />
      
      <div className="container mx-auto px-4 py-24 space-y-32">
        {/* Deal Summary */}
        <section id="deal-summary" className="max-w-6xl mx-auto scroll-mt-24">
          <div className="text-center mb-20 animate-fade-in">
            <div className="inline-block">
              <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight">Deal Summary</h2>
              <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent mt-4 rounded-full" />
            </div>
            <p className="text-xl text-muted-foreground font-medium mt-6">
              A compelling investment opportunity with exceptional returns
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10 animate-slide-up">
            <Card className="p-12 bg-white border-2 border-primary/10 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl">
              <h3 className="font-serif text-3xl font-bold mb-10 flex items-center gap-4 text-primary">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                Investment Terms
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Minimum Investment", value: "$100,000" },
                  { label: "Hold Period", value: "5 Years" },
                  { label: "Preferred Return", value: "6%", highlight: true }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center pb-6 border-b border-border">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className={`font-bold text-2xl ${item.highlight ? 'text-accent' : 'text-foreground'}`}>{item.value}</span>
                  </div>
                ))}
                
                {/* Blurred locked items */}
                <div 
                  onClick={() => setPropertyAccessOpen(true)}
                  className="space-y-6 cursor-pointer transition-all duration-300 select-none"
                >
                  {[
                    { label: "Equity Split" },
                    { label: "Distribution Timing" }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center pb-6 border-b border-border last:border-0 last:pb-0">
                      <span className="text-muted-foreground font-medium blur-[6px]">{item.label}</span>
                      <span className="font-bold text-lg text-accent hover:text-accent-light transition-colors flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Unlock
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="p-12 bg-gradient-to-br from-accent/10 to-accent/20 border-2 border-accent/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] rounded-2xl">
              <h3 className="font-serif text-3xl font-bold mb-10 flex items-center gap-4 text-primary">
                <div className="p-3 bg-accent/30 rounded-xl">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                Projected Returns
              </h3>
              <div className="space-y-6">
                {[
                  { label: "Total ROI", value: "2.3X" },
                  { label: "Average Annual Return", value: "27%" },
                  { label: "IRR", value: "21%+" }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center pb-6 border-b border-border">
                    <span className="text-muted-foreground font-medium">{item.label}</span>
                    <span className="font-bold text-2xl text-accent">{item.value}</span>
                  </div>
                ))}
                
                {/* Blurred locked items */}
                <div 
                  onClick={() => setPropertyAccessOpen(true)}
                  className="space-y-6 cursor-pointer transition-all duration-300 select-none"
                >
                  {[
                    { label: "Cash-on-Cash Return" },
                    { label: "Exit Cap Rate" }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center pb-6 border-b border-border last:border-0 last:pb-0">
                      <span className="text-muted-foreground font-medium blur-[6px]">{item.label}</span>
                      <span className="font-bold text-lg text-accent hover:text-accent-light transition-colors flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        Unlock
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <PropertyGallerySection onSeeAllPhotos={() => setPropertyAccessOpen(true)} />

        <div id="location" className="scroll-mt-24">
          <WhyAbilene onUnlockDetails={() => setPropertyAccessOpen(true)} />
        </div>
        
        <StargateSection />

        <div id="team">
          <TeamSection />
        </div>

        {/* Why This Deal Stands Out */}
        <section id="contact" className="max-w-5xl mx-auto scroll-mt-24 animate-fade-in">
          <div className="p-16 md:p-20 text-white shadow-luxury rounded-3xl relative overflow-hidden border-2 border-accent/30" style={{ background: 'linear-gradient(135deg, hsl(200 50% 12%) 0%, hsl(200 45% 20%) 100%)' }}>
            <div className="relative z-10">
              <div className="text-center mb-10">
                <h2 className="font-serif text-5xl md:text-6xl font-bold tracking-tight text-white inline-block">
                  Why This Deal Stands Out
                </h2>
                <div className="h-1 bg-gradient-to-r from-transparent via-accent to-transparent mt-4 rounded-full max-w-md mx-auto" />
              </div>
              <div className="space-y-6 text-lg md:text-xl leading-relaxed mb-10">
                <p className="text-white">
                  By combining <strong className="text-accent">projected 21%+ average annual returns</strong>, proximity (<strong className="text-accent">2.4 miles</strong>) to the Stargate campus, and Abilene's powerful fundamentals—we believe this project is uniquely positioned to deliver both stability and upside.
                </p>
                <p className="text-white">
                  If you'd like the full offering memorandum (with pro formas, LIHTC/QC details, and Stargate market comps), we'd be happy to walk you through the numbers directly.
                </p>
              </div>
              <div className="flex flex-col gap-4 items-stretch pt-4 px-4 sm:px-0">
                <Button 
                  size="lg"
                  onClick={() => setPropertyAccessOpen(true)}
                  className="bg-accent hover:bg-accent-light text-primary-dark font-bold text-xs sm:text-base md:text-xl px-4 sm:px-8 md:px-12 py-3 sm:py-6 md:py-8 shadow-2xl hover:shadow-glow rounded-xl hover:scale-105 transition-all duration-300 border-0 w-full whitespace-normal leading-tight"
                >
                  Request Full Memorandum
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <Button 
                  size="lg"
                  onClick={() => setBookCallOpen(true)}
                  variant="outline"
                  className="bg-white/10 hover:bg-white/90 text-white hover:text-primary border-2 border-white/50 hover:border-white/70 font-semibold text-xs sm:text-base md:text-xl px-4 sm:px-8 md:px-12 py-3 sm:py-6 md:py-8 rounded-xl backdrop-blur-xl transition-all duration-300 hover:scale-105 w-full whitespace-normal leading-tight"
                >
                  Book a Call to Talk With Us
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Footer />
      <BookCallDialog open={bookCallOpen} onOpenChange={setBookCallOpen} />
      <PropertyAccessDialog open={propertyAccessOpen} onOpenChange={setPropertyAccessOpen} />
      <ExitIntentDialog open={exitIntentOpen} onOpenChange={setExitIntentOpen} />
    </main>
  );
};

export default Index;
$fb_7_tsx$,
  $fb_7_default_props${"headline":"Deal Summary","subheadline":"A compelling investment opportunity with exceptional returns","cta_label":"setPropertyAccessOpen(true)} className=\"bg-accent hover:bg-accent-light text-primary-dark font-bold text-xs sm:text-base md:text-xl px-4 sm:px-8 md:px-12 py-3 sm:py-6 md:py-8 shadow-2xl hover:shadow-glow rounded-xl hover:scale-105 transition-all duration-300 border-0 w-full whitespace-normal leading-tight\" > Request Full Memorandum","bullets":[],"image_url":""}$fb_7_default_props$::jsonb,
  $fb_7_layout_signature$split-2$fb_7_layout_signature$,
  $fb_7_source_type$extracted$fb_7_source_type$,
  $fb_7_source_reference${"file_path":"general-home-page/anson-park-home.md","heading":"","page_name":"Anson Park - Home Page","company":"Anson Park Investing"}$fb_7_source_reference$::jsonb,
  true, 'draft', false
) ON CONFLICT DO NOTHING;
