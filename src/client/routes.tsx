import { createBrowserRouter, Navigate, redirect, type LoaderFunctionArgs } from 'react-router-dom';
import { AppLayout } from './pages/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AppDashboard } from './pages/AppDashboard';
import { AvatarNewPage } from './pages/AvatarNewPage';
import { AvatarsListPage } from './pages/AvatarsListPage';
import { AvatarEditPage } from './pages/AvatarEditPage';
import { OutfitsListPage } from './pages/OutfitsListPage';
import { OutfitNewPage } from './pages/OutfitNewPage';
import { OutfitDetailPage } from './pages/OutfitDetailPage';

async function appBootstrapLoader({ request }: LoaderFunctionArgs) {
  const res = await fetch('/api/app/bootstrap', { credentials: 'include' });
  if (res.status === 401) {
    return redirect('/login');
  }
  if (!res.ok) {
    throw new Response('Bootstrap failed', { status: res.status });
  }
  const data = (await res.json()) as { ok: boolean; avatarExists?: boolean };
  const avatarExists = data.avatarExists ?? false;
  const pathname = new URL(request.url).pathname;

  // If no avatars exist, redirect to create first one (except if already there)
  if (!avatarExists && pathname !== '/app/avatars/new') {
    return redirect('/app/avatars/new');
  }

  return { avatarExists };
}

async function landingLoader() {
  const res = await fetch('/api/me', { credentials: 'include' });
  const loggedIn = res.ok && ((await res.json()) as { ok?: boolean }).ok === true;
  return { loggedIn };
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
    loader: landingLoader,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/app',
    element: <AppLayout />,
    loader: appBootstrapLoader,
    children: [
      { index: true, element: <AppDashboard /> },
      { path: 'avatars', element: <AvatarsListPage /> },
      { path: 'avatars/new', element: <AvatarNewPage /> },
      { path: 'avatars/:avatarId/edit', element: <AvatarEditPage /> },
      { path: 'avatars/:avatarId/outfits', element: <OutfitsListPage /> },
      { path: 'avatars/:avatarId/outfits/new', element: <OutfitNewPage /> },
      { path: 'avatars/:avatarId/outfits/:outfitId', element: <OutfitDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
