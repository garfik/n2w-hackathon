import { Outlet, Link } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <nav className="container mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="font-medium text-foreground hover:text-primary">
              Nothing 2 Wear
            </Link>
            <Link to="/app/avatars" className="text-sm text-muted-foreground hover:text-foreground">
              Avatars
            </Link>
            <Link
              to="/app/garments"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Garments
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1 container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
