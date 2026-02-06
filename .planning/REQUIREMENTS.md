# Requirements: MaltResponse

**Defined:** 2026-02-06
**Core Value:** Générer en un clic une réponse de candidature Malt pertinente et personnalisée, alimentée par le contexte complet du candidat.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: L'utilisateur peut se connecter via OTP email (code envoyé par email)
- [ ] **AUTH-02**: La session utilisateur persiste entre les visites (refresh token)
- [ ] **AUTH-03**: L'utilisateur peut se déconnecter depuis n'importe quelle page
- [ ] **AUTH-04**: L'utilisateur peut voir et éditer son profil (nom, email)

### Documents

- [ ] **DOC-01**: L'utilisateur peut uploader un CV au format PDF avec extraction de texte automatique
- [ ] **DOC-02**: L'utilisateur peut ajouter du texte libre pour décrire son profil, compétences et expérience
- [ ] **DOC-03**: L'utilisateur peut uploader d'anciennes réponses Malt comme référence de style et de ton
- [ ] **DOC-04**: L'utilisateur peut voir la liste de ses documents uploadés
- [ ] **DOC-05**: L'utilisateur peut supprimer ses documents

### Génération

- [ ] **GEN-01**: L'utilisateur peut saisir une offre d'emploi (champ texte)
- [ ] **GEN-02**: L'utilisateur peut saisir une description d'entreprise (champ texte, optionnel)
- [ ] **GEN-03**: L'utilisateur peut saisir l'URL du site de l'entreprise (champ texte, optionnel)
- [ ] **GEN-04**: L'utilisateur peut générer une réponse personnalisée via Claude Opus 4 en un clic
- [ ] **GEN-05**: La génération utilise le contexte complet du candidat (CV, profil, anciennes réponses)
- [ ] **GEN-06**: La réponse générée s'affiche en texte brut avec bouton copier-coller
- [ ] **GEN-07**: L'utilisateur est limité à 3 générations par jour
- [ ] **GEN-08**: Un email est envoyé au propriétaire quand un utilisateur dépasse le quota

### Historique

- [ ] **HIST-01**: L'utilisateur peut voir la liste de ses réponses générées avec date et offre associée
- [ ] **HIST-02**: L'utilisateur peut rechercher et filtrer dans son historique
- [ ] **HIST-03**: L'utilisateur peut re-générer une réponse pour une offre déjà traitée

### Admin

- [ ] **ADM-01**: L'admin (flag is_admin en base) peut voir la liste de tous les utilisateurs inscrits
- [ ] **ADM-02**: L'admin peut voir les stats par utilisateur (réponses générées, documents uploadés)
- [ ] **ADM-03**: L'admin peut désactiver un compte utilisateur

## v2 Requirements

### Admin Avancé

- **ADM-V2-01**: L'admin peut reset le quota journalier d'un utilisateur
- **ADM-V2-02**: L'admin peut voir un dashboard avec stats globales (total réponses, users actifs)

### Génération Avancée

- **GEN-V2-01**: Streaming de la réponse en temps réel pendant la génération
- **GEN-V2-02**: Choix du modèle Claude (Opus/Sonnet) par l'utilisateur
- **GEN-V2-03**: Scraping automatique du site entreprise pour enrichir le contexte

### Historique Avancé

- **HIST-V2-01**: Export de l'historique en CSV
- **HIST-V2-02**: Tags/catégories sur les réponses

## Out of Scope

| Feature | Reason |
|---------|--------|
| Éditeur de texte intégré | Copier-coller direct suffit pour Malt |
| Proposition commerciale / pitch structuré | Uniquement des messages de candidature |
| OAuth / login social | OTP email suffit, plus simple |
| Paiements / Stripe | Pas de monétisation v1 |
| App mobile | Web only |
| Scraping de profil Malt | Complexité juridique et technique |
| API publique | Pas de besoin identifié |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| DOC-01 | — | Pending |
| DOC-02 | — | Pending |
| DOC-03 | — | Pending |
| DOC-04 | — | Pending |
| DOC-05 | — | Pending |
| GEN-01 | — | Pending |
| GEN-02 | — | Pending |
| GEN-03 | — | Pending |
| GEN-04 | — | Pending |
| GEN-05 | — | Pending |
| GEN-06 | — | Pending |
| GEN-07 | — | Pending |
| GEN-08 | — | Pending |
| HIST-01 | — | Pending |
| HIST-02 | — | Pending |
| HIST-03 | — | Pending |
| ADM-01 | — | Pending |
| ADM-02 | — | Pending |
| ADM-03 | — | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 0
- Unmapped: 23 ⚠️

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after initial definition*
