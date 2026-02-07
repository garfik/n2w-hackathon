import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
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
import { Label } from '@components/ui/label';
import { useGarmentsList, useDeleteGarment } from '@client/lib/apiHooks';
import { GarmentImage } from '@client/components/GarmentImage';
import type { GarmentListItem } from '@client/lib/n2wApi';
import { DETECT_CATEGORIES } from '@shared/ai-schemas/garment';
import { Plus, Trash2, Loader2 } from 'lucide-react';

const CATEGORY_OPTIONS = [...DETECT_CATEGORIES];

function GarmentCard({
  g,
  onDelete,
  isDeleting,
}: {
  g: GarmentListItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  return (
    <Card className="overflow-hidden transition-all hover:shadow-md group relative">
      <Link to={`/app/garments/${g.id}`} className="block">
        <div className="h-48 w-full bg-muted/50">
          <GarmentImage
            uploadId={g.uploadId}
            bbox={g.bboxNorm}
            alt={g.name ?? 'Garment'}
            className="w-full h-full"
          />
        </div>
        <CardContent className="p-3">
          <p className="font-medium truncate">{g.name ?? 'Unnamed'}</p>
          {g.category && (
            <Badge variant="secondary" className="mt-1 text-xs">
              {g.category}
            </Badge>
          )}
        </CardContent>
      </Link>

      {/* Delete button — visible on hover */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              disabled={isDeleting}
              onClick={(e) => e.stopPropagation()}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete garment?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete &ldquo;{g.name ?? 'this garment'}&rdquo; and remove it
                from any outfits. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(g.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}

export function GarmentsListPage() {
  const ALL_CATEGORIES_VALUE = '__all__';
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORIES_VALUE);
  const [searchQuery, setSearchQuery] = useState('');
  const params = useMemo(
    () => ({
      category: categoryFilter === ALL_CATEGORIES_VALUE ? undefined : categoryFilter,
      search: searchQuery.trim() || undefined,
    }),
    [categoryFilter, searchQuery]
  );

  const { data: garments, error, isPending } = useGarmentsList(params);
  const deleteMutation = useDeleteGarment();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate(id, {
      onSettled: () => setDeletingId(null),
    });
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Garments Library</h1>
          <p className="text-muted-foreground">Your wardrobe items</p>
        </div>
        <Button asChild>
          <Link to="/app/garments/new">
            <Plus className="h-4 w-4 mr-2" />
            Add garments from photo
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="search" className="text-sm text-muted-foreground whitespace-nowrap">
            Search
          </Label>
          <Input
            id="search"
            placeholder="By name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="category" className="text-sm text-muted-foreground whitespace-nowrap">
            Category
          </Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger id="category" className="w-36" size="sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES_VALUE}>All</SelectItem>
              {CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <Skeleton className="aspect-square w-full" />
              <CardContent className="p-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !garments?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No garments yet</CardTitle>
            <CardDescription>
              Add garments by uploading a photo with one or more items. We&apos;ll detect them for
              you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/app/garments/new">Add garments from photo</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
          {garments.map((g) => (
            <GarmentCard
              key={g.id}
              g={g}
              onDelete={handleDelete}
              isDeleting={deletingId === g.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
