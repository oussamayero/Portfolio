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

## Pages

| Adresse | Contenu |
| --- | --- |
| `/` | Accueil : hero, séquence signature, Shopify, motion design, automatisation, méthode, FAQ, contact |
| `/mentions-legales` | Mentions légales |
| `/confidentialite` | Politique de confidentialité |
| `/404` | Page introuvable |

## Modifier les textes

Les textes sont dans `src/content/`, au format JSON. Il n'est pas nécessaire de toucher au code.

| Fichier | Contenu |
| --- | --- |
| `src/content/site.json` | Nom, titre et description, navigation, bouton principal, formulaire, pages légales |
| `src/content/accueil/hero.json` | Titre, chapeau et liste des expertises du haut de page |
| `src/content/accueil/sequence.json` | Titre, statut et chapitres de la séquence signature |
| `src/content/accueil/shopify.json` | Section Shopify : situations, livrables, atelier de section, projets |
| `src/content/accueil/motion.json` | Vitrine motion : prestations et démonstrations |
| `src/content/accueil/automatisation.json` | Scénario illustratif, maquette, autres exemples, outils |
| `src/content/accueil/methode.json` | Étapes, formules, tarifs |
| `src/content/accueil/faq.json` | Questions et réponses |
| `src/content/accueil/contact.json` | Textes du formulaire, messages d'erreur et d'envoi |
| `src/content/pages/*.json` | Mentions légales, confidentialité, page introuvable |

Écrire les textes normalement : les apostrophes typographiques et les espaces avant `: ; ? !` sont ajoutées automatiquement.

Les repères jaunes « à fournir » et « à confirmer » signalent une information manquante. Rien n'est inventé à leur place : remplir le champ correspondant les fait disparaître. Dans les pages légales, une valeur `null` affiche « à fournir ».

`"chantier": true` dans `site.json` affiche les repères de développement (projets Shopify en attente, formulaire non relié). Le passer à `false` avant la mise en ligne.

### Relier le formulaire de contact

Dans `site.json` :

```json
"formulaire": { "action": "https://…", "email": "contact@…" }
```

- `action` : adresse du service d'envoi (Formspree, Basin, Getform…). Le formulaire y envoie les champs en `POST`. Le message « Demande envoyée » ne s'affiche que si le service confirme la réception.
- `email` : adresse proposée en solution de repli si l'envoi échoue.
- Tant que `action` est vide, le formulaire vérifie les champs puis indique clairement que la demande n'est pas partie.

Les liens « Présenter mon projet » de fin de section cochent automatiquement le besoin correspondant.

### Ajouter un projet Shopify

1. Déposer les captures dans `src/assets/projets/` (JPG, PNG ou WebP ; une capture desktop et une capture mobile).
2. Dans `shopify.json`, renseigner pour le projet : `captureDesktop` et `captureMobile` (nom du fichier), `secteur`, `contribution` et `description` (texte alternatif des images).
3. Les images sont redimensionnées et compressées automatiquement au moment du build.

Seuls les projets qui ont au moins une capture sont affichés.

### Démonstrations (marques fictives)

Les démonstrations utilisent des marques fictives (Ostral pour la séquence et l'atelier, Ilvane pour la vitrine motion) et les photos de `src/assets/demo/`. Elles sont toujours présentées comme « Concept de démonstration ».

- Remplacer une photo : garder le même nom de fichier dans `src/assets/demo/`, ou changer le champ `photo` d'un produit dans `shopify.json` (atelier).
- Le champ `cadrage` règle le point de recadrage d'une photo (`object-position` CSS).
- Avant la mise en ligne, vérifier les droits d'utilisation des photos (licence, modèles).
- Une vraie vidéo peut rejoindre la vitrine motion : voir `motion.json` (entrée de type `video`).

## Organisation

```
src/
  content/      textes modifiables
  components/   sections et éléments réutilisables
  layouts/      structure HTML commune (balises meta, polices), gabarit des pages secondaires
  pages/        accueil, pages légales, page introuvable
  scripts/      le fil, la séquence, la vitrine, le formulaire, les scènes 3D
  assets/       images optimisées au build (projets, photos de démonstration)
  styles/       jetons du design system et styles de base
public/         favicon, image de partage, robots.txt
```

### Animations

- GSAP anime la séquence signature et la vitrine motion. Il n'est chargé qu'à l'approche de ces sections.
- Le fil corail est calculé à partir de repères (`<Wp />`) posés dans chaque section : chaque repère a un numéro d'ordre (`i`), et peut porter un nœud (`node`), un virage (`route`) ou la boucle (`loop`). Un nœud avec `href` devient un raccourci cliquable vers sa section.
- L'atelier de section utilise les View Transitions du navigateur quand elles sont disponibles.
- Toutes les animations respectent le réglage « réduire les animations » du système.

### Scènes 3D (three.js)

Trois scènes, décoratives (le texte de la page suffit à tout comprendre) :

- le fil en volume, dans le hero : il se trace, suit le pointeur et se dénoue au défilement ;
- la maquette du scénario d'automatisation, jouée une fois à l'apparition ;
- le fil emmêlé de la page introuvable.

three.js n'est téléchargé qu'une fois la page chargée et à l'approche d'une scène. Le rendu s'arrête hors écran. Sans WebGL, les scènes ne s'affichent pas. Le code est dans `src/scripts/three/` ; l'ombrage en trois teintes franches et les couleurs sont dans `common.ts`.

## Mise en ligne

1. Renseigner le domaine dans `astro.config.mjs` (`site`) : adresses canoniques et image de partage absolues.
2. Relier le formulaire, remplir les pages légales, passer `chantier` à `false`.
3. Déployer le dossier `dist/` produit par `npm run build` sur Netlify, Vercel ou tout hébergement statique. La page `404.html` est reconnue par ces hébergeurs.
