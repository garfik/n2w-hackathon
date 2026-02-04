import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { cn } from '../lib/utils';

export interface UploadResult {
  id: string;
  url: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface ImageUploadCardProps {
  /** Callback when upload completes successfully */
  onUploaded: (result: UploadResult) => void;
  /** Optional callback when upload is cleared/reset */
  onClear?: () => void;
  /** Accepted file types (default: image/*) */
  accept?: Record<string, string[]>;
  /** Maximum file size in bytes (default: 15MB) */
  maxSize?: number;
  /** Optional className for the card */
  className?: string;
  /** Disable the uploader */
  disabled?: boolean;
  /** Show existing upload (for edit mode) */
  existingUpload?: UploadResult | null;
}

type UploadState =
  | { status: 'idle' }
  | { status: 'preview'; file: File; previewUrl: string }
  | { status: 'uploading'; file: File; previewUrl: string; progress: number }
  | { status: 'success'; result: UploadResult; previewUrl: string }
  | { status: 'error'; message: string; file?: File; previewUrl?: string };

const DEFAULT_ACCEPT = {
  'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.gif', '.tiff'],
};

const DEFAULT_MAX_SIZE_BYTES = 15 * 1024 * 1024;

export function ImageUploadCard({
  onUploaded,
  onClear,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE_BYTES,
  className,
  disabled = false,
  existingUpload,
}: ImageUploadCardProps) {
  const [state, setState] = useState<UploadState>(
    existingUpload
      ? { status: 'success', result: existingUpload, previewUrl: existingUpload.url }
      : { status: 'idle' }
  );

  const handleClear = useCallback(() => {
    // Revoke object URL if we created one
    if (
      (state.status === 'preview' || state.status === 'uploading' || state.status === 'error') &&
      state.previewUrl?.startsWith('blob:')
    ) {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState({ status: 'idle' });
    onClear?.();
  }, [state, onClear]);

  const uploadFile = useCallback(
    async (file: File, previewUrl: string) => {
      setState({ status: 'uploading', file, previewUrl, progress: 0 });

      const formData = new FormData();
      formData.append('file', file);

      try {
        // Using fetch with no progress tracking (Bun doesn't support upload progress easily)
        // Simulate progress for UX
        const progressInterval = setInterval(() => {
          setState((prev) => {
            if (prev.status !== 'uploading') return prev;
            const newProgress = Math.min(prev.progress + 10, 90);
            return { ...prev, progress: newProgress };
          });
        }, 200);

        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        clearInterval(progressInterval);

        const json = await response.json();

        if (!response.ok || !json.ok) {
          const errorMessage =
            json.error?.message || json.error || `Upload failed (${response.status})`;
          setState({ status: 'error', message: errorMessage, file, previewUrl });
          return;
        }

        const result: UploadResult = json.data;
        // Use server URL for preview so we show the converted JPEG (e.g. after HEIC)
        setState({ status: 'success', result, previewUrl: result.url });
        onUploaded(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setState({ status: 'error', message, file, previewUrl });
      }
    },
    [onUploaded]
  );

  const onDrop = useCallback(
    (
      acceptedFiles: File[],
      fileRejections: { file: File; errors: readonly { message: string }[] }[]
    ) => {
      if (disabled) return;

      const firstRejection = fileRejections[0];
      if (firstRejection) {
        const errors = firstRejection.errors.map((e) => e.message).join(', ');
        setState({ status: 'error', message: errors });
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      const previewUrl = URL.createObjectURL(file);
      uploadFile(file, previewUrl);
    },
    [disabled, uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
    disabled: disabled || state.status === 'uploading',
  });

  const showDropzone = state.status === 'idle' || state.status === 'error';
  const showPreview =
    state.status === 'preview' ||
    state.status === 'uploading' ||
    state.status === 'success' ||
    (state.status === 'error' && state.previewUrl);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        {showDropzone && !showPreview && (
          <div
            {...getRootProps()}
            className={cn(
              'flex flex-col items-center justify-center p-8 cursor-pointer transition-colors min-h-[200px]',
              'border-2 border-dashed rounded-lg m-4',
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground text-center">
              {isDragActive ? (
                'Drop the image here...'
              ) : (
                <>
                  Drag & drop an image here, or{' '}
                  <span className="text-primary">click to select</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              JPEG, PNG, WebP, HEIC/HEIF supported. Max {maxSize / 1024 / 1024}MB.
            </p>
          </div>
        )}

        {showPreview && (
          <div className="relative">
            <img
              src={
                state.status === 'success'
                  ? state.previewUrl
                  : (state as { previewUrl: string }).previewUrl
              }
              alt="Preview"
              className="w-full h-auto max-h-[400px] object-contain bg-muted"
            />

            {/* Clear button */}
            {state.status !== 'uploading' && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}

            {/* Status overlay */}
            {state.status === 'uploading' && (
              <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-sm font-medium mb-2">Uploading...</p>
                <Progress value={state.progress} className="w-48" />
              </div>
            )}

            {state.status === 'success' && (
              <div className="absolute bottom-2 left-2 right-12 flex items-center gap-2 bg-background/90 rounded-md px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-xs text-muted-foreground truncate">
                  {state.result.width}×{state.result.height} • Uploaded
                </span>
              </div>
            )}
          </div>
        )}

        {state.status === 'error' && (
          <Alert variant="destructive" className="m-4 mt-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
