# MaltResponse

## What This Is

Un outil web multi-utilisateurs pour générer des réponses personnalisées à des offres d'emploi sur Malt.fr. Chaque utilisateur uploade son CV, ses anciennes réponses et ses infos de profil, puis colle une offre et obtient un message de candidature prêt à copier-coller, généré par Claude Opus 4.

## Core Value

Générer en un clic une réponse de candidature Malt pertinente et personnalisée, alimentée par le contexte complet du candidat.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Authentification magic link via Supabase
- [ ] Upload de contenu candidat (CV, anciennes réponses, infos profil) — fichiers PDF + texte libre
- [ ] Interface de génération : input offre + description entreprise + site entreprise → bouton "Générer réponse"
- [ ] Génération via Claude Opus 4 (Anthropic SDK côté serveur) avec contexte candidat complet
- [ ] Réponse affichée en texte brut prêt à copier-coller
- [ ] Historique complet des réponses générées avec l'offre associée
- [ ] Rate limiting : 3 réponses/jour par utilisateur, email de notification au-delà
- [ ] Panel admin : liste des utilisateurs, stats (réponses générées, documents uploadés)
- [ ] Admin actions : désactiver un compte, reset quota journalier
- [ ] Rôle admin via flag `is_admin` en base de données

### Out of Scope

- Éditeur de texte intégré pour retoucher les réponses — copier-coller direct suffit
- Proposition commerciale / pitch structuré — uniquement des messages de candidature
- OAuth / login social — magic link uniquement
- Paiements / Stripe — pas de monétisation v1
- App mobile — web only

## Context

- L'utilisateur principal est freelance sur Malt.fr et répond régulièrement à des offres
- Les réponses doivent être personnalisées : le modèle reçoit en contexte le CV, les anciennes réponses et le profil du candidat
- Le format de sortie est un message de candidature Malt (texte libre, pas de structure imposée)
- Plusieurs exemples de réponses existantes seront fournis comme données de référence pour calibrer le ton et le style
- Multi-utilisateurs : chaque utilisateur a son propre espace avec ses propres documents et historique

## Constraints

- **Stack**: Next.js 16 (App Router), tRPC v11 + React Query, Supabase (PostgreSQL + Auth), shadcn/ui + Tailwind CSS v4 — imposé
- **Déploiement**: Vercel — imposé
- **IA**: Claude Opus 4 via Anthropic SDK — clé API côté serveur (env var)
- **Coût**: Rate limit 3 réponses/jour par user + email notification au-delà pour contrôler les coûts API
- **Design**: Organique, simple, rien de surchargé

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Magic link (pas email/mdp) | Plus simple pour l'utilisateur, pas de mot de passe à gérer | — Pending |
| Clé API serveur unique | Contrôle des coûts centralisé, les users n'ont pas besoin de clé | — Pending |
| Rate limit 3/jour + email notif | Éviter les abus tout en restant utilisable | — Pending |
| Admin par flag is_admin | Simple, pas besoin d'un système de rôles complexe | — Pending |
| Copier-coller sans éditeur | Simplicité, le texte va directement sur Malt | — Pending |

---
*Last updated: 2026-02-06 after initialization*
