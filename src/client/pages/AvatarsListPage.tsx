import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Skeleton } from '@components/ui/skeleton';
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
import { useAvatars, useDeleteAvatar } from '@client/lib/useAvatars';
import type { Avatar } from '@client/lib/n2wApi';
import { Loader2 } from 'lucide-react';

function getAvatarImageUrl(photoUploadId: string | null): string | null {
  if (!photoUploadId) return null;
  return `/api/uploads/${photoUploadId}/image`;
}

function AvatarCard({ avatar }: { avatar: Avatar }) {
  const imageUrl = getAvatarImageUrl(avatar.photoUploadId);
  const deleteMutation = useDeleteAvatar();

  return (
    <Card className="relative transition-all hover:shadow-md">
      <Link to={`/app/avatars/${avatar.id}/outfits`}>
        <CardHeader className="pb-2">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={avatar.name}
              className="h-40 w-full object-contain rounded-md bg-muted/50"
            />
          ) : (
            <div className="h-40 w-full rounded-md bg-muted/50 flex items-center justify-center">
              <span className="text-muted-foreground">No image</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="pb-2">
          <CardTitle className="text-lg">{avatar.name}</CardTitle>
          <CardDescription>
            Created {new Date(avatar.createdAt).toLocaleDateString()}
          </CardDescription>
        </CardContent>
      </Link>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link to={`/app/avatars/${avatar.id}/outfits`}>Outfits</Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to={`/app/avatars/${avatar.id}/edit`}>Edit</Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete avatar?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete &quot;{avatar.name}&quot; and all associated outfits.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate(avatar.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export function AvatarsListPage() {
  const { avatars, isEmpty, isPending } = useAvatars();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Avatars</h1>
          <p className="text-muted-foreground">Select an avatar to view and manage outfits</p>
        </div>
        <Button asChild>
          <Link to="/app/avatars/new">New avatar</Link>
        </Button>
      </div>

      {isPending && isEmpty ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-40 w-full rounded-md" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isEmpty ? (
        <Card>
          <CardHeader>
            <CardTitle>No avatars yet</CardTitle>
            <CardDescription>
              Create your first avatar by uploading a full-body photo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/app/avatars/new">Create avatar</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {avatars.map((avatar) => (
            <AvatarCard key={avatar.id} avatar={avatar} />
          ))}
        </div>
      )}
    </div>
  );
}
