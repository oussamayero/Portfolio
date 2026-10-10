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
| `src/content/accueil/sequence.json` | Titre, statut et chapitres de la séquence signature |
| `src/content/accueil/shopify.json` | Section Shopify : situations, livrables, atelier de section, projets |

### Ajouter un projet Shopify

1. Déposer les captures dans `src/assets/projets/` (JPG, PNG ou WebP ; une capture desktop et une capture mobile).
2. Dans `shopify.json`, renseigner pour le projet : `captureDesktop` et `captureMobile` (nom du fichier), `secteur`, `contribution` et `description` (texte alternatif des images).
3. Les images sont redimensionnées et compressées automatiquement au moment du build.

Seuls les projets qui ont au moins une capture sont affichés. Tant qu'aucune capture n'est fournie, un repère compact « emplacements prêts » les remplace (visible uniquement avec `"chantier": true`). Un champ vide affiche « à fournir » ; les livrables marqués `"aConfirmer": true` affichent « à confirmer ».

### Démonstrations (marque fictive Ostral)

La séquence signature et l'atelier de section utilisent une marque fictive, Ostral, et les photos de `src/assets/demo/`. Elles sont toujours présentées comme « Concept de démonstration · marque fictive ».

- Remplacer une photo : garder le même nom de fichier dans `src/assets/demo/`, ou changer le champ `photo` d'un produit dans `shopify.json` (atelier).
- Produits, prix et textes de l'atelier : bloc `atelier` de `shopify.json`. Le champ `cadrage` règle le point de recadrage de la photo (`object-position` CSS).
- Avant la mise en ligne, vérifier les droits d'utilisation des photos (licence, modèles).

Écrire les textes normalement : les apostrophes typographiques et les espaces avant `: ; ? !` sont ajoutées automatiquement.

`"chantier": true` dans `site.json` affiche le bloc temporaire qui liste les sections à venir. Le passer à `false` quand toutes les sections sont en place.

## Organisation

```
src/
  content/      textes modifiables
  components/   sections et éléments réutilisables
  layouts/      structure HTML commune (balises meta, polices)
  scripts/      le fil, la séquence signature, préférences d'animation
  assets/       images optimisées au build (projets, photos de démonstration)
  styles/       jetons du design system et styles de base
public/         favicon, robots.txt
```

Les animations de la séquence signature utilisent GSAP, chargé uniquement à l'approche de la section.

Le fil corail est calculé à partir de repères (`<Wp />`) posés dans chaque section : chaque repère a un numéro d'ordre (`i`), et peut porter un nœud (`node`), un virage (`route`) ou la boucle (`loop`). Un nœud avec `href` devient un raccourci cliquable vers sa section ; il émet une impulsion quand le fil l'atteint.

L'atelier de section utilise les View Transitions du navigateur quand elles sont disponibles ; sinon, les réglages s'appliquent sans animation. Toutes les animations respectent le réglage « réduire les animations » du système.

## Mise en ligne

Le dossier `dist/` produit par `npm run build` peut être déployé tel quel sur Netlify, Vercel ou tout hébergement statique.
