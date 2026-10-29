# LAUNCH V1 — Diagramme de classes métier (conceptuel)

Ce diagramme décrit les objets métier principaux et leurs relations, **pas** des classes ORM obligatoires. Dans l'implémentation React/Supabase, les domaines seront surtout représentés par des types TypeScript, fonctions pures et tables SQL.

```mermaid
classDiagram
    class Sport {
      +id: UUID
      +slug: string
      +isActive: boolean
    }
    class Activity {
      +id: UUID
      +ownerId: UUID
      +originalSport: string
      +category: string
      +distanceM: number
      +startedAtUtc: string
      +evidenceLevel: string
      +status: string
    }
    class ImportBatch {
      +id: UUID
      +ownerId: UUID
      +status: string
      +idempotencyKey: string
    }
    class ActivityFile {
      +sha256: string
      +storagePath: string
      +format: string
    }
    class CardDefinition {
      +id: string
      +rarity: string
      +ruleType: string
      +rulePayload: object
      +rulesetVersion: string
    }
    class UserCard {
      +ownerId: UUID
      +cardId: string
      +status: string
      +firstAwardedAt: string
    }
    class RewardEngine {
      +evaluate(activity, rules) AwardDecision[]
    }
    class RevealSession {
      +id: UUID
      +kind: string
      +status: string
    }
    class CollectionSet {
      +id: UUID
      +version: number
      +bonusCardId: string
    }
    Sport "1" --> "0..*" Activity : classifie
    Sport "1" --> "0..*" CardDefinition : propose
    ImportBatch "1" --> "0..*" Activity : importe
    Activity "0..*" -- "0..*" ActivityFile : conserve
    RewardEngine ..> Activity : évalue
    RewardEngine ..> CardDefinition : applique règles
    CardDefinition "1" --> "0..*" UserCard : acquisition
    UserCard "0..*" --> "0..1" RevealSession : première présentation
    CollectionSet "1" --> "1..*" CardDefinition : ensemble requis
```

## Invariants de domaine

- `RewardEngine` n'a aucune responsabilité d'affichage, d'import ZIP ou d'enregistrement en base.
- `UserCard` est persistante et unique par `(ownerId,cardId)`.
- `RevealSession` présente des objets déjà attribués ; elle ne modifie jamais la propriété des cartes.
- `Sport` et `CardDefinition` sont alimentés par catalogue versionné ; les nouvelles disciplines n'exigent pas un changement de type source dans le backend.
