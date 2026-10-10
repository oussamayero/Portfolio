# Ouza Studio

Site d'Ouza Studio : boutiques Shopify, motion design et automatisation.
Construit avec [Astro](https://astro.build), en site statique.

## Démarrer

Prérequis : Node.js 22.12 ou plus récent.

```bash
npm install
npm run dev      # site local sur http://localhost:4321
npm run build    # site final dans dist/
npm run preview  # aperçu du site final
```

## Modifier les textes

Les textes sont dans `src/content/`, au format JSON. Il n'est pas nécessaire de toucher au code.

| Fichier | Contenu |
| --- | --- |
| `src/content/site.json` | Nom, titre et description de la page, navigation, bouton principal |
| `src/content/accueil/hero.json` | Titre, chapeau et liste des expertises du haut de page |

Écrire les textes normalement : les apostrophes typographiques et les espaces avant `: ; ? !` sont ajoutées automatiquement.

`"chantier": true` dans `site.json` affiche le bloc temporaire qui liste les sections à venir. Le passer à `false` quand toutes les sections sont en place.

## Organisation

```
src/
  content/      textes modifiables
  components/   sections et éléments réutilisables
  layouts/      structure HTML commune (balises meta, polices)
  scripts/      le fil, préférences d'animation
  styles/       jetons du design system et styles de base
public/         favicon, robots.txt
```

Le fil corail est calculé à partir de repères (`<Wp />`) posés dans chaque section : chaque repère a un numéro d'ordre (`i`), et peut porter un nœud (`node`), un virage (`route`) ou la boucle (`loop`).

## Mise en ligne

Le dossier `dist/` produit par `npm run build` peut être déployé tel quel sur Netlify, Vercel ou tout hébergement statique.
