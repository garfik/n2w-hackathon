import { useState, useMemo, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Badge } from '@components/ui/badge';
import { Skeleton } from '@components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { useGarmentsList, useCreateOutfit } from '@client/lib/apiHooks';
import { GarmentImage } from '@client/components/GarmentImage';
import type { GarmentListItem } from '@client/lib/n2wApi';
import { DETECT_CATEGORIES } from '@shared/ai-schemas/garment';
import { Check, Loader2, ArrowLeft } from 'lucide-react';

const OCCASIONS = ['casual', 'work', 'party', 'date', 'sport', 'formal', 'other'];
const ALL_CATEGORIES_VALUE = '__all__';

function GarmentCheckCard({
  g,
  selected,
  onToggle,
}: {
  g: GarmentListItem;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative rounded-lg border overflow-hidden text-left transition-all ${
        selected
          ? 'ring-2 ring-primary border-primary shadow-md'
          : 'hover:border-primary/50 hover:shadow-sm'
      }`}
    >
      <div className="h-36 w-full bg-muted/50">
        <GarmentImage
          uploadId={g.uploadId}
          bbox={g.bboxNorm}
          alt={g.name ?? 'Garment'}
          className="w-full h-full"
        />
      </div>
      <div className="p-2">
        <p className="font-medium text-sm truncate">{g.name ?? 'Unnamed'}</p>
        {g.category && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {g.category}
          </Badge>
        )}
      </div>
      {selected && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
          <Check className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}

export function OutfitNewPage() {
  const navigate = useNavigate();
  const { avatarId } = useParams<{ avatarId: string }>();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [occasion, setOccasion] = useState<string>('');
  const [customOccasion, setCustomOccasion] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES_VALUE);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(
    () => ({
      category: categoryFilter === ALL_CATEGORIES_VALUE ? undefined : categoryFilter,
      search: searchQuery.trim() || undefined,
    }),
    [categoryFilter, searchQuery]
  );

  const { data: garments, isPending: garmentsLoading } = useGarmentsList(params);
  const createMutation = useCreateOutfit();

  const toggleGarment = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 10) return prev;
        next.add(id);
      }
      return next;
    });
  };

  const effectiveOccasion = occasion === 'other' ? customOccasion.trim() : occasion;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!avatarId) {
      setError('No avatar selected');
      return;
    }
    if (selectedIds.size === 0) {
      setError('Select at least one garment');
      return;
    }
    if (!effectiveOccasion) {
      setError('Select or enter an occasion');
      return;
    }
    setError(null);

    createMutation.mutate(
      {
        avatarId,
        garmentIds: [...selectedIds],
        occasion: effectiveOccasion,
      },
      {
        onSuccess: (result) => {
          navigate(`/app/avatars/${avatarId}/outfits/${result.outfitId}`, { replace: true });
        },
        onError: (err) => {
          setError(err.message);
        },
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/app/avatars/${avatarId}/outfits`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to outfits
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">New Outfit</CardTitle>
          <CardDescription>
            Select garments from your wardrobe, pick an occasion, and create an outfit to score.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Garment selection */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Label className="text-base font-semibold">Garments ({selectedIds.size}/10)</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-32 h-8 text-sm"
                  />
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-28 h-8 text-sm">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_CATEGORIES_VALUE}>All</SelectItem>
                      {DETECT_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {garmentsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-lg border overflow-hidden">
                      <Skeleton className="h-36 w-full" />
                      <div className="p-2">
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : !garments?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No garments found.</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link to="/app/garments/new">Add garments first</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {garments.map((g) => (
                    <GarmentCheckCard
                      key={g.id}
                      g={g}
                      selected={selectedIds.has(g.id)}
                      onToggle={() => toggleGarment(g.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Occasion */}
            <div className="space-y-2">
              <Label htmlFor="occasion" className="text-base font-semibold">
                Occasion
              </Label>
              <Select value={occasion} onValueChange={setOccasion}>
                <SelectTrigger id="occasion">
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent>
                  {OCCASIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {occasion === 'other' && (
                <Input
                  placeholder="Enter custom occasion..."
                  value={customOccasion}
                  onChange={(e) => setCustomOccasion(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={selectedIds.size === 0 || !effectiveOccasion || createMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Outfit'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
