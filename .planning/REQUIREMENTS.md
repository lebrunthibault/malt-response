# Requirements: MaltResponse

**Defined:** 2026-02-06
**Core Value:** Generer en un clic une reponse de candidature Malt pertinente et personnalisee, alimentee par le contexte complet du candidat.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: L'utilisateur peut se connecter via OTP email (code envoye par email)
- [ ] **AUTH-02**: La session utilisateur persiste entre les visites (refresh token)
- [ ] **AUTH-03**: L'utilisateur peut se deconnecter depuis n'importe quelle page
- [ ] **AUTH-04**: L'utilisateur peut voir et editer son profil (nom, email)

### Documents

- [ ] **DOC-01**: L'utilisateur peut uploader un CV au format PDF avec extraction de texte automatique
- [ ] **DOC-02**: L'utilisateur peut ajouter du texte libre pour decrire son profil, competences et experience
- [ ] **DOC-03**: L'utilisateur peut uploader d'anciennes reponses Malt comme reference de style et de ton
- [ ] **DOC-04**: L'utilisateur peut voir la liste de ses documents uploades
- [ ] **DOC-05**: L'utilisateur peut supprimer ses documents

### Generation

- [ ] **GEN-01**: L'utilisateur peut saisir une offre d'emploi (champ texte)
- [ ] **GEN-02**: L'utilisateur peut saisir une description d'entreprise (champ texte, optionnel)
- [ ] **GEN-03**: L'utilisateur peut saisir l'URL du site de l'entreprise (champ texte, optionnel)
- [ ] **GEN-04**: L'utilisateur peut generer une reponse personnalisee via Claude Opus 4 en un clic
- [ ] **GEN-05**: La generation utilise le contexte complet du candidat (CV, profil, anciennes reponses)
- [ ] **GEN-06**: La reponse generee s'affiche en texte brut avec bouton copier-coller
- [ ] **GEN-07**: L'utilisateur est limite a 3 generations par jour
- [ ] **GEN-08**: Un email est envoye au proprietaire quand un utilisateur depasse le quota

### Historique

- [ ] **HIST-01**: L'utilisateur peut voir la liste de ses reponses generees avec date et offre associee
- [ ] **HIST-02**: L'utilisateur peut rechercher et filtrer dans son historique
- [ ] **HIST-03**: L'utilisateur peut re-generer une reponse pour une offre deja traitee

### Admin

- [ ] **ADM-01**: L'admin (flag is_admin en base) peut voir la liste de tous les utilisateurs inscrits
- [ ] **ADM-02**: L'admin peut voir les stats par utilisateur (reponses generees, documents uploades)
- [ ] **ADM-03**: L'admin peut desactiver un compte utilisateur

## v2 Requirements

### Admin Avance

- **ADM-V2-01**: L'admin peut reset le quota journalier d'un utilisateur
- **ADM-V2-02**: L'admin peut voir un dashboard avec stats globales (total reponses, users actifs)

### Generation Avancee

- **GEN-V2-01**: Streaming de la reponse en temps reel pendant la generation
- **GEN-V2-02**: Choix du modele Claude (Opus/Sonnet) par l'utilisateur
- **GEN-V2-03**: Scraping automatique du site entreprise pour enrichir le contexte

### Historique Avance

- **HIST-V2-01**: Export de l'historique en CSV
- **HIST-V2-02**: Tags/categories sur les reponses

## Out of Scope

| Feature | Reason |
|---------|--------|
| Editeur de texte integre | Copier-coller direct suffit pour Malt |
| Proposition commerciale / pitch structure | Uniquement des messages de candidature |
| OAuth / login social | OTP email suffit, plus simple |
| Paiements / Stripe | Pas de monetisation v1 |
| App mobile | Web only |
| Scraping de profil Malt | Complexite juridique et technique |
| API publique | Pas de besoin identifie |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| DOC-01 | Phase 3 | Pending |
| DOC-02 | Phase 3 | Pending |
| DOC-03 | Phase 3 | Pending |
| DOC-04 | Phase 3 | Pending |
| DOC-05 | Phase 3 | Pending |
| GEN-01 | Phase 4 | Pending |
| GEN-02 | Phase 4 | Pending |
| GEN-03 | Phase 4 | Pending |
| GEN-04 | Phase 4 | Pending |
| GEN-05 | Phase 4 | Pending |
| GEN-06 | Phase 4 | Pending |
| GEN-07 | Phase 5 | Pending |
| GEN-08 | Phase 5 | Pending |
| HIST-01 | Phase 6 | Pending |
| HIST-02 | Phase 6 | Pending |
| HIST-03 | Phase 6 | Pending |
| ADM-01 | Phase 7 | Pending |
| ADM-02 | Phase 7 | Pending |
| ADM-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-02-06*
*Last updated: 2026-02-06 after roadmap creation*
