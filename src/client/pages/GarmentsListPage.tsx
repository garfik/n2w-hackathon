import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { Skeleton } from '@components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Label } from '@components/ui/label';
import { ImageUploadCard, type UploadResult } from '@client/components/ImageUploadCard';
import {
  useGarmentsList,
  useDetectGarments,
  useCreateGarmentsFromDetections,
} from '@client/lib/apiHooks';
import type { GarmentListItem } from '@client/lib/n2wApi';
import type { DetectionItem } from '@shared/dtos/garment';
import { Loader2, Plus, CheckSquare, Square } from 'lucide-react';
import { cn } from '@client/lib/utils';

const CATEGORY_OPTIONS = [
  'top',
  'shirt',
  'jacket',
  'coat',
  'pants',
  'jeans',
  'skirt',
  'dress',
  'shorts',
  'shoes',
  'other',
];

function GarmentCard({ g }: { g: GarmentListItem }) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <div className="aspect-square bg-muted/50 relative">
        <img src={g.imageUrl} alt={g.name ?? 'Garment'} className="w-full h-full object-contain" />
      </div>
      <CardContent className="p-3">
        <p className="font-medium truncate">{g.name ?? 'Unnamed'}</p>
        {g.category && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {g.category}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

type OverridesState = Record<string, { name?: string; category?: string }>;

export function GarmentsListPage() {
  const ALL_CATEGORIES_VALUE = '__all__';
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES_VALUE);
  const [searchQuery, setSearchQuery] = useState('');
  const params = useMemo(
    () => ({
      category: categoryFilter === ALL_CATEGORIES_VALUE ? undefined : categoryFilter,
      search: searchQuery.trim() || undefined,
    }),
    [categoryFilter, searchQuery]
  );

  const { data: garments, error, isPending } = useGarmentsList(params);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [detectResult, setDetectResult] = useState<{
    uploadId: string;
    imageUrl: string;
    detections: DetectionItem[];
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<OverridesState>({});

  const detectMutation = useDetectGarments({
    onSuccess: (data) => {
      setDetectResult(data);
      setSelectedIds(new Set(data.detections.map((d) => d.id)));
      setOverrides(
        Object.fromEntries(
          data.detections.map((d) => [
            d.id,
            {
              name: d.labelGuess ?? undefined,
              category: d.categoryGuess ?? undefined,
            },
          ])
        )
      );
    },
  });

  const createMutation = useCreateGarmentsFromDetections({
    onSuccess: () => {
      setDialogOpen(false);
      setUploadResult(null);
      setDetectResult(null);
      setSelectedIds(new Set());
      setOverrides({});
    },
  });

  const handleUploaded = (result: UploadResult) => setUploadResult(result);
  const handleClearUpload = () => {
    setUploadResult(null);
    setDetectResult(null);
    setSelectedIds(new Set());
    setOverrides({});
  };

  const handleDetect = () => {
    if (!uploadResult) return;
    detectMutation.mutate(uploadResult.id);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const setOverride = (detectionId: string, field: 'name' | 'category', value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [detectionId]: { ...prev[detectionId], [field]: value || undefined },
    }));
  };

  const handleSave = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const overridesPayload: OverridesState = {};
    ids.forEach((id) => {
      const o = overrides[id];
      if (o?.name !== undefined || o?.category !== undefined) overridesPayload[id] = o;
    });
    createMutation.mutate({
      detectionIds: ids,
      overrides: Object.keys(overridesPayload).length ? overridesPayload : undefined,
    });
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
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
          <h1 className="text-2xl font-bold">Garments Library</h1>
          <p className="text-muted-foreground">Your wardrobe items</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add garments from photo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add garments from photo</DialogTitle>
              <DialogDescription>
                Upload a photo with one or more garments. We&apos;ll detect them and you can save
                the ones you want.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Step A: Upload */}
              <div>
                <Label className="text-sm font-medium">1. Upload photo</Label>
                <ImageUploadCard
                  onUploaded={handleUploaded}
                  onClear={handleClearUpload}
                  existingUpload={uploadResult ?? undefined}
                  className="mt-2"
                />
              </div>

              {/* Step B: Detect */}
              <div>
                <Label className="text-sm font-medium">2. Detect garments</Label>
                <Button
                  className="mt-2"
                  onClick={handleDetect}
                  disabled={!uploadResult || detectMutation.isPending}
                >
                  {detectMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Detecting...
                    </>
                  ) : (
                    'Detect garments'
                  )}
                </Button>
              </div>

              {/* Step C & D: Results + Save */}
              {detectResult && uploadResult && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium">3. Select and edit, then save</Label>

                  {/* Image with bbox overlay — same aspect ratio as image so overlay % match */}
                  <div
                    className="relative max-h-64 bg-muted rounded-md overflow-hidden"
                    style={{
                      aspectRatio: `${uploadResult.width} / ${uploadResult.height}`,
                    }}
                  >
                    <img
                      src={detectResult.imageUrl}
                      alt="Upload"
                      className="w-full h-full object-contain"
                    />
                    {detectResult.detections.map((d) => (
                      <div
                        key={d.id}
                        className={cn(
                          'absolute border-2 rounded pointer-events-none',
                          selectedIds.has(d.id)
                            ? 'border-primary bg-primary/20'
                            : 'border-muted-foreground/50 bg-muted-foreground/10'
                        )}
                        style={{
                          left: `${(d.bbox.x ?? 0) * 100}%`,
                          top: `${(d.bbox.y ?? 0) * 100}%`,
                          width: `${(d.bbox.w ?? 0.1) * 100}%`,
                          height: `${(d.bbox.h ?? 0.1) * 100}%`,
                        }}
                      />
                    ))}
                  </div>

                  {/* List of detections */}
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {detectResult.detections.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No garments detected.</p>
                    ) : (
                      detectResult.detections.map((d) => (
                        <div
                          key={d.id}
                          className={cn(
                            'flex flex-wrap items-center gap-2 p-2 rounded-md border',
                            selectedIds.has(d.id) ? 'border-primary bg-primary/5' : 'bg-muted/30'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleSelection(d.id)}
                            className="p-1 rounded hover:bg-muted"
                            aria-label={selectedIds.has(d.id) ? 'Deselect' : 'Select'}
                          >
                            {selectedIds.has(d.id) ? (
                              <CheckSquare className="h-5 w-5 text-primary" />
                            ) : (
                              <Square className="h-5 w-5 text-muted-foreground" />
                            )}
                          </button>
                          <Input
                            placeholder="Name"
                            value={overrides[d.id]?.name ?? d.labelGuess ?? ''}
                            onChange={(e) => setOverride(d.id, 'name', e.target.value)}
                            className="flex-1 min-w-24 max-w-32"
                          />
                          <Select
                            value={overrides[d.id]?.category ?? d.categoryGuess ?? ''}
                            onValueChange={(v) => setOverride(d.id, 'category', v)}
                          >
                            <SelectTrigger className="w-28" size="sm">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORY_OPTIONS.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {d.confidence != null && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(d.confidence * 100)}%
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  <Button
                    onClick={handleSave}
                    disabled={selectedIds.size === 0 || createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      `Save ${selectedIds.size} garment${selectedIds.size === 1 ? '' : 's'}`
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="search" className="text-sm text-muted-foreground whitespace-nowrap">
            Search
          </Label>
          <Input
            id="search"
            placeholder="By name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="category" className="text-sm text-muted-foreground whitespace-nowrap">
            Category
          </Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger id="category" className="w-36" size="sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES_VALUE}>All</SelectItem>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !garments?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No garments yet</CardTitle>
            <CardDescription>
              Add garments by uploading a photo with one or more items. We&apos;ll detect them for
              you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDialogOpen(true)}>Add garments from photo</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {garments.map((g) => (
            <GarmentCard key={g.id} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}
