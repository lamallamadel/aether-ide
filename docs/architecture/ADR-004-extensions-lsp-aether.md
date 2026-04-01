# ADR-004: Extensions hybrides et LSP Aether

## Statut
Accepté

## Contexte
L'IDE doit supporter des extensions natives et non fiables, ainsi qu'un langage Aether avec diagnostics et complétion, sans dépendre d'un serveur externe.

## Décision
- Introduire un module d'extensions avec runtime hybride:
  - in-process pour les extensions trustées
  - sandbox worker pour les extensions non fiables
- Ajouter l'extension builtin `aether.native` activée au boot.
- Intégrer un client LSP Aether en double mode:
  - `embedded` (worker local) par défaut
  - `external` (transport HTTP JSON-RPC)
  - `auto` (external avec fallback embarqué)
- Définir `aether` comme langage par défaut pour les buffers/fichiers sans extension et pour `.aether`.

## Conséquences
### Positives
- Démarrage sans dépendance externe (mode embarqué).
- Surface d'extension plus sûre avec isolation possible.
- Fallback automatique robuste vers l'embarqué en cas d'échec externe.

### Négatives
- Complexité runtime plus élevée (deux hôtes + transport externe).
- La grammaire Aether reste basique en attendant un parser dédié complet.

## Implémentation
- Extensions:
  - `src/extensions/types.ts`
  - `src/extensions/registry.ts`
  - `src/extensions/host.ts`
  - `src/extensions/runtime/*`
  - `src/extensions/builtin/aetherNative/*`
- LSP:
  - `src/lsp/client/aetherLspClient.ts`
  - `src/lsp/client/externalTransport.ts`
  - `src/lsp/server/aetherEmbeddedServer.ts`
  - `src/lsp/server/aetherLsp.worker.ts`
- Intégration:
  - `src/App.tsx`
  - `src/state/editorStore.ts`
  - `src/services/syntax/syntaxClient.ts`
  - `src/components/SettingsModal.tsx`
