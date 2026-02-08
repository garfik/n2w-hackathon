import { Outlet, Link, useLocation } from 'react-router-dom';
import { hasAvatarIds } from '@client/lib/avatarStorage';
import { Button } from '@components/ui/button';
import { Shirt, User, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export function AppLayout() {
  const location = useLocation();
  const isLanding = location.pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleGetStarted = () => {
    if (hasAvatarIds()) {
      return '/app/avatars';
    }
    return '/app/avatars/new';
  };

  const navBg = isLanding
    ? scrolled
      ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
      : 'bg-transparent border-b border-transparent'
    : 'bg-background/95 backdrop-blur-xl border-b border-border shadow-sm';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navBg}`}>
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground hover:opacity-80 transition-opacity"
          >
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <Shirt className="size-4 text-primary-foreground" />
            </div>
            <span className="hidden sm:inline">Nothing 2 Wear</span>
            <span className="sm:hidden">N2W</span>
          </Link>

          {/* Desktop nav links */}
          {!isLanding && (
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/app/avatars"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/app/avatars')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <User className="size-4" />
                  Avatars
                </span>
              </Link>
              <Link
                to="/app/garments"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/app/garments')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Shirt className="size-4" />
                  Garments
                </span>
              </Link>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isLanding ? (
              <Button asChild size="sm" className="rounded-full px-5">
                <Link to={handleGetStarted()}>Get Started</Link>
              </Button>
            ) : (
              <>
                {/* Mobile menu button */}
                <button
                  className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
                  onClick={() => setMobileOpen(!mobileOpen)}
                >
                  {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                </button>
              </>
            )}
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileOpen && !isLanding && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
              <Link
                to="/app/avatars"
                className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/app/avatars')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <User className="size-4" />
                  Avatars
                </span>
              </Link>
              <Link
                to="/app/garments"
                className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  location.pathname.startsWith('/app/garments')
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Shirt className="size-4" />
                  Garments
                </span>
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className={`flex-1 ${isLanding ? '' : 'container mx-auto p-4 sm:p-6 lg:p-8 pt-20'}`}>
        <div className={isLanding ? '' : 'mt-16'}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
