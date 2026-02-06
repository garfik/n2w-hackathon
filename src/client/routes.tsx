import { createBrowserRouter, Navigate, redirect, type LoaderFunctionArgs } from 'react-router-dom';
import { getAppBootstrap, getMe } from './lib/n2wApi';
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
import { GarmentsListPage } from './pages/GarmentsListPage';

async function appBootstrapLoader({ request }: LoaderFunctionArgs) {
  const result = await getAppBootstrap();
  if ('status' in result) return redirect('/login');
  const pathname = new URL(request.url).pathname;
  const allowedWithoutAvatar = ['/app/avatars/new', '/app/garments'];
  if (!result.avatarExists && !allowedWithoutAvatar.some((p) => pathname === p)) {
    return redirect('/app/avatars/new');
  }
  return { avatarExists: result.avatarExists };
}

async function landingLoader() {
  try {
    await getMe();
    return { loggedIn: true };
  } catch {
    return { loggedIn: false };
  }
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
      { path: 'garments', element: <GarmentsListPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
