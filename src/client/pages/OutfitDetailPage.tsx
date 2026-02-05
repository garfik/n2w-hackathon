import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { Skeleton } from '@components/ui/skeleton';
import { Button } from '@components/ui/button';

type Garment = { id: string; name: string; thumbnailUrl: string | null };
type OutfitDetail = {
  id: string;
  occasion: string;
  resultImageUrl: string | null;
  scoreJson: unknown;
  garments: Garment[];
};

export function OutfitDetailPage() {
  const { avatarId, outfitId } = useParams<{ avatarId: string; outfitId: string }>();
  const [outfit, setOutfit] = useState<OutfitDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!outfitId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/outfits/${outfitId}`, { credentials: 'include' });
        if (!res.ok) {
          if (res.status === 404) throw new Error('Outfit not found');
          throw new Error('Failed to load outfit');
        }
        const data = (await res.json()) as { success: boolean; data?: { outfit?: OutfitDetail } };
        if (!cancelled && data.data?.outfit) setOutfit(data.data.outfit);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [outfitId]);

  if (error) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive mb-4">{error}</p>
            <Button asChild variant="outline">
              <Link to={`/app/avatars/${avatarId}/outfits`}>Back to outfits</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!outfit) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreBreakdown =
    outfit.scoreJson && typeof outfit.scoreJson === 'object' && !Array.isArray(outfit.scoreJson)
      ? (outfit.scoreJson as Record<string, unknown>)
      : null;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">{outfit.occasion}</h1>
        <Button asChild variant="outline" size="sm">
          <Link to={`/app/avatars/${avatarId}/outfits`}>Back to outfits</Link>
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="garments">Garments</TabsTrigger>
          <TabsTrigger value="score">Score</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Try-on result</CardTitle>
              <CardDescription>Virtual try-on image when available.</CardDescription>
            </CardHeader>
            <CardContent>
              {outfit.resultImageUrl ? (
                <img
                  src={outfit.resultImageUrl}
                  alt="Try-on result"
                  className="rounded-lg border max-h-96 w-full object-contain"
                />
              ) : (
                <p className="text-muted-foreground text-sm">No try-on image yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="garments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Garments in this outfit</CardTitle>
              <CardDescription>{outfit.garments.length} item(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                {outfit.garments.map((g) => (
                  <div key={g.id} className="rounded-lg border overflow-hidden">
                    {g.thumbnailUrl ? (
                      <img src={g.thumbnailUrl} alt={g.name} className="h-32 w-full object-cover" />
                    ) : (
                      <div className="h-32 w-full bg-muted flex items-center justify-center text-muted-foreground text-sm">
                        No image
                      </div>
                    )}
                    <p className="p-2 font-medium truncate">{g.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="score" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Score breakdown</CardTitle>
              <CardDescription>Per-criterion scores when available.</CardDescription>
            </CardHeader>
            <CardContent>
              {scoreBreakdown && Object.keys(scoreBreakdown).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(scoreBreakdown).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
                    >
                      <span className="text-sm font-medium">{key}</span>
                      <Badge variant="secondary">
                        {typeof value === 'number' ? value.toFixed(2) : String(value)}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No score data yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
