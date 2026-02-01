import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@components/ui/card";

export function AvatarNewPage() {
  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-xl font-bold">New avatar</CardTitle>
          <CardDescription>
            Avatar creation form (photo, body parameters) will go here.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
