import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Skeleton } from '@components/ui/skeleton';
import { useAvatar, useOutfitsList } from '@client/lib/apiHooks';

export function OutfitsListPage() {
  const { avatarId } = useParams<{ avatarId: string }>();
  const { data: avatar } = useAvatar(avatarId);
  const { data: outfits, error, isPending } = useOutfitsList(avatarId);

  if (!avatarId) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>No avatar selected</CardTitle>
            <CardDescription>Please select an avatar first to view outfits.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/app/avatars">Select avatar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Outfits</h1>
          {avatar && (
            <p className="text-sm text-muted-foreground">
              For avatar: <span className="font-medium">{avatar.name}</span>
              {' · '}
              <Link to="/app/avatars" className="text-primary hover:underline">
                Change
              </Link>
              {' · '}
              <Link to={`/app/avatars/${avatarId}/edit`} className="text-primary hover:underline">
                Edit
              </Link>
            </p>
          )}
        </div>
        <Button asChild>
          <Link to={`/app/avatars/${avatarId}/outfits/new`}>New outfit</Link>
        </Button>
      </div>
      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !outfits?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No outfits yet</CardTitle>
            <CardDescription>
              Create an outfit by adding garments and choosing an occasion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={`/app/avatars/${avatarId}/outfits/new`}>New outfit</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {outfits.map((o) => (
            <Link key={o.id} to={`/app/avatars/${avatarId}/outfits/${o.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-lg">{o.occasion}</CardTitle>
                  <Badge variant="secondary">{new Date(o.createdAt).toLocaleDateString()}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">View details</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
