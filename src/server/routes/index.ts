import path from 'path';
import index from '../../client/index.html';
import { avatarsRoutes } from './avatars';
import { garmentsRoutes } from './garments';
import { outfitsRoutes } from './outfits';
import { uploadsRoutes } from './uploads';

const isProduction = process.env.NODE_ENV === 'production';
const DIST = path.join(process.cwd(), 'dist');

async function serveProductionStatic(req: Request): Promise<Response> {
  const distDir = path.resolve(DIST);
  const pathname = decodeURIComponent(new URL(req.url).pathname);
  const relative = pathname.replace(/^\//, '').replace(/\/$/, '') || 'index.html';
  const filePath = path.resolve(distDir, relative);

  if (!filePath.startsWith(distDir)) {
    return new Response(Bun.file(path.join(distDir, 'index.html')), {
      headers: { 'Content-Type': 'text/html' },
    });
  }

  const file = Bun.file(filePath);
  if (await file.exists()) {
    return new Response(file);
  }

  return new Response(Bun.file(path.join(distDir, 'index.html')));
}

export function getRoutes() {
  return {
    ...avatarsRoutes,
    ...garmentsRoutes,
    ...outfitsRoutes,
    ...uploadsRoutes,
    '/*': isProduction ? (req: Request) => serveProductionStatic(req) : index,
  };
}
