// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // À renseigner quand le domaine sera connu : sert aux adresses canoniques et au partage.
  // site: 'https://www.exemple.fr',
  compressHTML: true,
  build: { assets: 'assets' },
  devToolbar: { enabled: false },
  // three.js (scènes 3D) forme un fichier de ~540 Ko, chargé seulement à la demande.
  vite: { build: { chunkSizeWarningLimit: 600 } },
});
