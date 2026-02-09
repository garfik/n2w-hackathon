import { useRef, useState, type FormEvent } from 'react';
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
import {
  analyzeBodyPhoto,
  generateAvatarImage,
  type AnalyzeErrorResponse,
} from '@client/lib/n2wApi';
import { useCreateAvatar, useUpdateAvatar } from '@client/lib/useAvatars';
import type { AvatarBodyProfile, AvatarBodyProfileClean } from '@shared/dtos/avatar';
import { ImageUploadCard, type UploadResult } from '@client/components/ImageUploadCard';
import { Textarea } from '@components/ui/textarea';

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
  const [bodyUploadResult, setBodyUploadResult] = useState<UploadResult | null>(null);
  const [faceUploadResult, setFaceUploadResult] = useState<UploadResult | null>(null);
  const [avatarName, setAvatarName] = useState('');
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('idle');
  const [formProfile, setFormProfile] = useState<AvatarBodyProfile | null>(null);
  const [analysisError, setAnalysisError] = useState<AnalyzeErrorResponse['error'] | null>(null);
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedUploadId, setGeneratedUploadId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generatePrompt, setGeneratePrompt] = useState('');
  const createSubmittingRef = useRef(false);

  const handleRunAnalysis = async () => {
    if (!bodyUploadResult) return;
    setAnalysisStatus('loading');
    setAnalysisError(null);
    try {
      const result = await analyzeBodyPhoto({ bodyPhotoUploadId: bodyUploadResult.id });
      if (result.success === true) {
        setFormProfile(result.data);
        setAnalysisStatus('success');
      } else {
        setAnalysisError(result.error);
        setAnalysisStatus('error');
      }
    } catch {
      setAnalysisError({ code: 'LOW_QUALITY', message: 'Analysis failed', issues: [] });
      setAnalysisStatus('error');
    }
  };

  const handleGenerate = async () => {
    if (!bodyUploadResult || !faceUploadResult) return;
    if (typeof heightCm !== 'number' || !Number.isFinite(heightCm) || heightCm < 50) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const genResult = await generateAvatarImage({
        bodyPhotoUploadId: bodyUploadResult.id,
        facePhotoUploadId: faceUploadResult.id,
        heightCm,
        prompt: generatePrompt.trim() || undefined,
      });
      setGeneratedUploadId(genResult.data.uploadId);
      setGeneratedImageUrl(`/api/uploads/${genResult.data.uploadId}/image`);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateAvatar = async (e: FormEvent) => {
    e.preventDefault();
    if (!generatedUploadId) return;
    if (createSubmittingRef.current) return;
    createSubmittingRef.current = true;
    setCreateError(null);
    setCreateLoading(true);
    try {
      const newId = await createMutation.mutateAsync({
        name: avatarName.trim() || 'Avatar',
        uploadId: generatedUploadId,
      });
      const height =
        typeof heightCm === 'number' && Number.isFinite(heightCm) ? heightCm : undefined;
      if (formProfile) {
        await updateMutation.mutateAsync({
          avatarId: newId,
          bodyProfileJson: toCleanProfile(formProfile),
          heightCm: height,
        });
      }
      navigate(`/app/avatars/${newId}/outfits`, { replace: true });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      createSubmittingRef.current = false;
      setCreateLoading(false);
    }
  };

  const handleUploadAnother = () => {
    createSubmittingRef.current = false;
    setBodyUploadResult(null);
    setFaceUploadResult(null);
    setAvatarName('');
    setGeneratedImageUrl(null);
    setGeneratedUploadId(null);
    setGenerating(false);
    setGenerateError(null);
    setGeneratePrompt('');
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

  const hasBothUploads = !!bodyUploadResult && !!faceUploadResult;
  const hasGenerated = !!generatedUploadId && !!generatedImageUrl;
  const showStep1 = !hasBothUploads;
  const showStep2 =
    hasBothUploads && !formProfile && analysisStatus !== 'loading' && analysisStatus !== 'error';
  const showAnalyzing = analysisStatus === 'loading';
  const showAnalysisError = analysisStatus === 'error';
  const showForm = !!formProfile;
  const showGenerateSection = !!formProfile;
  const showSaveStep = hasGenerated;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/app/avatars">&larr; Back to avatars</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: body + face uploads */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-xl font-bold">Full-body photo</CardTitle>
              <CardDescription>
                Upload a full-height body photo. One person, front-facing works best.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUploadCard
                existingUpload={bodyUploadResult ?? undefined}
                onUploaded={setBodyUploadResult}
                onClear={() => setBodyUploadResult(null)}
                disabled={showForm}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="gap-2">
              <CardTitle className="text-xl font-bold">Face photo</CardTitle>
              <CardDescription>Upload a detailed face close-up of the same person.</CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUploadCard
                existingUpload={faceUploadResult ?? undefined}
                onUploaded={setFaceUploadResult}
                onClear={() => setFaceUploadResult(null)}
                disabled={showForm}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: steps / analysis / form / generate / save */}
        <div className="space-y-4">
          {showStep1 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  Upload both a full-body photo and a face close-up to continue.
                </p>
              </CardContent>
            </Card>
          )}

          {showStep2 && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Height &amp; body analysis</CardTitle>
                <CardDescription>
                  Enter your height, then run body analysis to detect proportions and traits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="height-cm">Height (cm)</Label>
                  <Input
                    id="height-cm"
                    type="number"
                    min={50}
                    max={250}
                    value={heightCm}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHeightCm(v === '' ? '' : Number(v));
                    }}
                    placeholder="170"
                  />
                </div>
                <Button
                  onClick={handleRunAnalysis}
                  disabled={typeof heightCm !== 'number' || heightCm < 50}
                >
                  Run body analysis
                </Button>
              </CardContent>
            </Card>
          )}

          {showAnalyzing && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Analyzing body</CardTitle>
                <CardDescription>Analyzing your body photo…</CardDescription>
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

          {showAnalysisError && analysisError && (
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
                  Upload other photos
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {showSaveStep && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Save avatar</CardTitle>
                <CardDescription>
                  Happy with the result? Give it a name and continue.
                </CardDescription>
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
                    {createLoading ? 'Saving…' : 'Save & continue'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {showGenerateSection && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Generate avatar</CardTitle>
                <CardDescription>
                  Optionally add a prompt to guide the generation (e.g. pose, style). Then generate
                  the avatar image.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="generate-prompt">Additional instructions (optional)</Label>
                  <Textarea
                    id="generate-prompt"
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="e.g. relaxed pose, natural smile, professional look"
                    rows={3}
                    maxLength={2000}
                    disabled={generating}
                    className="resize-none"
                  />
                </div>
                {generating && <Progress value={undefined} className="h-2" />}
                {generateError && (
                  <p className="text-sm text-destructive" role="alert">
                    {generateError}
                  </p>
                )}
                <Button
                  onClick={handleGenerate}
                  disabled={generating || typeof heightCm !== 'number' || heightCm < 50}
                >
                  {generating ? 'Generating…' : 'Generate avatar'}
                </Button>
                {generatedImageUrl && (
                  <div className="space-y-3 pt-2 border-t">
                    <img
                      src={generatedImageUrl}
                      alt="Generated avatar"
                      className="w-full rounded-md object-contain max-h-[400px] bg-muted"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                      disabled={generating}
                      className="w-full"
                    >
                      {generating ? 'Regenerating…' : 'Regenerate'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {showForm && formProfile && (
            <Card>
              <CardHeader className="gap-2">
                <CardTitle className="text-xl font-bold">Body profile</CardTitle>
                <CardDescription>
                  Review and edit the analysis. Then generate the avatar below.
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
                  <Label htmlFor="height-cm-form">Height (cm)</Label>
                  <Input
                    id="height-cm-form"
                    type="number"
                    min={50}
                    max={250}
                    placeholder="170"
                    value={heightCm === '' ? '' : heightCm}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHeightCm(v === '' ? '' : Number(v));
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
