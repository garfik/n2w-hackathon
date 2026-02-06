import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Button } from '@components/ui/button';
import { authClient } from '@client/lib/authClient';

export function AppLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card">
        <nav className="container mx-auto px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/app" className="font-medium text-foreground hover:text-primary">
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
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Log out
          </Button>
        </nav>
      </header>
      <main className="flex-1 container mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
