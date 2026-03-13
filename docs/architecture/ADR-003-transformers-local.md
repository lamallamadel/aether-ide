# ADR-003 : Modèle local via Transformers.js

**Statut** : Accepté  
**Date** : 2025-03-13

## Contexte

Aether IDE vise à offrir une recherche sémantique (RAG/GraphRAG) et une assistance IA sans exposer le code source à des services tiers. Les cas d'usage ciblés incluent le développement offline-first, les environnements à forte exigence de confidentialité (entreprise, santé) et le mode zero-egress.

## Décision

L'application utilise **Transformers.js** pour calculer les embeddings en local, directement dans le navigateur, sans serveur dédié :

- **Bibliothèque** : `@huggingface/transformers` (successeur de `@xenova/transformers`)
- **Modèle** : `Xenova/all-MiniLM-L6-v2` (sentence-transformers, 384 dimensions)
- **Exécution** : WebAssembly (WASM) par défaut, WebGPU si disponible (~70 % des navigateurs)
- **Pipeline** : `feature-extraction` avec `pooling: 'mean'` et `normalize: true`

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  useFileSync    │────▶│  ingestFile()    │────▶│ VectorStore │
│  (modification  │     │  (graphrag.ts)   │     │ .persist()  │
│   fichier)      │     └──────────────────┘     └──────┬──────┘
└─────────────────┘                                     │
                                                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  GlobalSearch   │────▶│  graphragQuery() │────▶│ EmbeddingProvider│
│  AIChatPanel    │     │  (graphrag.ts)   │     │ .embed(text)    │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
                                                 ┌─────────────────────┐
                                                 │ Transformers.js     │
                                                 │ pipeline('feature-  │
                                                 │ extraction', model) │
                                                 └─────────────────────┘
```

Le `VectorStore` reçoit un `EmbeddingProvider` (injectable). Par défaut : `transformersEmbeddingProvider`, qui charge le modèle via un singleton lazy.

## Mode Cloud vs Local

| Aspect | Cloud | Local |
|--------|-------|-------|
| Réseau | Autorisé (HuggingFace CDN pour téléchargement modèle) | Bloqué (`enableZeroEgress`) |
| Modèle | Téléchargé à la demande, mis en cache | Doit être en cache (session Cloud antérieure) |
| Confidentialité | Même modèle local, pas d'envoi de code | Zero-egress strict |

**Important** : En mode Local, le modèle doit avoir été téléchargé au moins une fois en mode Cloud. Le cache navigateur (HTTP cache / IndexedDB selon la lib) permet de réutiliser le modèle ensuite.

## Contraintes et compromis

- **Mémoire** : ~50–100 MB pour all-MiniLM-L6-v2
- **Performance** : WASM correct pour l’embedding, WebGPU peut améliorer la latence
- **Premier chargement** : téléchargement du modèle (~25 MB) uniquement en mode Cloud ou avant activation du mode Local

## Références

- [Transformers.js — Hugging Face](https://huggingface.co/docs/transformers.js)
- [WebGPU Guide](https://huggingface.co/docs/transformers.js/main/en/guides/webgpu)
- [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)
