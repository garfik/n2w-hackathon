import {
  createBrowserRouter,
  Navigate,
  redirect,
  type LoaderFunctionArgs,
} from "react-router-dom";
import { AppLayout } from "./pages/AppLayout";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AppDashboard } from "./pages/AppDashboard";
import { AvatarNewPage } from "./pages/AvatarNewPage";
import { OutfitsListPage } from "./pages/OutfitsListPage";
import { OutfitNewPage } from "./pages/OutfitNewPage";
import { OutfitDetailPage } from "./pages/OutfitDetailPage";

async function appBootstrapLoader({ request }: LoaderFunctionArgs) {
  const res = await fetch("/api/app/bootstrap", { credentials: "include" });
  if (res.status === 401) {
    return redirect("/login");
  }
  if (!res.ok) {
    throw new Response("Bootstrap failed", { status: res.status });
  }
  const data = (await res.json()) as { ok: boolean; avatarExists?: boolean };
  const avatarExists = data.avatarExists ?? false;
  const pathname = new URL(request.url).pathname;
  const isAvatarNew = pathname === "/app/avatar/new" || pathname.endsWith("/app/avatar/new");
  if (!avatarExists && !isAvatarNew) {
    return redirect("/app/avatar/new");
  }
  return null;
}

async function landingLoader() {
  const res = await fetch("/api/me", { credentials: "include" });
  const loggedIn = res.ok && ((await res.json()) as { ok?: boolean }).ok === true;
  return { loggedIn };
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
    loader: landingLoader,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/app",
    element: <AppLayout />,
    loader: appBootstrapLoader,
    children: [
      { index: true, element: <AppDashboard /> },
      { path: "avatar/new", element: <AvatarNewPage /> },
      { path: "outfits", element: <OutfitsListPage /> },
      { path: "outfits/new", element: <OutfitNewPage /> },
      { path: "outfits/:id", element: <OutfitDetailPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
