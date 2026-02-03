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
import { getAvatar, updateAvatar, type Avatar } from '@client/lib/n2wApi';
import type { AvatarBodyProfile } from '@shared/dtos/avatar';

const BODY_SHAPE_LABELS: Record<AvatarBodyProfile['body_shape_label'], string> = {
  hourglass: 'Hourglass',
  pear: 'Pear',
  rectangle: 'Rectangle',
  apple: 'Apple',
  inverted_triangle: 'Inverted triangle',
};
const SHOULDER_WIDTH_LABELS: Record<AvatarBodyProfile['shoulder_width_class'], string> = {
  narrow: 'Narrow',
  average: 'Average',
  wide: 'Wide',
};
const HIP_VS_SHOULDER_LABELS: Record<AvatarBodyProfile['hip_vs_shoulder'], string> = {
  hips_wider: 'Hips wider',
  equal: 'Equal',
  shoulders_wider: 'Shoulders wider',
};
const WAIST_DEFINITION_LABELS: Record<AvatarBodyProfile['waist_definition'], string> = {
  defined: 'Defined',
  moderate: 'Moderate',
  low: 'Low',
};
const TORSO_VS_LEGS_LABELS: Record<AvatarBodyProfile['torso_vs_legs'], string> = {
  short_torso: 'Short torso',
  balanced: 'Balanced',
  long_torso: 'Long torso',
};

function confidencePercent(c: number): number {
  return Math.round(c * 100);
}

function getAvatarImageUrl(sourcePhotoKey: string | null): string | null {
  if (!sourcePhotoKey) return null;
  return `/api/storage/object?key=${encodeURIComponent(sourcePhotoKey)}`;
}

export function AvatarEditPage() {
  const { avatarId } = useParams<{ avatarId: string }>();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState<Avatar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [avatarName, setAvatarName] = useState('');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [formProfile, setFormProfile] = useState<AvatarBodyProfile | null>(null);

  useEffect(() => {
    if (!avatarId) {
      setError('Missing avatar ID');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await getAvatar(avatarId);
        if (cancelled) return;
        setAvatar(data);
        setAvatarName(data.name);
        setHeightCm(data.heightCm ?? '');
        if (data.bodyProfileJson) {
          setFormProfile(data.bodyProfileJson as AvatarBodyProfile);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load avatar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [avatarId]);

  const updateFormField = <K extends keyof AvatarBodyProfile>(
    key: K,
    value: AvatarBodyProfile[K]
  ) => {
    setFormProfile((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const handleSave = async () => {
    if (!avatarId) return;
    setSaveLoading(true);
    try {
      await updateAvatar({
        avatarId,
        name: avatarName.trim() || undefined,
        bodyProfileJson: formProfile ?? undefined,
        heightCm: typeof heightCm === 'number' && Number.isFinite(heightCm) ? heightCm : undefined,
      });
      navigate(`/app/avatars/${avatarId}/outfits`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-lg" />
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

  if (error || !avatar) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive mb-4">{error ?? 'Avatar not found'}</p>
            <Button variant="outline" asChild>
              <Link to="/app/avatars">&larr; All avatars</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imageUrl = getAvatarImageUrl(avatar.sourcePhotoKey);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/avatars">&larr; All avatars</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: photo */}
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-xl font-bold">Avatar photo</CardTitle>
            <CardDescription>Original uploaded photo</CardDescription>
          </CardHeader>
          <CardContent>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={avatar.name}
                className="w-full max-h-80 rounded-lg object-contain bg-muted/50"
              />
            ) : (
              <div className="h-64 w-full rounded-lg bg-muted/50 flex items-center justify-center">
                <span className="text-muted-foreground">No image</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: edit form */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-xl font-bold">Edit avatar</CardTitle>
              <CardDescription>Update name and body profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="avatar-name">Name</Label>
                <Input
                  id="avatar-name"
                  value={avatarName}
                  onChange={(e) => setAvatarName(e.target.value)}
                  placeholder="My avatar"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height-cm">Height (cm)</Label>
                <Input
                  id="height-cm"
                  type="number"
                  min={0}
                  max={250}
                  placeholder="170"
                  value={heightCm === '' ? '' : heightCm}
                  onChange={(e) => {
                    const v = e.target.value;
                    setHeightCm(v === '' ? '' : parseInt(v, 10));
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {formProfile && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Body profile</CardTitle>
                <CardDescription>Adjust analysis results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Shoulder width</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.shoulder_width_class}
                      onValueChange={(v) =>
                        updateFormField(
                          'shoulder_width_class',
                          v as AvatarBodyProfile['shoulder_width_class']
                        )
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['narrow', 'average', 'wide'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {SHOULDER_WIDTH_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.shoulder_width_class)}%
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hip vs shoulder</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.hip_vs_shoulder}
                      onValueChange={(v) =>
                        updateFormField(
                          'hip_vs_shoulder',
                          v as AvatarBodyProfile['hip_vs_shoulder']
                        )
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['hips_wider', 'equal', 'shoulders_wider'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {HIP_VS_SHOULDER_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.hip_vs_shoulder)}%
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Waist definition</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.waist_definition}
                      onValueChange={(v) =>
                        updateFormField(
                          'waist_definition',
                          v as AvatarBodyProfile['waist_definition']
                        )
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['defined', 'moderate', 'low'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {WAIST_DEFINITION_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.waist_definition)}%
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Torso vs legs</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.torso_vs_legs}
                      onValueChange={(v) =>
                        updateFormField('torso_vs_legs', v as AvatarBodyProfile['torso_vs_legs'])
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['short_torso', 'balanced', 'long_torso'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {TORSO_VS_LEGS_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.torso_vs_legs)}%
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Body shape</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.body_shape_label}
                      onValueChange={(v) =>
                        updateFormField(
                          'body_shape_label',
                          v as AvatarBodyProfile['body_shape_label']
                        )
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          ['hourglass', 'pear', 'rectangle', 'apple', 'inverted_triangle'] as const
                        ).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {BODY_SHAPE_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.body_shape_label)}%
                    </Badge>
                  </div>
                </div>

                {formProfile.issues.length > 0 && (
                  <div className="space-y-2">
                    <Label>Issues (read-only)</Label>
                    <ul className="text-sm text-muted-foreground list-disc list-inside rounded-md border p-3 bg-muted/30">
                      {formProfile.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saveLoading} className="flex-1">
              {saveLoading ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" asChild>
              <Link to={`/app/avatars/${avatarId}/outfits`}>Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
