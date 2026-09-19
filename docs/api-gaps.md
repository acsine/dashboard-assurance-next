# Écarts entre le client API et le backend déployé

Relevé effectué contre l'OpenAPI de `https://gestion-assurance-back.vercel.app` (valeur de `API_URL`),
sur les 132 chemins appelés par `lib/api/mobi-assur.ts`.

Rappel de lecture des symptômes : FastAPI renvoie **405** quand le chemin existe pour d'autres verbes
ou qu'il est capturé par une route paramétrée voisine, et **404** quand aucune route ne correspond.

## Corrigé côté frontend

| Appel | Symptôme | Correction |
| --- | --- | --- |
| `GET /admin/niches/agents-ranking` | 405 (capturé par `/admin/niches/{niche_id}`) | Classement recomposé dans `buildAgentRankings` |
| `GET /admin/niches/agents-ranking/{agent_id}` | 404 | Idem, filtré sur l'agent |
| `POST /settings/pricing/bareme/brands` | 404 | Réécriture de `bareme_config.brand_factors` via `PATCH /settings/pricing` |
| `DELETE /settings/pricing/bareme/brands/{marque}` | 404 | Idem |
| `POST /admin/sinistres` | 405 (route en lecture seule) | Bascule sur `POST /agent/sinistres` |
| `GET /contracts/{id}/documents/generate-pack` | 405 (backend en POST) | `downloadFileWithAuth` accepte un `RequestInit` |

### Téléchargement des documents

`downloadFileWithAuth` enregistrait la réponse sans regarder son type : une réponse JSON (erreur du
proxy ou métadonnées) se retrouvait donc sauvegardée sous une extension `.xlsx`, d'où l'erreur
« format ou extension n'est pas valide » à l'ouverture dans Excel. Trois garde-fous ont été ajoutés :

- une réponse `application/json` là où un fichier est attendu lève désormais une erreur explicite ;
- le nom de fichier provient du `Content-Disposition` renvoyé par le serveur, qui seul connaît le
  format réellement produit ; les noms construits côté client ne servent plus que de repli ;
- `generatePack` gère les deux contrats possibles du backend : s'il renvoie un binaire, il est
  enregistré tel quel ; s'il renvoie la liste des documents générés, chacun est récupéré via
  `GET /contracts/{id}/documents/{doc_id}/download`, avec l'extension issue du champ `format`.

### Recomposition du classement

`nichesApi.listRankings` / `getAgentRanking` n'appellent plus d'endpoint dédié. Les données proviennent de :

- `GET /admin/objectives/performance?period=…` — points de période, solde, métriques atteintes / sous minimum
- `GET /wallet/agents` — `clients_this_month`
- `GET /admin/niche-agreements` — niches actives par agent (statuts `ASSIGNED`, `PENDING_VALIDATION`, `ACTIVE`)
- `GET /contracts` — contrats du mois courant, comptés par `agent_id`

Le score reprend la pondération affichée dans la fiche agent : objectifs 35 %, ventes 30 %, points 20 %,
disponibilité 15 %. Les composantes ventes / points / disponibilité sont normalisées relativement au
meilleur agent de la période, le rang découle du tri par score décroissant.

Deux champs restent vides faute de source : `history` (aucun endpoint admin ne renvoie de série
temporelle de points — la fiche agent affiche « Pas encore d'historique ») et les objectifs détaillés,
qui dépendent des preuves listées ci-dessous.

## Non corrigeable sans évolution backend

### Attribution administrative des niches — bloquant

`POST /admin/niches/{id}/assign` et `POST /admin/niches/{id}/unassign` renvoient 404. Le backend n'a
aucune notion d'attribution descendante : `NicheUpdate` n'expose pas `assigned_agent_id`, et la seule
façon de lier un agent à une niche est `POST /agent/niches/{id}/sign`, qui s'appuie sur l'identité de
l'appelant — un admin ne peut donc pas signer à la place d'un agent.

Conséquence : dans `app/[locale]/dashboard/niches/page.tsx`, le modal « Attribuer » affiche désormais
correctement le classement, mais la validation échoue toujours. Les boutons « Valider » / « Rejeter »
d'un accord fonctionnent, eux, via `/admin/niche-agreements/{id}/validate|reject`.

À implémenter côté backend : `POST /admin/niches/{niche_id}/assign` acceptant
`{ agent_id, objective_members, objective_contracts, objective_premium, objective_due_at, objective_note, notes }`
et créant un `NicheAgreement` en statut `ASSIGNED`, plus `POST /admin/niches/{niche_id}/unassign`
basculant l'accord actif en `CANCELLED`.

### Validation des preuves d'objectifs

Aucune route `/admin/objectives/proof-submissions` n'existe (ni la liste, ni `{id}`, ni `approve`, ni
`reject`). L'onglet « Validations » de `app/[locale]/dashboard/objectives/page.tsx` est donc vide, et
les objectifs détaillés de la fiche agent le sont aussi. Les appels sont volontairement conservés et
encapsulés dans un `catch` côté classement : ils se réactiveront d'eux-mêmes dès que le backend
exposera ces routes.

## Comment refaire le relevé

```powershell
curl.exe -s -o openapi.json "$env:API_URL/openapi.json"
```

Puis comparer les chemins de `spec.paths` aux littéraux passés à `mobiRequest` dans
`lib/api/mobi-assur.ts`, en normalisant les interpolations `${…}` en paramètres de route.
