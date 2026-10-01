# Suivi parcellaire – Domaine de Viaud

Application web de suivi des travaux viticoles (agriculture biologique et biodynamique).
Utilisateur unique : le vigneron. Sert aussi de base pour le registre présenté au contrôle bio.

## Règles générales
- Interface et textes en français. Dates au format JJ/MM/AAAA. Décimales avec virgule à l'affichage.
- Usage sur téléphone (dans les vignes) et sur ordinateur : conception « mobile d'abord »,
  boutons larges, saisie d'une intervention en moins d'une minute.
- Pas de mode hors ligne en V1.
- L'utilisateur est débutant en développement : expliquer simplement ce qui est fait,
  avancer par petites étapes, et faire tester chaque étape dans le navigateur avant la suivante.
- Ne jamais supprimer une donnée sans confirmation explicite. Prévoir un export complet des données.
- Les données constituent un registre réglementaire : ne jamais les perdre, prévoir des sauvegardes.

## Stack technique
- Next.js (application web installable sur téléphone, PWA).
- Supabase : base Postgres et authentification par e-mail + mot de passe (un seul utilisateur).
- Déploiement sur Vercel.
- Export du registre en Excel et en PDF.

## Modèle de données
- **Parcelle** : nom, surface (ha), cépage, année de plantation, remarques.
- **Produit (référentiel)** : nom, unité (L ou kg), matière active (cuivre, azote, soufre, autre),
  quantité de matière active par unité (g/L ou g/kg).
  Exemple : Héliocuivre, unité L, cuivre, 450 g/L.
- **Intervention** : date, type (sol, traitement, amendement, taille, autre),
  justification/cible (ex. mildiou), remarques.
  - Parcelles concernées : une ou plusieurs (bouton « toutes »).
  - Produits utilisés : un ou plusieurs, chacun avec sa dose par hectare (L/ha ou kg/ha selon le produit).
  - La dose par hectare est identique sur toutes les parcelles d'une même intervention.
  - Pour chaque parcelle, calculer automatiquement : quantité de produit (dose × surface)
    et quantité de matière active par hectare (dose × g de matière active par unité), toujours en poids (kg).

## Bilans et cumuls
- Cuivre métal (kg/ha) cumulé par parcelle : par année civile et en moyenne glissante sur 7 ans.
- Azote (unités N/ha, en kg) cumulé par parcelle et par année.
- Alerte visuelle quand le cuivre approche du plafond (référence : 4 kg/ha/an en moyenne lissée
  sur 7 ans, soit 28 kg/ha sur 7 ans ; valeur à confirmer avec l'organisme certificateur
  et à rendre paramétrable).
- Ces cumuls apparaissent dans l'historique de chaque parcelle et dans l'export.

## Écrans de la V1
1. Parcelles : liste, ajout, modification.
2. Produits : référentiel, ajout, modification.
3. Saisie d'une intervention : date, type, parcelles cochées, produits et doses.
4. Historique par parcelle : toutes les interventions, filtres par type et par période, cumuls Cu et N.
5. Export du registre pour le contrôle bio (Excel et PDF), filtrable par période.

## Hors périmètre V1
Hors ligne, plusieurs utilisateurs, météo, coûts, analyses de sol, cartographie.

## Décisions prises avec l'utilisateur (30/09/2026)
- Environ 15 parcelles, liste existante dans un fichier Excel (à importer à l'étape Parcelles).
- Un produit = une seule matière active.
- Azote exprimé en unités d'azote (1 unité = 1 kg N). Dans la fiche produit, la teneur se saisit
  en unités d'azote pour 100 kg de produit (équivaut au % N), convertie en interne en g/kg.
- Une parcelle est toujours traitée sur toute sa surface (pas de surface traitée partielle).
- Type d'intervention « biodynamie » : simple mention que c'est fait, sans produit ni dose obligatoire.
- Plafond cuivre calculé sur la moyenne du domaine : total kg Cu de toutes les parcelles ÷ surface totale des vignes.
  Moyenne sur 7 ans = année en cours + 6 précédentes. Les chiffres par parcelle restent affichés pour information.
- Alerte cuivre : quand le total de l'année en cours atteint 3 kg/ha (moyenne du domaine) ; seuil paramétrable.
  Les parcelles qui dépassent individuellement 3 kg/ha sont aussi signalées.
- Historique cuivre des années passées disponible uniquement pour l'ensemble du domaine (pas par parcelle) :
  saisi comme un total annuel du domaine, intégré au calcul de la moyenne sur 7 ans.
- Modification d'une intervention : garder une trace (date de modification + ancienne valeur).
- Téléphone Android. Certificateur : pas encore précisé.
- Parcelles importées depuis export_parcelle.xlsx : les 15 lignes (vignes, vergers, jachères),
  surface = colonne « Surface », noms « Parcelle N » (doublons 12 et 13 : « a » / « b »).
- Type de parcelle (vigne, verger, jachère, autre) : les moyennes du domaine (cuivre, azote)
  ne portent que sur les parcelles de type vigne.
- Une parcelle n'est jamais supprimée, seulement archivée (l'historique reste complet).
- Structure de la base : scripts SQL dans supabase/migrations/, exécutés à la main dans le SQL Editor.

## Vérifications à faire avec le certificateur
Les champs exacts exigés dans le registre (opérateur, surface traitée, volume de bouillie, etc.)
sont à confirmer ; le modèle doit rester facile à étendre.

@AGENTS.md
