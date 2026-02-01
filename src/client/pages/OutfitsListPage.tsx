import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Badge } from "@components/ui/badge";
import { Skeleton } from "@components/ui/skeleton";

type Outfit = { id: string; occasion: string; createdAt: string };

export function OutfitsListPage() {
  const [outfits, setOutfits] = useState<Outfit[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/outfits", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load outfits");
        const data = (await res.json()) as { ok: boolean; outfits?: Outfit[] };
        if (!cancelled && data.outfits) setOutfits(data.outfits);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="max-w-2xl">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Outfits</h1>
        <Button asChild>
          <Link to="/app/outfits/new">New outfit</Link>
        </Button>
      </div>
      {outfits === null ? (
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
      ) : outfits.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No outfits yet</CardTitle>
            <CardDescription>Create an outfit by adding garments and choosing an occasion.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/app/outfits/new">New outfit</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {outfits.map((o) => (
            <Link key={o.id} to={`/app/outfits/${o.id}`}>
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
