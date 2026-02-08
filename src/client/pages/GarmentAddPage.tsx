import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Badge } from '@components/ui/badge';
import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { MultiImageUploadCard, type UploadResult } from '@client/components/MultiImageUploadCard';
import { useCreateGarmentsFromDetections } from '@client/lib/apiHooks';
import { detectGarments } from '@client/lib/n2wApi';
import type { DetectionItem } from '@shared/dtos/garment';
import { DETECT_CATEGORIES } from '@shared/ai-schemas/garment';
import { ArrowLeft, Loader2, CheckSquare, Square } from 'lucide-react';
import { cn } from '@client/lib/utils';

const CATEGORY_OPTIONS = [...DETECT_CATEGORIES];

type OverridesState = Record<string, { name?: string; category?: string }>;

type DetectResultItem = {
  uploadId: string;
  imageUrl: string;
  uploadWidth: number;
  uploadHeight: number;
  detections: DetectionItem[];
};

export function GarmentAddPage() {
  const navigate = useNavigate();
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [detectResults, setDetectResults] = useState<DetectResultItem[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<OverridesState>({});

  const createMutation = useCreateGarmentsFromDetections({
    onSuccess: () => {
      navigate('/app/garments');
    },
  });

  const handleUploadedAll = (results: UploadResult[]) => setUploadResults(results);
  const handleClearUpload = () => {
    setUploadResults([]);
    setDetectResults([]);
    setSelectedIds(new Set());
    setOverrides({});
  };

  const handleDetect = async () => {
    if (uploadResults.length === 0) return;
    setIsDetecting(true);
    try {
      const results: DetectResultItem[] = [];
      for (const u of uploadResults) {
        const data = await detectGarments(u.id);
        results.push({
          uploadId: data.uploadId,
          imageUrl: data.imageUrl,
          uploadWidth: u.width,
          uploadHeight: u.height,
          detections: data.detections,
        });
      }
      setDetectResults(results);
      const allDetections = results.flatMap((r) => r.detections);
      setSelectedIds(new Set(allDetections.map((d) => d.id)));
      setOverrides(
        Object.fromEntries(
          allDetections.map((d) => [
            d.id,
            {
              name: d.labelGuess ?? undefined,
              category: d.categoryGuess ?? undefined,
            },
          ])
        )
      );
    } finally {
      setIsDetecting(false);
    }
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
            Upload one or more photos. We&apos;ll detect
            garments in each and you can save the ones you want.
          </p>
        </div>
      </div>

      {/* Step A: Upload (multiple photos; resized on client before upload) */}
      <div>
        <Label className="text-sm font-medium">1. Upload photos</Label>
        <MultiImageUploadCard
          onUploadedAll={handleUploadedAll}
          onClear={handleClearUpload}
          existingUploads={uploadResults.length > 0 ? uploadResults : undefined}
          className="mt-2"
        />
      </div>

      {/* Step B: Detect */}
      <div>
        <Label className="text-sm font-medium">2. Detect garments</Label>
        <div className="mt-2">
          <Button
            onClick={handleDetect}
            disabled={uploadResults.length === 0 || isDetecting}
          >
            {isDetecting ? (
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
      {detectResults.length > 0 && uploadResults.length > 0 && (
        <div className="space-y-4">
          <Label className="text-sm font-medium">3. Select and edit, then save</Label>

          {/* Images with bbox overlays */}
          <div className="space-y-4">
            {detectResults.map((dr, idx) => (
              <div
                key={dr.uploadId}
                className="relative max-h-80 bg-muted rounded-md overflow-hidden"
                style={{
                  aspectRatio: `${dr.uploadWidth} / ${dr.uploadHeight}`,
                }}
              >
                <img
                  src={dr.imageUrl}
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-full object-contain"
                />
                {dr.detections.map((d) => (
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
            ))}
          </div>

          {/* List of all detections (flattened) */}
          {(() => {
            const allDetections = detectResults.flatMap((r) => r.detections);
            return (
          <div className="space-y-2">
            {allDetections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No garments detected.</p>
            ) : (
              allDetections.map((d) => (
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
            );
          })()}

          <Button
            onClick={handleSave}
            disabled={selectedIds.size === 0 || createMutation.isPending}
            className="w-full"
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
  );
}
