import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Link, useLoaderData } from 'react-router-dom';
import { Button } from '@components/ui/button';

export function LandingPage() {
  const { loggedIn } = useLoaderData() as { loggedIn: boolean };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-2xl font-bold">Nothing 2 Wear</CardTitle>
          <CardDescription>
            Outfit suggestions and virtual try-on based on your avatar and wardrobe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {loggedIn ? (
            <Button asChild>
              <Link to="/app">Go to app</Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link to="/register">Register</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
