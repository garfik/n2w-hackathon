import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@components/ui/alert';
import { Skeleton } from '@components/ui/skeleton';
import { Badge } from '@components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Progress } from '@components/ui/progress';
import { analyzeAvatar, type AnalyzeErrorResponse } from '@client/lib/n2wApi';
import { useCreateAvatar, useUpdateAvatar } from '@client/lib/useAvatars';
import type { AvatarBodyProfile, AvatarBodyProfileClean } from '@shared/dtos/avatar';
import { ImageUploadCard, type UploadResult } from '@client/components/ImageUploadCard';

/** Strip AI metadata (confidence, issues) from body profile before saving */
function toCleanProfile(profile: AvatarBodyProfile): AvatarBodyProfileClean {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { confidence, issues, ...clean } = profile;
  return clean;
}

type AnalysisStatus = 'idle' | 'loading' | 'success' | 'error';

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

function confidencePercent(c: number): number {
  return Math.round(c * 100);
}

export function AvatarNewPage() {
  const navigate = useNavigate();
  const createMutation = useCreateAvatar();
  const updateMutation = useUpdateAvatar();
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [avatarName, setAvatarName] = useState('');
  const [avatarId, setAvatarId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [formProfile, setFormProfile] = useState<AvatarBodyProfile | null>(null);
  const [analysisError, setAnalysisError] = useState<AnalyzeErrorResponse['error'] | null>(null);
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [createLoading, setCreateLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const createSubmittingRef = useRef(false);

  const handleCreateAvatar = async (e: FormEvent) => {
    e.preventDefault();
    if (!uploadResult) return;
    if (createSubmittingRef.current) return;
    createSubmittingRef.current = true;
    setCreateError(null);
    setCreateLoading(true);
    try {
      const newId = await createMutation.mutateAsync({
        uploadId: uploadResult.id,
        name: avatarName.trim() || 'Avatar',
      });
      setAvatarId(newId);
      setAnalysisStatus('loading');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      createSubmittingRef.current = false;
      setCreateLoading(false);
    }
  };

  useEffect(() => {
    if (!avatarId || analysisStatus !== 'loading') return;
    let cancelled = false;
    (async () => {
      try {
        const result = await analyzeAvatar({ avatarId });
        if (cancelled) return;
        if (result.success === true) {
          setFormProfile(result.data);
          setAnalysisStatus('success');
        } else {
          setAnalysisError(result.error);
          setAnalysisStatus('error');
        }
      } catch {
        if (!cancelled) {
          setAnalysisError({ code: 'LOW_QUALITY', message: 'Analysis failed', issues: [] });
          setAnalysisStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [avatarId, analysisStatus]);

  const handleSaveContinue = async () => {
    if (!avatarId) return;
    setSaveLoading(true);
    try {
      const height =
        typeof heightCm === 'number' && Number.isFinite(heightCm) ? heightCm : undefined;
      if (formProfile) {
        // Strip confidence and issues before saving - only store clean data
        await updateMutation.mutateAsync({
          avatarId,
          bodyProfileJson: toCleanProfile(formProfile),
          heightCm: height,
        });
      }
      // Navigate to outfits for this avatar
      navigate(`/app/avatars/${avatarId}/outfits`, { replace: true });
    } catch {
      setSaveLoading(false);
    }
  };

  const handleUploadAnother = () => {
    createSubmittingRef.current = false;
    setUploadResult(null);
    setAvatarName('');
    setAvatarId(null);
    setAnalysisStatus('idle');
    setFormProfile(null);
    setAnalysisError(null);
    setHeightCm('');
    setCreateError(null);
  };

  const updateFormField = <K extends keyof AvatarBodyProfile>(
    key: K,
    value: AvatarBodyProfile[K]
  ) => {
    setFormProfile((prev) => (prev ? { ...prev, [key]: value } : null));
  };

  const showStep1 = !avatarId && !uploadResult;
  const showStep2 = uploadResult && !avatarId;
  const showAnalyzing = avatarId && analysisStatus === 'loading';
  const showError = avatarId && analysisStatus === 'error';
  const showForm = avatarId && analysisStatus === 'success' && formProfile;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/avatars">&larr; Back to avatars</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: preview */}
        <Card>
          <CardHeader className="gap-2">
            <CardTitle className="text-xl font-bold">Avatar photo</CardTitle>
            <CardDescription>
              Upload a full-body photo. One image; front-facing works best.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploadCard
              existingUpload={uploadResult ?? undefined}
              onUploaded={setUploadResult}
              onClear={() => setUploadResult(null)}
              disabled={!!avatarId}
            />
          </CardContent>
        </Card>

        {/* Right: name / analyzing / form / error */}
        <div className="space-y-4">
          {showStep1 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Select a photo to continue.</p>
              </CardContent>
            </Card>
          )}

          {showStep2 && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Avatar name</CardTitle>
                <CardDescription>Give your avatar a display name.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateAvatar} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="avatar-name">Name</Label>
                    <Input
                      id="avatar-name"
                      value={avatarName}
                      onChange={(e) => setAvatarName(e.target.value)}
                      placeholder="My avatar"
                      required
                      disabled={createLoading}
                    />
                  </div>
                  {createLoading && <Progress value={undefined} className="h-2" />}
                  {createError && (
                    <p className="text-sm text-destructive" role="alert">
                      {createError}
                    </p>
                  )}
                  <Button type="submit" disabled={createLoading}>
                    {createLoading ? 'Creating…' : 'Continue'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {showAnalyzing && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Analyzing avatar</CardTitle>
                <CardDescription>Analyzing avatar…</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={undefined} className="h-2" />
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              </CardContent>
            </Card>
          )}

          {showError && analysisError && (
            <Alert variant="destructive">
              <AlertTitle>Analysis failed</AlertTitle>
              <AlertDescription>
                <p className="mb-2">{analysisError.message}</p>
                <p className="text-sm mb-2">
                  Please upload another full-body photo (one person, clear view).
                </p>
                {analysisError.issues && analysisError.issues.length > 0 && (
                  <ul className="list-disc list-inside text-sm mb-2">
                    {analysisError.issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleUploadAnother}
                  className="mt-2"
                >
                  Upload another photo
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {showForm && formProfile && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Body profile</CardTitle>
                <CardDescription>
                  Review and edit the analysis. Then save to continue.
                </CardDescription>
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
                        {(['hips_wider', 'equal', 'shoulders_wider', 'unknown'] as const).map(
                          (opt) => (
                            <SelectItem key={opt} value={opt}>
                              {HIP_VS_SHOULDER_LABELS[opt]}
                            </SelectItem>
                          )
                        )}
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
                        {(['defined', 'moderate', 'low', 'unknown'] as const).map((opt) => (
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
                        {(['short_torso', 'balanced', 'long_torso', 'unknown'] as const).map(
                          (opt) => (
                            <SelectItem key={opt} value={opt}>
                              {TORSO_VS_LEGS_LABELS[opt]}
                            </SelectItem>
                          )
                        )}
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
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.body_shape_label)}%
                    </Badge>
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
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.body_volume)}%
                    </Badge>
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
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.verticality)}%
                    </Badge>
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
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.shoulder_slope)}%
                    </Badge>
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
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.neck_length)}%
                    </Badge>
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
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.undertone)}%
                    </Badge>
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
                    <Badge variant="secondary">
                      {confidencePercent(formProfile.confidence.contrast_level)}%
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

                <Button
                  type="button"
                  onClick={handleSaveContinue}
                  disabled={saveLoading}
                  className="w-full"
                >
                  {saveLoading ? 'Saving…' : 'Save & Continue'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
