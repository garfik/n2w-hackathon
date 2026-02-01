import { useCallback, useState, type FormEvent } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Progress } from "@components/ui/progress";
import { X } from "lucide-react";

type GarmentEntry = { id: string; thumbnailUrl: string; name: string };

const OCCASIONS = ["casual", "work", "party", "date", "sport", "formal", "other"];

export function OutfitNewPage() {
  const navigate = useNavigate();
  const [garments, setGarments] = useState<GarmentEntry[]>([]);
  const [occasion, setOccasion] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setError(null);
    for (const file of acceptedFiles) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", file.name.replace(/\.[^.]+$/, "") || "Garment");
        const res = await fetch("/api/garments", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Upload failed");
        }
        const data = (await res.json()) as { ok: boolean; id: string; thumbnailUrl: string };
        setGarments((prev) => [
          ...prev,
          { id: data.id, thumbnailUrl: data.thumbnailUrl, name: file.name.replace(/\.[^.]+$/, "") || "Garment" },
        ]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        break;
      } finally {
        setUploading(false);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    disabled: uploading,
  });

  const removeGarment = (id: string) => {
    setGarments((prev) => prev.filter((g) => g.id !== id));
  };

  const handleCreateOutfit = async (e: FormEvent) => {
    e.preventDefault();
    if (garments.length === 0) {
      setError("Add at least one garment");
      return;
    }
    if (!occasion) {
      setError("Select an occasion");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/outfits", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ garmentIds: garments.map((g) => g.id), occasion }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Create failed");
      }
      const data = (await res.json()) as { ok: boolean; id: string };
      navigate(`/app/outfits/${data.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-xl font-bold">New outfit</CardTitle>
          <CardDescription>
            Add garments (upload images), then choose an occasion and create the outfit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="mb-2 block">Garments</Label>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
              }`}
            >
              <input {...getInputProps()} />
              <p className="text-muted-foreground">
                {isDragActive ? "Drop images here" : "Drag & drop garment images, or click to add"}
              </p>
            </div>
            {uploading && <Progress value={undefined} className="mt-2 h-2" />}
            {garments.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {garments.map((g) => (
                  <div key={g.id} className="relative rounded-lg border overflow-hidden group">
                    <img
                      src={g.thumbnailUrl}
                      alt={g.name}
                      className="h-24 w-full object-cover"
                    />
                    <p className="truncate px-2 py-1 text-xs text-muted-foreground">{g.name}</p>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon-sm"
                      className="absolute right-1 top-1 size-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGarment(g.id);
                      }}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleCreateOutfit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="occasion">Occasion</Label>
              <Select value={occasion} onValueChange={setOccasion} required>
                <SelectTrigger id="occasion">
                  <SelectValue placeholder="Select occasion" />
                </SelectTrigger>
                <SelectContent>
                  {OCCASIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={garments.length === 0 || !occasion || creating}
            >
              {creating ? "Creating…" : "Create outfit"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
