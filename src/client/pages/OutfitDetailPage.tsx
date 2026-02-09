import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Skeleton } from '@components/ui/skeleton';
import { Button } from '@components/ui/button';
import { Progress } from '@components/ui/progress';
import { useOutfit, useGenerateScore, useGenerateTryon } from '@client/lib/apiHooks';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  AlertCircle,
  Star,
  Sparkles,
  ImageIcon,
} from 'lucide-react';

type OutfitScore = {
  scores: {
    fit_balance: number;
    proportions: number;
    color_harmony: number;
    occasion_match: number;
    season_material: number;
    overall: number;
  };
  verdict: 'great' | 'ok' | 'not_recommended';
  why: string[];
  improvements: string[];
  alternatives: string[];
};

function verdictColor(verdict: string) {
  switch (verdict) {
    case 'great':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'ok':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'not_recommended':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    default:
      return '';
  }
}

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

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/100</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

export function OutfitDetailPage() {
  const { avatarId, outfitId } = useParams<{ avatarId: string; outfitId: string }>();
  const { data: outfit, error, isPending, refetch } = useOutfit(outfitId);
  const scoreMutation = useGenerateScore();
  const tryonMutation = useGenerateTryon();

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertCircle className="h-5 w-5" />
              <p>{error.message}</p>
            </div>
            <Button asChild variant="outline">
              <Link to={`/app/avatars/${avatarId}/outfits`}>Back to outfits</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPending || !outfit) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
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

  const score = outfit.scoreJson as OutfitScore | null;

  const handleGenerateScore = () => {
    if (outfitId) {
      scoreMutation.mutate(outfitId, {
        onSuccess: () => refetch(),
      });
    }
  };

  const handleGenerateTryon = () => {
    if (outfitId) {
      tryonMutation.mutate(outfitId, {
        onSuccess: () => refetch(),
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/app/avatars/${avatarId}/outfits`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold capitalize">{outfit.occasion}</h1>
            <p className="text-sm text-muted-foreground">
              Created {new Date(outfit.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge variant={statusBadgeVariant(outfit.status)}>{outfit.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Garments card with vertical list */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Garments ({outfit.garments.length})
            </CardTitle>
            <CardDescription>Items in this outfit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {outfit.garments.map((g) => (
                <Link
                  key={g.id}
                  to={`/app/garments/${g.id}`}
                  className="flex items-center gap-3 rounded-lg border p-2 hover:shadow-md transition-shadow"
                >
                  <div className="h-16 w-16 shrink-0 rounded-md overflow-hidden bg-muted/50">
                    {g.thumbnailUrl ? (
                      <img
                        src={g.thumbnailUrl}
                        alt={g.name ?? 'Garment'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{g.name ?? 'Unnamed'}</p>
                    {g.category && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {g.category}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Right: Try-on on top, Score below */}
        <div className="flex flex-col gap-6">
          {/* Try-on card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Virtual Try-on
              </CardTitle>
              <CardDescription>See how this outfit looks on your avatar</CardDescription>
            </CardHeader>
            <CardContent>
              {!outfit.tryon ? (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">No try-on data available yet.</p>
                  <Button onClick={handleGenerateTryon} disabled={tryonMutation.isPending}>
                    {tryonMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Generate Try-on
                      </>
                    )}
                  </Button>
                </div>
              ) : outfit.tryon.status === 'running' || tryonMutation.isPending ? (
                <div className="space-y-4 py-8">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p>Generating try-on image...</p>
                  </div>
                  <Skeleton className="h-64 w-full rounded-lg" />
                </div>
              ) : outfit.tryon.status === 'succeeded' && outfit.tryon.imageUrl ? (
                <div className="space-y-4">
                  <img
                    src={outfit.tryon.imageUrl}
                    alt="Virtual try-on result"
                    className="rounded-lg border max-h-[500px] w-full object-contain"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateTryon}
                    disabled={tryonMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-generate
                  </Button>
                </div>
              ) : outfit.tryon.status === 'failed' ? (
                <div className="text-center py-8 space-y-4">
                  <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
                    <p className="font-medium">Try-on generation failed</p>
                    {outfit.tryon.errorMessage && (
                      <p className="mt-1">{outfit.tryon.errorMessage}</p>
                    )}
                  </div>
                  <Button onClick={handleGenerateTryon} disabled={tryonMutation.isPending}>
                    {tryonMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <p className="text-muted-foreground">Try-on is pending.</p>
                  <Button onClick={handleGenerateTryon} disabled={tryonMutation.isPending}>
                    {tryonMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Generate Try-on
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Score card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Outfit Score
              </CardTitle>
              <CardDescription>
                AI-powered scoring of fit, color harmony, and occasion match
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {outfit.status === 'pending' || outfit.status === 'failed' ? (
                <div className="text-center py-6 space-y-4">
                  {outfit.status === 'failed' && outfit.errorCode && (
                    <div className="bg-destructive/10 text-destructive rounded-lg p-4 text-sm">
                      <p className="font-medium">Score generation failed</p>
                      <p className="mt-1">{outfit.errorMessage}</p>
                    </div>
                  )}
                  <p className="text-muted-foreground">
                    {outfit.status === 'pending'
                      ? 'Generate an AI score for this outfit combination.'
                      : 'Try generating the score again.'}
                  </p>
                  <Button onClick={handleGenerateScore} disabled={scoreMutation.isPending}>
                    {scoreMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Score
                      </>
                    )}
                  </Button>
                </div>
              ) : outfit.status === 'running' || scoreMutation.isPending ? (
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p>Analyzing your outfit...</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      'Fit Balance',
                      'Proportions',
                      'Color Harmony',
                      'Occasion Match',
                      'Season & Material',
                    ].map((label) => (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-8" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ) : score ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Score</p>
                      <p className="text-4xl font-bold">{score.scores.overall}</p>
                    </div>
                    <Badge className={`text-sm px-3 py-1 ${verdictColor(score.verdict)}`}>
                      {score.verdict === 'great'
                        ? 'Great Outfit!'
                        : score.verdict === 'ok'
                          ? 'Decent Outfit'
                          : 'Not Recommended'}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <ScoreBar label="Fit & Balance" value={score.scores.fit_balance} />
                    <ScoreBar label="Proportions" value={score.scores.proportions} />
                    <ScoreBar label="Color Harmony" value={score.scores.color_harmony} />
                    <ScoreBar label="Occasion Match" value={score.scores.occasion_match} />
                    <ScoreBar label="Season & Material" value={score.scores.season_material} />
                  </div>
                  {score.why.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Analysis</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {score.why.map((w, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {score.improvements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Suggestions</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {score.improvements.map((imp, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-yellow-500 mt-0.5">→</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {score.alternatives && score.alternatives.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Alternatives to consider</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {score.alternatives.map((alt, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-blue-500 mt-0.5">✦</span>
                            <span>{alt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateScore}
                    disabled={scoreMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-score
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No score data available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
