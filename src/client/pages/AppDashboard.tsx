import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';

export function AppDashboard() {
  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-xl font-bold">Dashboard</CardTitle>
          <CardDescription>
            Welcome. Create an avatar and add items to your wardrobe to get outfit suggestions.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}
