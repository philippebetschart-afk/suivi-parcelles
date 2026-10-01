# Prompt de démarrage pour Claude Code

Coller ce texte dans Claude Code, une fois lancé dans le dossier du projet contenant CLAUDE.md.

```
Lis CLAUDE.md. Je veux créer un outil de suivi des travaux sur mes parcelles de vigne.

Fonctions V1 : liste des parcelles, référentiel des produits, saisie d'interventions
(un traitement = plusieurs produits à certaines doses sur plusieurs parcelles),
historique par parcelle avec filtres, cumuls annuels de cuivre et d'azote par parcelle,
et export du registre pour le contrôle bio (Excel et PDF).

Je suis débutant. Commence par me proposer un plan en étapes, sans écrire de code,
et pose-moi tes questions avant de commencer. Explique-moi aussi quels comptes
(Supabase, Vercel) je dois créer et à quel moment.
```

## Avant de lancer
1. Installer Claude Code (voir docs.claude.com, section installation, version Windows).
2. Créer un dossier `suivi-parcelles` et y copier CLAUDE.md.
3. Ouvrir un terminal dans ce dossier et taper `claude`, puis coller le prompt ci-dessus.
