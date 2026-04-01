Based on the sources provided, I have identified four core documents labeled **V1.0** or **V1.1** related to "Project AETHER." Here they are exported in Markdown format.

# 1\. Kairos Reference Document (V1.0)

**Source:** Project AETHER: Kairos Reference Document (V1.0) 1

### 📂 PROJECT AETHER : MANIFESTE TECHNIQUE & STRATÉGIQUE

**Date :** 14 Février 2026**Statut :** Validé par le Fondateur**Pilote :** KAIROS

#### 1\. LA VISION (NORTH STAR)

AETHER n'est pas un éditeur de texte, c'est un **Système de Résilience Logicielle**.Nous ne cherchons pas seulement à écrire du code plus vite (Autocomplete), mais à écrire du code plus sûr (Diagnostic Sémantique).Nous visons l'hybridation totale : **Performance Native** (60fps) \+ **Intelligence Contextuelle** (AST \+ AI). 1, 2

#### 2\. DÉCISIONS ARCHITECTURALES (LE NOYAU)

**A. Moteur de Rendu : Stratégie "Strangler Fig"**

* **Immédiat (Track A) :** Intégration de **CodeMirror 6** pour le MVP (Time-to-market \< 1 mois).  
* **Long Terme (Track B) :** Développement en parallèle du **"Aether Engine"** (Rust/WASM \+ Virtualized DOM) pour remplacer CodeMirror à terme.  
* **Invariant :** La couche de gestion d'état (Zustand/Yjs) est découplée de la vue. L'IA parle à l'État, pas à l'Éditeur. 2

**B. Le Cerveau Syntaxique**

* **Parser :** **Tree-sitter (WASM)**. Rejet des Regex pour l'analyse.  
* **Données :** **AST Brut**. Nous acceptons la lourdeur des données pour garantir la précision chirurgicale.  
* **Exécution :** **Web Worker**. Le parsing est hors du thread principal pour garantir la fluidité de l'UI.  
* **Synchronisation :** **Idleness (Repos)**. L'IA ne scanne pas à chaque frappe, mais après une pause de **250ms**. 3

**C. Intelligence & Contexte**

* **Modèle IA :** **Hybride (Choix Utilisateur)**.  
* *Cloud :* GPT-4o/Claude (Payant/High Intellect).  
* *Local :* WebLLM/WebGPU (Gratuit/Privacy/Offline).  
* **Contexte Project :** **GraphRAG Lazy**.  
* Corrélation entre Vecteurs (Sens) et Noeuds Tree-sitter (Symbole).  
* Indexation progressive (Fichier actif \-\> Imports \-\> Reste du projet en background). 3

#### 3\. EXPÉRIENCE UTILISATEUR (UX)

**A. Interaction IA**

* **Focus :** **Diagnostic & Auto-correction** (vs simple Autocomplete).  
* **Interface Principale :** **Sidebar Conversationnelle** (pour le chat global).  
* **Interface Contextuelle :** **Gouttière IA (AI Gutter)**. Indicateurs discrets en marge (Icones cliquables). 4

**B. Mécanique de Correction (Magic Fix)**

* **Mode :** **Hybride**.  
* *Trivial (Imports, Semicolons) :* Correction **Automatique** (Silencieuse \+ Flash vert).  
* *Complexe (Logique, Refactoring) :* Correction sur **Validation**.  
* **Visualisation :** **Popover Side-by-Side**. Fenêtre flottante montrant le Diff "Avant/Après" propre. 4

#### 4\. ORDRES DE MISSION (KAIROS DISPATCH)

**👷‍♂️ À IMAD (Architecture)**

* **Pattern Adapter :** Crée une interface EditorAdapter qui permet de brancher CodeMirror aujourd'hui et AetherEngine demain sans casser l'IA.  
* **Worker Pipeline :** Implémente le Web Worker Tree-sitter avec **Comlink**. Assure-toi que la sérialisation de l'AST Brut ne bloque pas le thread.  
* **Lazy Indexer :** Code le "Background Crawler" qui indexe les fichiers importés pendant l'idleness. 5

**🕵️‍♀️ À NIA (Produit)**

* **Matrice de Risque :** Définis la liste exacte des règles considérées comme "Triviales" (Auto-fix) vs "Risquées" (Validation).  
* **Onboarding Hardware :** Conçois le flux de démarrage qui détecte le GPU de l'utilisateur pour recommander (ou déconseiller) le mode Local WebGPU. 6

**🛡️ À AKSIL (Sécurité & Qualité)**

* **Risk Engine :** Implémente l'heuristique qui scanne les diffs proposés par l'IA.  
* **Zero-Egress :** Certifie que le mode "Local" ne fait *aucun* appel réseau sortant pour l'inférence.  
* **Crash Test :** Teste la désynchronisation Worker/MainThread. 6

**🎨 À TIZIRI (Design)**

* **AI Gutter :** Design des icônes de la gouttière (états : Analyse, Sain, Warning, Error).  
* **Side-by-Side Popover :** Conçois la carte de validation de diff (Vert/Rouge).  
* **Sidebar :** Intègre la Sidebar de chat de manière cohérente avec le reste de l'UI sombre. 7

**🧘‍♂️ À AMOUSNAW (Sagesse/Connaissance)**

* **GraphRAG :** Définis la structure de métadonnées qui lie un Embedding Vectoriel à un ID de nœud Tree-sitter. 8

**⏱️ À WIAM (Process Agile)**

* **Sprint 1 :** Setup CodeMirror \+ Tree-sitter Worker \+ Sidebar UI.  
* **Sprint 2 :** Intégration du Diagnostic Sémantique (Gouttière). 8

#### 5\. MOT DE LA FIN DU DG

Le risque majeur est la **complexité de synchronisation** (AST Brut asynchrone). Mon rôle sera de veiller à ce qu'Imad ne s'enferme pas dans l'optimisation prématurée du moteur custom avant que le moteur CodeMirror ne soit stable. 8, 9

# 2\. Product Owner Nia Launch Document (V1.0)

**Source:** Project Aether: Product Owner Nia Launch Document V-1.0 10

### 📂 DOCUMENT DE LANCEMENT : PROJET AETHER

**Version :** 1.0 | **Date :** 14 Février 2026**Autorité :** Nia (PO) & Kairos (Vision)

#### 1\. VISION & CONTEXTE

**AETHER** n'est pas un éditeur de texte. C'est un **Système de Résilience Logicielle**.Notre mission est de construire un IDE hybride qui offre :

1. **La Vitesse du Natif :** 60fps constants, latence \< 16ms (Moteur : CodeMirror 6 pour le MVP).  
2. **L'Intelligence Contextuelle :** Une IA qui "comprend" le code via AST (Tree-sitter) \+ Vecteurs (GraphRAG), sans jamais bloquer l'interface.

**Stratégie Technique :** "Strangler Fig"

* *Track A (Immédiat) :* Web-based editor (React/CodeMirror).  
* *Track B (Fondation) :* Architecture multithreadée (Web Workers) pour préparer le futur moteur Rust. 10, 11

#### 2\. GLOBAL ROADMAP

**SPRINT 1 : FOUNDATION (La Coquille)**

* Setup Repo & Architecture (Aksil)  
* CodeMirror 6 Integration (Imad)  
* Worker Tree-sitter Setup (Amousnaw)  
* UI Skeleton & Sidebar (Tiziri) 12

**SPRINT 2 : INTELLIGENCE (Les Yeux)**

* GraphRAG Schema & DB (Amousnaw)  
* AI Gutter & Decorations (Tiziri/Imad)  
* Ghost Review / Diff View (Aksil) 12, 13

#### 3\. RÈGLES TECHNIQUES (CONSTITUTION)

1. **The 16ms Rule :** Aucune opération JavaScript sur le Main Thread ne doit dépasser 16ms. Tout calcul lourd part dans un **Web Worker**.  
2. **State Truth :** **CodeMirror** est la source de vérité pour le texte. **Zustand** est la source de vérité pour l'application. Ne jamais synchroniser les deux à chaque keystroke.  
3. **Lazy Loading :** Les grammaires Tree-sitter (.wasm) sont chargées uniquement à l'ouverture du fichier.  
4. **No Layout Thrashing :** Interdiction de lire le DOM puis d'écrire dedans dans la même boucle. 14

#### 4\. PROCHAINES ÉTAPES

* **@Wiam :** Crée le tableau Kanban "Sprint 1".  
* **@Aksil :** Initialise le repo GitHub (Initial Commit).  
* **@Tiziri :** Assets SVG pour les icônes de la Gouttière.  
* **@Imad & @Amousnaw :** POC de la communication MainThread \<-\> Worker. 15

# 3\. Scrum Master Wiam Launch Document (V1.0)

**Source:** Project Aether: Scrum Master Wiam Operational Launch Strategy 16

### 📄 PROJECT AETHER : SCRUM MASTER WIAM LAUNCH DOCUMENT (V1.0)

**Date :** 15 Février 2026**Statut :** 🟢 Validé & En vigueur**Mission :** Garantir "Le Rythme" et protéger la "Deep Work".

#### 1\. CADRAGE OPÉRATIONNEL

**Les Rituels (Time-boxed) :**

* **Daily Scrum (10h00 \- 15min max) :** "Est-ce que quelqu'un a bloqué le Main Thread hier ?"  
* **Sprint Planning (Lundi \- 1h) :** On ne planifie que ce qui est "Ready".  
* **Tactical Swarm :** Si Aksil lève un drapeau rouge sur l'AST, tout le monde débloque.  
* **Demo & Retro (Vendredi \- 1h30) :** On montre le logiciel qui tourne. Pas de slides. 16

#### 2\. LA CONSTITUTION DE QUALITÉ

**✅ Definition of Done (DoD) :**

1. **The 16ms Rule :** Audit de performance validé.  
2. **State Truth :** Vérification que le state est dans Zustand.  
3. **Code Review :** Validée par Imad ou Aksil.  
4. **No Regression :** Le "Hello World" s'affiche sans clignotement. 17

#### 3\. LE BACKLOG MAÎTRE (SPRINT 1\)

**Objectif :** Avoir un éditeur qui tape du texte à 60fps et un Worker qui répond "Pong".

* **US-101 (Setup) :** Initialisation Repo \+ Vite \+ TypeScript \+ ESLint.  
* **US-102 (Editor) :** Composant CodeMirror. 18

# 4\. Project Aather Backlog Wiam V1.1

**Source:** Project Aather Backlog Wiam V1.1: Bridging the Gaps for Kairos and Nia 19

### 📝 Backlog Consolidé V1.1 (Recommandé)

**Scrum Master :** Wiam**Note :** Le backlog V1.0 était complet à 85%. Voici la version blindée avec les correctifs pour le Système de Fichiers, la Configuration et le RAG.

#### 🚨 GAPS IDENTIFIÉS & CORRIGÉS

1. **Système de Fichiers :** Ajout de la logique pour gérer plusieurs fichiers (Virtual File System).  
2. **Configuration :** Ajout d'une modale pour les clés API (Settings Modal).  
3. **Ingestion RAG :** Définition de la stratégie de découpage du code (Code Chunking).  
4. **Interaction Diff :** Logique pour valider les changements IA (Inline Diff View). 20-23

#### PLANNING DES SPRINTS

**🗓️ SPRINT 1 : The Foundation**

* ✅ US-101 : Setup Repo & Env  
* ✅ US-102 : CodeMirror Component  
* ✅ US-103 : Worker Architecture  
* ✅ US-104 : Zustand Store Setup  
* ✅ US-105 : UI Layout Skeleton

**🗓️ SPRINT 2 : The Brain & Structure**

* ✅ US-201 : Tree-sitter Load (WASM)  
* ✅ US-202 : Parsing Loop  
* 🆕 **US-106 : Virtual File System logic (Switch files)**  
* ✅ US-203 : Gutter Icons Integration  
* ✅ US-204 : Async Sync Logic

**🗓️ SPRINT 3 : The Knowledge**

* ✅ US-301 : IndexedDB Setup  
* 🆕 **US-306 : Code Chunking Strategy (Tree-sitter based)**  
* ✅ US-302 : Sidebar Chat UI  
* ✅ US-303 : Mock AI Response Loop  
* 🆕 **US-305 : Settings Modal & Local Storage**

**🗓️ SPRINT 4 : The MVP Polish**

* ✅ US-401 : Perf Audit (16ms check)  
* ✅ US-402 : Real AI Connection  
* 🆕 **US-405 : Inline Diff Interaction (Accept/Reject)**  
* ✅ US-403 : Empire Mode Design System  
* ✅ US-404 : Onboarding & Welcome.md 24, 25

