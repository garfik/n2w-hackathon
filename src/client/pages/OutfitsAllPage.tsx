import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import { Skeleton } from '@components/ui/skeleton';
import { Plus, Star, ImageIcon } from 'lucide-react';
import { useAvatars } from '@client/lib/useAvatars';
import { useOutfitsByAvatars } from '@client/lib/apiHooks';
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
        <div className="h-32 bg-muted/30 flex items-center justify-center overflow-hidden rounded-t-lg">
          {o.tryonImageUrl ? (
            <img
              src={o.tryonImageUrl}
              alt="Try-on preview"
              className="h-full w-full object-contain"
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

export function OutfitsAllPage() {
  const { avatars, isPending: avatarsPending, isEmpty } = useAvatars();
  const avatarIds = avatars.map((a) => a.id);

  const {
    data: groups,
    isPending: outfitsPending,
    error,
  } = useOutfitsByAvatars(avatarIds.length ? avatarIds : undefined);

  if (avatarsPending || outfitsPending) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">All outfits</h1>
        </div>
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
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>No avatars yet</CardTitle>
            <CardDescription>Create an avatar first to start generating outfits.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/app/avatars/new">
                <Plus className="h-4 w-4 mr-2" />
                New avatar
              </Link>
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

  const hasOutfits = groups?.some((g) => g.outfits.length > 0);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">All outfits</h1>
          <p className="text-sm text-muted-foreground">
            Browse outfits generated for <Link to="/app/avatars">all your avatars</Link>.
          </p>
        </div>
      </div>

      {!hasOutfits ? (
        <Card>
          <CardHeader>
            <CardTitle>No outfits yet</CardTitle>
            <CardDescription>
              Create outfits from each avatar page. They will appear here automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/app/avatars">
                <Plus className="h-4 w-4 mr-2" />
                Go to avatars
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groups?.map((group) => {
            const avatar = avatars.find((a) => a.id === group.avatarId);
            if (!group.outfits.length) return null;
            return (
              <section key={group.avatarId} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">
                      {avatar?.name ?? 'Avatar'}{' '}
                      <span className="text-muted-foreground text-sm">
                        ({group.outfits.length})
                      </span>
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      <Link
                        to={`/app/avatars/${group.avatarId}/outfits`}
                        className="text-primary hover:underline"
                      >
                        Open avatar outfits
                      </Link>
                    </p>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/app/avatars/${group.avatarId}/outfits/new`}>
                      <Plus className="h-3 w-3 mr-1" />
                      New outfit
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.outfits.map((o) => (
                    <OutfitCard key={o.id} o={o} avatarId={group.avatarId} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
