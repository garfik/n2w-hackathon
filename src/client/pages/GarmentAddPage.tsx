import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { Label } from '@components/ui/label';
import { Progress } from '@components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { ImageUploadCard, type UploadResult } from '@client/components/ImageUploadCard';
import { useDetectGarments } from '@client/lib/apiHooks';
import { generateGarmentImage, createGarmentsFromDetections } from '@client/lib/n2wApi';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@client/lib/queryClient';
import type { DetectionItem } from '@shared/dtos/garment';
import { DETECT_CATEGORIES } from '@shared/ai-schemas/garment';
import { ArrowLeft, Loader2, CheckSquare, Square } from 'lucide-react';
import { cn } from '@client/lib/utils';

const CATEGORY_OPTIONS = [...DETECT_CATEGORIES];

type OverridesState = Record<string, { name?: string; category?: string }>;

type GeneratingState = {
  total: number;
  completed: number;
  phase: 'generating' | 'saving';
};

export function GarmentAddPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [detectResult, setDetectResult] = useState<{
    uploadId: string;
    imageUrl: string;
    detections: DetectionItem[];
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<OverridesState>({});
  const [generating, setGenerating] = useState<GeneratingState | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleUploaded = (result: UploadResult) => setUploadResult(result);
  const handleClearUpload = () => {
    setUploadResult(null);
    setDetectResult(null);
    setSelectedIds(new Set());
    setOverrides({});
    setGenerating(null);
    setSaveError(null);
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

  const handleSave = useCallback(async () => {
    if (!detectResult) return;
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setSaveError(null);
    const detectionMap = new Map(detectResult.detections.map((d) => [d.id, d]));
    let completed = 0;

    setGenerating({ total: ids.length, completed: 0, phase: 'generating' });

    // Each promise: generate image → create garment immediately (no waiting for others)
    const results = await Promise.allSettled(
      ids.map(async (detectionId) => {
        const detection = detectionMap.get(detectionId);
        if (!detection) throw new Error(`Detection not found: ${detectionId}`);

        const override = overrides[detectionId];
        const result = await generateGarmentImage({
          uploadId: detectResult.uploadId,
          bboxNorm: detection.bbox,
          category: override?.category ?? detection.categoryGuess ?? undefined,
          label: override?.name ?? detection.labelGuess ?? undefined,
        });

        completed++;
        setGenerating({ total: ids.length, completed, phase: 'generating' });

        await createGarmentsFromDetections({
          detectionIds: [detectionId],
          overrides: {
            [detectionId]: {
              name: override?.name,
              category: override?.category,
              uploadId: result.uploadId,
            },
          },
        });

        return detectionId;
      })
    );

    setGenerating(null);

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;

    if (succeeded > 0) {
      await queryClient.invalidateQueries({ queryKey: queryKeys.garments.all });
      navigate('/app/garments');
    } else {
      setSaveError('Failed to save garments.');
    }
  }, [detectResult, selectedIds, overrides, navigate, queryClient]);

  const isBusy = generating !== null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/garments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add garments from photo</h1>
          <p className="text-muted-foreground">
            Upload a photo with one or more garments. We&apos;ll detect them and you can save the
            ones you want.
          </p>
        </div>
      </div>

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
        <div className="mt-2">
          <Button onClick={handleDetect} disabled={!uploadResult || detectMutation.isPending}>
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
      </div>

      {/* Step C & D: Results + Save */}
      {detectResult && uploadResult && (
        <div className="space-y-4">
          <Label className="text-sm font-medium">3. Select and edit, then save</Label>

          {/* Image with bbox overlay */}
          <div
            className="relative max-h-80 bg-muted rounded-md overflow-hidden"
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
          <div className="space-y-2">
            {detectResult.detections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No garments detected.</p>
            ) : (
              detectResult.detections.map((d) => (
                <Card
                  key={d.id}
                  className={cn(
                    'transition-colors',
                    selectedIds.has(d.id) ? 'border-primary bg-primary/5' : 'bg-muted/30'
                  )}
                >
                  <CardContent className="flex flex-wrap items-center gap-2 p-3">
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
                      className="flex-1 min-w-24 max-w-48"
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
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          {generating && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {generating.phase === 'generating'
                  ? `Generating clean images... ${generating.completed}/${generating.total}`
                  : 'Saving garments...'}
              </div>
              <Progress
                value={
                  generating.phase === 'generating'
                    ? (generating.completed / generating.total) * 100
                    : 100
                }
              />
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={selectedIds.size === 0 || isBusy}
            className="w-full"
          >
            {isBusy ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {generating?.phase === 'generating'
                  ? `Generating... ${generating.completed}/${generating.total}`
                  : 'Saving...'}
              </>
            ) : (
              `Save ${selectedIds.size} garment${selectedIds.size === 1 ? '' : 's'}`
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
