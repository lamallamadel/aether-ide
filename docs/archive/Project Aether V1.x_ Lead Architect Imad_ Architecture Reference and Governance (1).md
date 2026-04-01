C'est prêt. Voici le document officiel **AETHER-ARCH-GOV-V1.md**, formaté, structuré et prêt à être posté sur votre Notion, GitHub Wiki ou Slack.  
Il scelle l'organisation et l'architecture pour tout le cycle V1.x.  
Markdown

# 🏗️ PROJECT AETHER: ARCHITECTURE REFERENCE & GOVERNANCE (V1.x)

**Date :** 15 Février 2026  
**Version :** 1.0 (Validé pour Exécution)  
**Auteur :** Imad (Lead Architect)  
**Statut :** 🟢 APPROVED FOR DEV

## 1\. VISION & OBJECTIF DU CYCLE

Nous passons de la phase de **Découverte** à la phase d'**Exécution Empire**.  
L'objectif de ce document est de définir les frontières techniques et humaines pour garantir que la **"Règle des 16ms"** ne soit jamais violée par une mauvaise communication ou une architecture floue.

## 2\. MATRICE DES RESPONSABILITÉS (SOUVERAINETÉ)

Pour éviter les conflits et la dette technique, chaque membre possède une souveraineté totale sur son domaine.  
Rôle | Membre | Responsabilité & Souveraineté | Lignes Rouges (Interdictions)  
**Architecte** | **Imad** | **Gardien des Standards.** Valide les Patterns (Singleton, Factory). Définit les contraintes de performance. | Ne code pas les features. N'intervient pas dans le micro-management.  
**Tech Lead** | **Aksil** | **Propriétaire du Code.** Implémente la "Plomberie" (Store, IDB, Workers). Décide des libs mineures. | Interdiction de bloquer le Main Thread \> 16ms.  
**UX/UI** | **Tiziri** | **Interface Calme.** Design les feedbacks (Gutter, Popovers). Traduit la complexité en visuel simple. | Ne dicte pas la structure de la Base de Données pour des raisons esthétiques.  
**Scrum Master** | **Wiam** | **Métronome.** Protège l'équipe des interruptions. Gère le Backlog et les "Definition of Ready". | Ne laisse entrer aucun ticket sans maquette validée ni estimation technique.  
**AI Logic** | **Amousnaw** | **Cerveau Sémantique.** Stratégie de Chunking, RAG et Context Building. | Ne doit pas imposer de calculs lourds sans passer par le Worker Bridge.

## 3\. ARCHITECTURE SYSTÈME MACRO (THE BLUEPRINT)

Ce diagramme est la source de vérité pour le flux de données.

graph TD

%% Styles

classDef human fill:\#2d3436,stroke:\#dfe6e9,color:\#fff,stroke-width:2px;

classDef component fill:\#0984e3,stroke:\#74b9ff,color:\#fff,stroke-width:2px;

classDef storage fill:\#fdcb6e,stroke:\#e17055,color:\#2d3436,stroke-width:2px;

classDef worker fill:\#e84393,stroke:\#fd79a8,color:\#fff,stroke-dasharray: 5 5;

subgraph "MAIN THREAD (UI Layer \- \< 16ms)"

UI\_Core\[🖥️ React UI Layout\]:::component

Editor\[📝 CodeMirror Component\]:::component

Zustand\[🧠 Zustand Store (Source of Truth)\]:::component

end

subgraph "BACKGROUND THREADS (Heavy Lifting)"

WorkerBridge\[bridge 🌉 WorkerBridge (Singleton)\]:::worker

SyntaxWorker\[⚙️ Syntax Worker (Tree-sitter \+ Diff)\]:::worker

RAGWorker\[🧠 AI Context Worker\]:::worker

end

subgraph "PERSISTENCE (Memory Palace)"

IDB\[(🗄️ IndexedDB / AetherDB)\]:::storage

VFS\_Store\[(📂 Virtual File System)\]:::storage

end

%% Flux

Editor \-- "User Input" \--\> Zustand

Zustand \-- "Sync (PostMessage)" \--\> WorkerBridge

WorkerBridge \-- "Job: Parse/Diff" \--\> SyntaxWorker

SyntaxWorker \-- "AST / Diagnostics" \--\> WorkerBridge

WorkerBridge \-- "Update State" \--\> Zustand

Zustand \-- "Auto-Save" \--\> VFS\_Store

VFS\_Store \-.-\> IDB

WorkerBridge \-.-\> RAGWorker

\#\# 4\. PATTERNS TECHNIQUES & RÈGLES D'OR

\#\#\# 🧱 A. The Worker Bridge Singleton (US-103)

\* \*\*Problème :\*\* Instancier des Workers coûte cher et le Main Thread ne doit jamais calculer.  
\* \*\*Solution :\*\* Une classe WorkerBridge unique (Singleton).  
\* \*\*Règle :\*\* L'UI ne parle \*\*jamais\*\* directement au Worker. Elle parle au Store, qui délègue au Bridge.  
\* \*\*Validation :\*\* Aksil.

\#\#\# 🌊 B. Reactive State Hydration (US-302)

\* \*\*Problème :\*\* L'application démarre vide avant de lire la DB.  
\* \*\*Solution :\*\* Hook useHydration.  
\* \*\*Règle :\*\* Tant que isHydrated \=== false, l'écran de boot bloque toute interaction. Pas de "Loading skeletons" qui clignotent inutilement.  
\* \*\*Validation :\*\* Wiam (DoD).

\#\#\# 🏛️ C. Strangler Fig Pattern (Moteur d'Édition)

\* \*\*Vision :\*\* Nous utilisons \*\*CodeMirror 6\*\* (Track A) pour sortir vite.  
\* \*\*Architecture :\*\* Le composant \<Editor /\> est une boîte noire.  
\* \*\*Futur (Track B) :\*\* Cette boîte noire sera remplacée par un moteur Rust/WASM sans casser le reste de l'app (Sidebar, RAG, Chat).

\#\# 5\. DIRECTIVES D'EXÉCUTION IMMÉDIATE

\*\*@Aksil (Tech Lead) :\*\*

1\. Implémente le \*\*WorkerBridge\*\* immédiatement. Je veux voir le code où le Main Thread envoie un message et reçoit une réponse sans bloquer l'UI.  
2\. Vérifie dans ContextBuilder.ts si l'approximation CHARS\_PER\_TOKEN \= 4 est suffisante pour le MVP ou si on doit intégrer tiktoken-lite.

\*\*@Wiam (Scrum Master) :\*\*

1\. Ouvre le Sprint 1\.  
2\. Valide que l'US-106 (Virtual File System) est bien dans le scope pour éviter l'effet "éditeur mono-fichier".

\*\*@Tiziri (UX) :\*\*

1\. Fournis les assets SVG pour les icônes de la Gutter (Erreur, Warning, Info) pour qu'Aksil puisse les intégrer dans le composant CodeMirror.

\*Document scellé le 15/02/2026 par Imad.\*