# ADR-005: Extension YAML native et LSP hybride

## Statut
Accepté

## Contexte
Après l'introduction du module d'extensions et du LSP Aether, l'éditeur doit supporter YAML de façon native avec activation automatique et services langage cohérents.

## Décision
- Ajouter une extension builtin `yaml.native`.
- Activer `yaml.native`:
  - au démarrage (`onStartup`)
  - à l'ouverture d'un fichier `.yaml` ou `.yml` (`onLanguage:yaml`)
- Intégrer un LSP YAML avec trois modes:
  - `embedded` (worker local) par défaut
  - `external` (transport HTTP JSON-RPC)
  - `auto` (fallback automatique vers l'embarqué)
- Mapper `.yaml` / `.yml` dans l'éditeur et dans la détection syntaxique.

## Conséquences
### Positives
- Support YAML prêt à l'emploi sans dépendance externe.
- Résilience en cas d'indisponibilité du LSP externe grâce au fallback auto.
- Cohérence avec l'architecture extension/LSP déjà en place.

### Négatives
- Ajout de workers et clients LSP supplémentaires à maintenir.
- Diagnostics YAML initiaux simples en attendant une grammaire plus riche.
