import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { hasAvatarIds } from '@client/lib/avatarStorage';

export function LandingPage() {
  const navigate = useNavigate();

  const handleStart = () => {
    if (hasAvatarIds()) {
      navigate('/app/avatars');
    } else {
      navigate('/app/avatars/new');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="gap-3 text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Nothing 2 Wear</CardTitle>
          <CardDescription className="text-base leading-relaxed">
            Upload a photo of yourself, add your wardrobe, and get AI&#8209;powered outfit
            suggestions with virtual try&#8209;on. See how clothes look on <em>you</em> before you
            decide.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button size="lg" onClick={handleStart}>
            Let&apos;s try
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
