import { Link, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Skeleton } from '@components/ui/skeleton';
import { useAvatar, useOutfitsList } from '@client/lib/apiHooks';
import { Plus, Star, ImageIcon } from 'lucide-react';
import type { OutfitListItem } from '@client/lib/n2wApi';

function statusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'succeeded':
      return 'default';
    case 'running':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function verdictLabel(verdict: string | null) {
  switch (verdict) {
    case 'great':
      return {
        text: 'Great',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      };
    case 'ok':
      return {
        text: 'OK',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      };
    case 'not_recommended':
      return {
        text: 'Not Recommended',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };
    default:
      return null;
  }
}

function OutfitCard({ o, avatarId }: { o: OutfitListItem; avatarId: string }) {
  const verdict = verdictLabel(o.verdict);

  return (
    <Link to={`/app/avatars/${avatarId}/outfits/${o.id}`}>
      <Card className="transition-all hover:shadow-md hover:bg-muted/50 h-full">
        {/* Try-on image preview */}
        <div className="h-32 bg-muted/30 flex items-center justify-center overflow-hidden rounded-t-lg">
          {o.tryonImageUrl ? (
            <img
              src={o.tryonImageUrl}
              alt="Try-on preview"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
          )}
        </div>
        <CardHeader className="pb-2 pt-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base capitalize truncate">{o.occasion}</CardTitle>
            <Badge variant={statusBadgeVariant(o.status)} className="text-xs shrink-0">
              {o.status}
            </Badge>
          </div>
          <CardDescription className="text-xs">
            {new Date(o.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex items-center justify-between">
            {o.overall != null ? (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold text-sm">{o.overall}</span>
                {verdict && (
                  <Badge className={`text-xs ${verdict.className}`}>{verdict.text}</Badge>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">No score yet</span>
            )}
            {o.tryonStatus && (
              <Badge variant="outline" className="text-xs">
                tryon: {o.tryonStatus}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function OutfitsListPage() {
  const { avatarId } = useParams<{ avatarId: string }>();
  const { data: avatar } = useAvatar(avatarId);
  const { data: outfits, error, isPending } = useOutfitsList(avatarId);

  if (!avatarId) {
    return (
      <div className="max-w-2xl mx-auto">
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
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
          <Link to={`/app/avatars/${avatarId}/outfits/new`}>
            <Plus className="h-4 w-4 mr-2" />
            New outfit
          </Link>
        </Button>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="h-32 w-full rounded-t-lg" />
              <CardHeader className="pb-2">
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
              Create an outfit by selecting garments from your wardrobe and choosing an occasion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to={`/app/avatars/${avatarId}/outfits/new`}>
                <Plus className="h-4 w-4 mr-2" />
                New outfit
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {outfits.map((o) => (
            <OutfitCard key={o.id} o={o} avatarId={avatarId} />
          ))}
        </div>
      )}
    </div>
  );
}
