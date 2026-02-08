import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { hasAvatarIds } from '@client/lib/avatarStorage';
import {
  Camera,
  Shirt,
  Sparkles,
  ArrowRight,
  Upload,
  Palette,
  Layers,
  Eye,
  CheckCircle,
  Smartphone,
  Monitor,
} from 'lucide-react';

export function LandingPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    if (hasAvatarIds()) {
      navigate('/app/avatars');
    } else {
      navigate('/app/avatars/new');
    }
  };

  const hasAvatar = hasAvatarIds();

  return (
    <div className="flex flex-col min-h-screen">
      {/* ========== HERO ========== */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28 lg:pt-48 lg:pb-36">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-linear-to-b from-primary/5 via-primary/3 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-linear-to-bl from-primary/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-4xl">
          <Badge
            variant="secondary"
            className="mb-6 px-4 py-1.5 text-xs font-semibold tracking-widest uppercase rounded-full"
          >
            <Sparkles className="size-3 mr-1.5" />
            AI-Powered Style Assistant
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
            Get dressed
            <br />
            <span className="bg-linear-to-r from-foreground via-foreground/80 to-foreground/60 bg-clip-text text-transparent">
              without leaving the couch.
            </span>
          </h1>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={handleStart}
              className="rounded-full px-8 h-12 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              {hasAvatar ? 'Go to My Avatars' : 'Get Started Free'}
              <ArrowRight className="size-4 ml-1" />
            </Button>
            <p className="text-sm text-muted-foreground">No sign-up required.</p>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 px-3 py-1 text-xs font-semibold tracking-widest uppercase rounded-full"
            >
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Three steps to your perfect look
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              From photo to styled outfits in under a minute. No apps, no downloads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <StepCard
              step={1}
              icon={<Camera className="size-6" />}
              title="Upload Your Photo"
              description="Take a full-body photo or pick one from your gallery. Our AI creates your digital twin instantly."
            />

            <StepCard
              step={2}
              icon={<Shirt className="size-6" />}
              title="Add Clothes"
              description="Add any clothes - from your closet or just make a screenshot from a store. AI auto-detects type, color and style."
            />

            <StepCard
              step={3}
              icon={<Sparkles className="size-6" />}
              title="See the Result"
              description="Build outfits and preview them on your avatar. Get AI scoring for fit, color harmony and style."
            />
          </div>
        </div>
      </section>

      {/* ========== FEATURES ========== */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="text-center mb-16">
            <Badge
              variant="outline"
              className="mb-4 px-3 py-1 text-xs font-semibold tracking-widest uppercase rounded-full"
            >
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Everything you need to style smarter
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Upload className="size-5" />}
              title="Instant Capture"
              description="Snap a photo of any garment. AI isolates the item and recognizes material, color, and category instantly."
            />
            <FeatureCard
              icon={<Eye className="size-5" />}
              title="Virtual Try-On"
              description="See exactly how clothes look on your body before buying. No more guesswork at the checkout."
            />
            <FeatureCard
              icon={<Palette className="size-5" />}
              title="Color Analysis"
              description="AI evaluates color combinations and suggests palettes that complement your skin tone and style."
            />
            <FeatureCard
              icon={<Layers className="size-5" />}
              title="Mix & Match"
              description="Combine existing wardrobe pieces with potential new buys. See complete outfits instantly."
            />
            <FeatureCard
              icon={<Smartphone className="size-5" />}
              title="Works Everywhere"
              description="Fully responsive. Use on your phone while shopping or on desktop while browsing online stores."
            />
            <FeatureCard
              icon={<Monitor className="size-5" />}
              title="No Installation"
              description="Runs entirely in your browser. No app downloads, no sign-ups. Start instantly."
            />
          </div>
        </div>
      </section>

      {/* ========== USE CASES ========== */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
              Built for real life
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Whether you&apos;re shopping online, standing in a store, or just cleaning out your
              closet.
            </p>
          </div>

          <div className="space-y-4">
            <UseCaseItem
              emoji="🛍"
              title="Shopping online?"
              description="Test how that jacket will look on you before clicking 'Buy'. No more returns."
            />
            <UseCaseItem
              emoji="👗"
              title="Building a capsule wardrobe?"
              description="See which pieces work together. Maximize outfits, minimize clutter."
            />
            <UseCaseItem
              emoji="🎒"
              title="Packing for a trip?"
              description="Plan your travel outfits in advance. Every piece earns its spot in the suitcase."
            />
            <UseCaseItem
              emoji="🪞"
              title="Getting dressed for an event?"
              description="Compare outfit options side by side. Walk in with confidence."
            />
          </div>
        </div>
      </section>

      {/* ========== CTA ========== */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            {hasAvatar ? 'Welcome back!' : 'Ready to try it?'}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            {hasAvatar
              ? 'Your avatar is waiting. Jump back in and keep building outfits.'
              : 'Start in 30 seconds. Upload a photo, add some clothes, and let AI do the styling.'}
          </p>
          <div className="mt-8">
            <Button
              size="lg"
              onClick={handleStart}
              className="rounded-full px-10 h-13 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              {hasAvatar ? 'Continue Styling' : "Start Now — It's Free"}
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
          {!hasAvatar && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-green-600" />
                No sign-up
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-green-600" />
                No downloads
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="size-4 text-green-600" />
                100% private
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-semibold text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="size-6 rounded-md bg-primary flex items-center justify-center">
              <Shirt className="size-3 text-primary-foreground" />
            </div>
            Nothing 2 Wear
          </Link>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Nothing 2 Wear. Built with AI.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* ── Step Card ───────────────────────────────────── */
function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex flex-col items-center text-center group">
      {/* Step number */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[120px] font-extrabold text-muted/40 leading-none select-none pointer-events-none -z-10 opacity-60">
        {step}
      </div>
      {/* Icon */}
      <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-5 group-hover:bg-primary/15 transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">{description}</p>
    </div>
  );
}

/* ── Feature Card ────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border border-border/60 bg-card p-6 hover:border-border hover:shadow-sm transition-all">
      <div className="size-10 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <h3 className="font-semibold mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

/* ── Use Case Item ───────────────────────────────── */
function UseCaseItem({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-border/60 bg-card p-5 hover:border-border hover:shadow-sm transition-all">
      <span className="text-2xl shrink-0 mt-0.5">{emoji}</span>
      <div>
        <h3 className="font-semibold mb-0.5">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
