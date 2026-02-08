import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@components/ui/alert-dialog';
import { useGarment, useUpdateGarment, useDeleteGarment } from '@client/lib/apiHooks';
import { GarmentImage } from '@client/components/GarmentImage';
import { DETECT_CATEGORIES } from '@shared/ai-schemas/garment';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';

const CATEGORY_OPTIONS = [...DETECT_CATEGORIES];

type GarmentProfile = {
  category?: string;
  silhouette?: string;
  length_class?: string;
  fit_intent?: string;
  neckline?: string;
  sleeve?: string;
  rise?: string;
  primary_colors?: string[];
  pattern?: string;
  material_guess?: string;
  formality?: string;
  seasonality?: string;
  style_family?: string;
  style_tags?: string[];
  confidence?: number;
  issues?: string[];
};

const PROFILE_FIELD_OPTIONS: Record<string, { label: string; options: string[] }> = {
  silhouette: {
    label: 'Silhouette',
    options: ['slim', 'straight', 'regular', 'oversized', 'tapered', 'unknown'],
  },
  length_class: {
    label: 'Length',
    options: ['cropped', 'short', 'regular', 'long', 'maxi', 'unknown'],
  },
  fit_intent: {
    label: 'Fit',
    options: ['tight', 'regular', 'oversized', 'unknown'],
  },
  neckline: {
    label: 'Neckline',
    options: ['crew', 'v_neck', 'square', 'turtleneck', 'collared', 'unknown'],
  },
  sleeve: {
    label: 'Sleeve',
    options: ['sleeveless', 'short', 'long', 'unknown'],
  },
  rise: {
    label: 'Rise',
    options: ['low', 'mid', 'high', 'unknown'],
  },
  pattern: {
    label: 'Pattern',
    options: ['solid', 'stripe', 'check', 'print', 'unknown'],
  },
  material_guess: {
    label: 'Material',
    options: ['denim', 'knit', 'cotton', 'leather', 'synthetic', 'linen', 'unknown'],
  },
  formality: {
    label: 'Formality',
    options: ['casual', 'smart_casual', 'formal', 'unknown'],
  },
  seasonality: {
    label: 'Seasonality',
    options: ['summer', 'winter', 'all_season', 'unknown'],
  },
};

export function GarmentDetailPage() {
  const { garmentId } = useParams<{ garmentId: string }>();
  const navigate = useNavigate();
  const { data: garmentData, isPending, error: queryError } = useGarment(garmentId);
  const updateMutation = useUpdateGarment();
  const deleteMutation = useDeleteGarment();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [profile, setProfile] = useState<GarmentProfile | null>(null);

  useEffect(() => {
    if (!garmentData) return;
    setName(garmentData.name ?? '');
    setCategory(garmentData.category ?? '');
    setProfile(
      garmentData.garmentProfileJson ? (garmentData.garmentProfileJson as GarmentProfile) : null
    );
  }, [garmentData]);

  const handleSave = () => {
    if (!garmentId) return;
    updateMutation.mutate(
      {
        garmentId,
        name: name.trim() || undefined,
        category: category || undefined,
        garmentProfileJson: profile ?? undefined,
      },
      { onSuccess: () => navigate('/app/garments') }
    );
  };

  const handleDelete = () => {
    if (!garmentId) return;
    deleteMutation.mutate(garmentId, {
      onSuccess: () => navigate('/app/garments'),
    });
  };

  const updateProfileField = (key: string, value: string) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const error =
    queryError?.message ?? updateMutation.error?.message ?? deleteMutation.error?.message ?? null;

  if (isPending) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="aspect-square w-full rounded-lg" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (queryError || (!isPending && !garmentData)) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive mb-4">{error ?? 'Garment not found'}</p>
            <Button variant="outline" asChild>
              <Link to="/app/garments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to garments
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/garments">
            <ArrowLeft className="h-4 w-4 mr-2" />
            All garments
          </Link>
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: garment image */}
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-xl font-bold">
              {garmentData.name ?? 'Unnamed garment'}
            </CardTitle>
            <CardDescription>
              {garmentData.category && <Badge variant="secondary">{garmentData.category}</Badge>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GarmentImage
              uploadId={garmentData.uploadId}
              bbox={garmentData.bboxNorm}
              alt={garmentData.name ?? 'Garment'}
              className="aspect-square w-full rounded-lg bg-muted/50"
            />
            {/* Full image below for reference */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Original photo</p>
              <img
                src={garmentData.imageUrl}
                alt="Full photo"
                className="w-full max-h-48 rounded-lg object-contain bg-muted/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right: edit form */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-xl font-bold">Edit garment</CardTitle>
              <CardDescription>Update name, category and detected attributes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="garment-name">Name</Label>
                <Input
                  id="garment-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Black t-shirt"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="garment-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="garment-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {profile && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Garment profile</CardTitle>
                <CardDescription>Detected attributes — adjust if needed</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(PROFILE_FIELD_OPTIONS).map(([key, { label, options }]) => {
                  const value = (profile as Record<string, unknown>)[key];
                  if (value === undefined) return null;
                  return (
                    <div key={key} className="space-y-2">
                      <Label>{label}</Label>
                      <Select
                        value={String(value ?? '')}
                        onValueChange={(v) => updateProfileField(key, v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {options.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}

                {profile.primary_colors && profile.primary_colors.length > 0 && (
                  <div className="space-y-2">
                    <Label>Primary colors</Label>
                    <div className="flex flex-wrap gap-1">
                      {profile.primary_colors.map((color, i) => (
                        <Badge key={i} variant="outline">
                          {color}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.style_tags && profile.style_tags.length > 0 && (
                  <div className="space-y-2">
                    <Label>Style tags</Label>
                    <div className="flex flex-wrap gap-1">
                      {profile.style_tags.map((tag, i) => (
                        <Badge key={i} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {profile.style_family && (
                  <div className="space-y-2">
                    <Label>Style family</Label>
                    <p className="text-sm text-muted-foreground">{profile.style_family}</p>
                  </div>
                )}

                {profile.issues && profile.issues.length > 0 && (
                  <div className="space-y-2">
                    <Label>Issues</Label>
                    <ul className="text-sm text-muted-foreground list-disc list-inside rounded-md border p-3 bg-muted/30">
                      {profile.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="flex-1">
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleteMutation.isPending}>
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete garment?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete &ldquo;{garmentData.name ?? 'this garment'}&rdquo;
                    and remove it from any outfits. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
