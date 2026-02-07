import { cn } from '@client/lib/utils';

export interface BboxNorm {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GarmentImageProps {
  /** Upload ID to construct image URL */
  uploadId: string;
  /** Normalized bounding box (0-1). If null/undefined, shows the full image. */
  bbox?: BboxNorm | null;
  /** Additional CSS classes for the outer container */
  className?: string;
  /** Alt text */
  alt?: string;
}

/**
 * Displays a garment image cropped to its bounding box.
 *
 * When `bbox` is provided the component renders a container with `overflow: hidden`
 * and positions the full source image inside it so that only the bbox region is visible.
 * The container must have a defined size (via className, e.g. `aspect-square w-full`).
 */
export function GarmentImage({ uploadId, bbox, className, alt = 'Garment' }: GarmentImageProps) {
  const imageUrl = `/api/uploads/${uploadId}/image`;

  if (!bbox) {
    return <img src={imageUrl} alt={alt} className={cn('object-cover', className)} />;
  }

  // Scale so the bbox region covers the container (object-fit: cover behaviour).
  // We pick the axis that needs more zoom so neither side has empty space.
  const scaleX = 1 / bbox.w;
  const scaleY = 1 / bbox.h;
  const scale = Math.max(scaleX, scaleY);

  // Centre the bbox region within the container.
  // centerBbox (0-1) mapped into the scaled image, then offset so it sits at 50%.
  const centerX = bbox.x + bbox.w / 2;
  const centerY = bbox.y + bbox.h / 2;

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        src={imageUrl}
        alt={alt}
        className="absolute max-w-none"
        style={{
          width: `${scale * 100}%`,
          height: `${scale * 100}%`,
          left: `${50 - centerX * scale * 100}%`,
          top: `${50 - centerY * scale * 100}%`,
        }}
      />
    </div>
  );
}
