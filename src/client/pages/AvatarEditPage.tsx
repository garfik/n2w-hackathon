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
import type { AvatarBodyProfile, AvatarBodyProfileClean } from '@shared/dtos/avatar';

/** Strip AI metadata (confidence, issues) from body profile before saving */
function toCleanProfile(profile: AvatarBodyProfile): AvatarBodyProfileClean {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { confidence, issues, ...clean } = profile;
  return clean;
}

const BODY_SHAPE_LABELS: Record<AvatarBodyProfile['body_shape_label'], string> = {
  hourglass: 'Hourglass',
  pear: 'Pear',
  rectangle: 'Rectangle',
  apple: 'Apple',
  inverted_triangle: 'Inverted triangle',
  unknown: 'Unknown',
};
const SHOULDER_WIDTH_LABELS: Record<AvatarBodyProfile['shoulder_width_class'], string> = {
  narrow: 'Narrow',
  average: 'Average',
  wide: 'Wide',
  unknown: 'Unknown',
};
const HIP_VS_SHOULDER_LABELS: Record<AvatarBodyProfile['hip_vs_shoulder'], string> = {
  hips_wider: 'Hips wider',
  equal: 'Equal',
  shoulders_wider: 'Shoulders wider',
  unknown: 'Unknown',
};
const WAIST_DEFINITION_LABELS: Record<AvatarBodyProfile['waist_definition'], string> = {
  defined: 'Defined',
  moderate: 'Moderate',
  low: 'Low',
  unknown: 'Unknown',
};
const TORSO_VS_LEGS_LABELS: Record<AvatarBodyProfile['torso_vs_legs'], string> = {
  short_torso: 'Short torso',
  balanced: 'Balanced',
  long_torso: 'Long torso',
  unknown: 'Unknown',
};
const BODY_VOLUME_LABELS: Record<AvatarBodyProfile['body_volume'], string> = {
  slim: 'Slim',
  average: 'Average',
  curvy: 'Curvy',
  plus: 'Plus',
  unknown: 'Unknown',
};
const VERTICALITY_LABELS: Record<AvatarBodyProfile['verticality'], string> = {
  petite: 'Petite',
  regular: 'Regular',
  tall: 'Tall',
  unknown: 'Unknown',
};
const SHOULDER_SLOPE_LABELS: Record<AvatarBodyProfile['shoulder_slope'], string> = {
  sloped: 'Sloped',
  neutral: 'Neutral',
  square: 'Square',
  unknown: 'Unknown',
};
const NECK_LENGTH_LABELS: Record<AvatarBodyProfile['neck_length'], string> = {
  short: 'Short',
  average: 'Average',
  long: 'Long',
  unknown: 'Unknown',
};
const UNDERTONE_LABELS: Record<AvatarBodyProfile['undertone'], string> = {
  cool: 'Cool',
  neutral: 'Neutral',
  warm: 'Warm',
  olive: 'Olive',
  unknown: 'Unknown',
};
const CONTRAST_LEVEL_LABELS: Record<AvatarBodyProfile['contrast_level'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  unknown: 'Unknown',
};

function confidencePercent(c: number | undefined): number | null {
  if (c === undefined) return null;
  return Math.round(c * 100);
}

/** Helper to check if profile has confidence data (full AI response vs clean saved data) */
function hasConfidence(
  profile: AvatarBodyProfile
): profile is AvatarBodyProfile & { confidence: NonNullable<AvatarBodyProfile['confidence']> } {
  return 'confidence' in profile && profile.confidence != null;
}

function getAvatarImageUrl(photoUploadId: string | null): string | null {
  if (!photoUploadId) return null;
  return `/api/uploads/${photoUploadId}/image`;
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
      const height =
        typeof heightCm === 'number' && Number.isFinite(heightCm) ? heightCm : undefined;
      // Strip confidence and issues before saving - only store clean data
      await updateAvatar({
        avatarId,
        name: avatarName.trim() || undefined,
        bodyProfileJson: formProfile ? toCleanProfile(formProfile) : undefined,
        heightCm: height,
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

  const imageUrl = getAvatarImageUrl(avatar.photoUploadId);

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
                        {(['narrow', 'average', 'wide', 'unknown'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {SHOULDER_WIDTH_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.shoulder_width_class)}%
                      </Badge>
                    )}
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
                        {(['hips_wider', 'equal', 'shoulders_wider', 'unknown'] as const).map(
                          (opt) => (
                            <SelectItem key={opt} value={opt}>
                              {HIP_VS_SHOULDER_LABELS[opt]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.hip_vs_shoulder)}%
                      </Badge>
                    )}
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
                        {(['defined', 'moderate', 'low', 'unknown'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {WAIST_DEFINITION_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.waist_definition)}%
                      </Badge>
                    )}
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
                        {(['short_torso', 'balanced', 'long_torso', 'unknown'] as const).map(
                          (opt) => (
                            <SelectItem key={opt} value={opt}>
                              {TORSO_VS_LEGS_LABELS[opt]}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.torso_vs_legs)}%
                      </Badge>
                    )}
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
                          [
                            'hourglass',
                            'pear',
                            'rectangle',
                            'apple',
                            'inverted_triangle',
                            'unknown',
                          ] as const
                        ).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {BODY_SHAPE_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.body_shape_label)}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Body volume</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.body_volume}
                      onValueChange={(v) =>
                        updateFormField('body_volume', v as AvatarBodyProfile['body_volume'])
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['slim', 'average', 'curvy', 'plus', 'unknown'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {BODY_VOLUME_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.body_volume)}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Verticality</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.verticality}
                      onValueChange={(v) =>
                        updateFormField('verticality', v as AvatarBodyProfile['verticality'])
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['petite', 'regular', 'tall', 'unknown'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {VERTICALITY_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.verticality)}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Shoulder slope</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.shoulder_slope}
                      onValueChange={(v) =>
                        updateFormField('shoulder_slope', v as AvatarBodyProfile['shoulder_slope'])
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['sloped', 'neutral', 'square', 'unknown'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {SHOULDER_SLOPE_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.shoulder_slope)}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Neck length</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.neck_length}
                      onValueChange={(v) =>
                        updateFormField('neck_length', v as AvatarBodyProfile['neck_length'])
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['short', 'average', 'long', 'unknown'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {NECK_LENGTH_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.neck_length)}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Undertone</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.undertone}
                      onValueChange={(v) =>
                        updateFormField('undertone', v as AvatarBodyProfile['undertone'])
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['cool', 'neutral', 'warm', 'olive', 'unknown'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {UNDERTONE_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.undertone)}%
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Contrast level</Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={formProfile.contrast_level}
                      onValueChange={(v) =>
                        updateFormField('contrast_level', v as AvatarBodyProfile['contrast_level'])
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['low', 'medium', 'high', 'unknown'] as const).map((opt) => (
                          <SelectItem key={opt} value={opt}>
                            {CONTRAST_LEVEL_LABELS[opt]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasConfidence(formProfile) && (
                      <Badge variant="secondary">
                        {confidencePercent(formProfile.confidence.contrast_level)}%
                      </Badge>
                    )}
                  </div>
                </div>

                {'issues' in formProfile && formProfile.issues && formProfile.issues.length > 0 && (
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
