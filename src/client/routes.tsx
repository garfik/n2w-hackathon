import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AppLayout } from './pages/AppLayout';
import { AvatarNewPage } from './pages/AvatarNewPage';
import { AvatarsListPage } from './pages/AvatarsListPage';
import { AvatarEditPage } from './pages/AvatarEditPage';
import { OutfitsListPage } from './pages/OutfitsListPage';
import { OutfitNewPage } from './pages/OutfitNewPage';
import { OutfitDetailPage } from './pages/OutfitDetailPage';
import { GarmentsListPage } from './pages/GarmentsListPage';
import { GarmentDetailPage } from './pages/GarmentDetailPage';
import { GarmentAddPage } from './pages/GarmentAddPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [{ index: true, element: <LandingPage /> }],
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/" replace /> },
      { path: 'avatars', element: <AvatarsListPage /> },
      { path: 'avatars/new', element: <AvatarNewPage /> },
      { path: 'avatars/:avatarId/edit', element: <AvatarEditPage /> },
      { path: 'avatars/:avatarId/outfits', element: <OutfitsListPage /> },
      { path: 'avatars/:avatarId/outfits/new', element: <OutfitNewPage /> },
      { path: 'avatars/:avatarId/outfits/:outfitId', element: <OutfitDetailPage /> },
      { path: 'garments', element: <GarmentsListPage /> },
      { path: 'garments/new', element: <GarmentAddPage /> },
      { path: 'garments/:garmentId', element: <GarmentDetailPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
