import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { cn } from '../lib/utils';
import { uploadFile as uploadFileApi, type UploadResult } from '../lib/n2wApi';
import { resizeImageFile } from '../lib/resizeImage';

export type { UploadResult };

export interface MultiImageUploadCardProps {
  /** Callback when all uploads complete successfully */
  onUploadedAll: (results: UploadResult[]) => void;
  /** Optional callback when uploads are cleared */
  onClear?: () => void;
  /** Accepted file types (default: image/*) */
  accept?: Record<string, string[]>;
  /** Maximum file size per file in bytes (default: 15MB) */
  maxSize?: number;
  /** Max width/height in pixels before upload (default: 1920). Images are resized on client. */
  maxDimensionPx?: number;
  /** Optional className */
  className?: string;
  /** Disable the uploader */
  disabled?: boolean;
  /** Show existing uploads (for edit mode) */
  existingUploads?: UploadResult[] | null;
}

type MultiUploadState =
  | { status: 'idle' }
  | { status: 'resizing'; count: number; total: number }
  | { status: 'uploading'; count: number; total: number; results: UploadResult[] }
  | { status: 'success'; results: UploadResult[] }
  | { status: 'error'; message: string };

const DEFAULT_ACCEPT = {
  'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.avif', '.gif', '.tiff'],
};

const DEFAULT_MAX_SIZE_BYTES = 15 * 1024 * 1024;
const DEFAULT_MAX_DIMENSION = 1920;

export function MultiImageUploadCard({
  onUploadedAll,
  onClear,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE_BYTES,
  maxDimensionPx = DEFAULT_MAX_DIMENSION,
  className,
  disabled = false,
  existingUploads,
}: MultiImageUploadCardProps) {
  const [state, setState] = useState<MultiUploadState>(
    existingUploads?.length
      ? { status: 'success', results: existingUploads }
      : { status: 'idle' }
  );

  const handleClear = useCallback(() => {
    setState({ status: 'idle' });
    onClear?.();
  }, [onClear]);

  const processAndUpload = useCallback(
    async (files: File[]) => {
      const total = files.length;
      const results: UploadResult[] = [];

      // Step 1: Resize all
      setState({ status: 'resizing', count: 0, total });
      const resized: File[] = [];
      for (let i = 0; i < files.length; i++) {
        setState((s) => (s.status === 'resizing' ? { ...s, count: i } : s));
        const resizedFile = await resizeImageFile(files[i]!, { maxDimensionPx });
        resized.push(resizedFile);
      }

      // Step 2: Upload each
      setState({ status: 'uploading', count: 0, total, results: [] });
      for (let i = 0; i < resized.length; i++) {
        const result = await uploadFileApi(resized[i]!);
        results.push(result);
        setState((s) =>
          s.status === 'uploading' ? { ...s, count: i + 1, results } : s
        );
      }

      setState({ status: 'success', results });
      onUploadedAll(results);
    },
    [maxDimensionPx, onUploadedAll]
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

      if (acceptedFiles.length === 0) return;
      processAndUpload(acceptedFiles);
    },
    [disabled, processAndUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: true,
    disabled:
      disabled ||
      state.status === 'resizing' ||
      state.status === 'uploading',
  });

  const showDropzone =
    state.status === 'idle' || (state.status === 'error' && !state.message);
  const inProgress = state.status === 'resizing' || state.status === 'uploading';
  const showResults = state.status === 'success' || inProgress;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-0">
        {showDropzone && !showResults && (
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
                'Drop photos here...'
              ) : (
                <>
                  Drag & drop one or more photos, or{' '}
                  <span className="text-primary">click to select</span>
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Multiple photos supported. Resized to {maxDimensionPx}px max before upload. Max{' '}
              {maxSize / 1024 / 1024}MB per file.
            </p>
          </div>
        )}

        {showResults && state.status !== 'idle' && (
          <div className="p-4 space-y-3">
            {inProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>
                  {state.status === 'resizing'
                    ? `Resizing... ${state.count}/${state.total}`
                    : `Uploading... ${state.count}/${state.total}`}
                </span>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {(state.status === 'uploading' || state.status === 'success'
                ? state.results
                : []
              ).map(
                (r, i) => (
                  <div
                    key={r.id}
                    className="relative w-20 h-20 rounded-md overflow-hidden bg-muted border"
                  >
                    <img
                      src={r.url}
                      alt={`Upload ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {state.status === 'success' && (
                      <CheckCircle2 className="absolute bottom-0.5 right-0.5 h-4 w-4 text-green-600 bg-background/80 rounded" />
                    )}
                  </div>
                )
              )}
            </div>

            {state.status === 'success' && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {state.results.length} photo{state.results.length === 1 ? '' : 's'}{' '}
                  uploaded (resized to {maxDimensionPx}px max)
                </span>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  <X className="h-4 w-4 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
          </div>
        )}

        {state.status === 'error' && state.message && (
          <Alert variant="destructive" className="m-4 mt-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
