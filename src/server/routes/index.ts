import index from '../../client/index.html';
import { authRoutes } from './auth';
import { meRoutes } from './me';
import { appRoutes } from './app';
import { avatarsRoutes } from './avatars';
import { garmentsRoutes } from './garments';
import { outfitsRoutes } from './outfits';
import { dbRoutes } from './db';
import { storageRoutes } from './storage';
import { geminiRoutes } from './gemini';
import { uploadsRoutes } from './uploads';

export function getRoutes() {
  return {
    ...authRoutes,
    ...meRoutes,
    ...appRoutes,
    ...avatarsRoutes,
    ...garmentsRoutes,
    ...outfitsRoutes,
    ...dbRoutes,
    ...storageRoutes,
    ...geminiRoutes,
    ...uploadsRoutes,
    '/*': index,
  };
}
