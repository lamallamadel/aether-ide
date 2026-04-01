# Navigation clavier & accessibilité — Menu haut + menu latéral

## Portée
Ce document décrit la navigation au clavier et les attributs ARIA utilisés pour :
- Le menu latéral (barre d’icônes)
- Le menu haut et ses sous-menus (dropdowns)

## Principes
- Tous les éléments interactifs sont des `button` focusables et ont `tabindex="0"`.
- La progression Tab / Shift+Tab suit l’ordre DOM naturel.
- Les états focus sont visibles (outline + fond) et conformes aux exigences de contraste WCAG 2.1.

## Menu latéral (Activity Bar)
Fichier : [ActivityBar.tsx](../../src/components/ActivityBar.tsx)

### Éléments focusables
- Toggle Sidebar
- Explorer
- Open Command Palette
- Toggle AI Panel
- Open Settings

### Activation clavier
- `Tab` / `Shift+Tab` : navigation séquentielle
- `Entrée` / `Espace` : activation (natif via `button`)

### Style focus
Fichier : [index.css](../../src/index.css)
- `.activity-item:focus, .activity-item:focus-visible`
  - `outline: 2px solid #a855f7`
  - `background: rgba(168, 85, 247, 0.18)`

## Menu haut + sous-menus
Fichier : [MenuBar.tsx](../../src/components/MenuBar.tsx)

### ARIA & rôles
- Conteneur : `nav` avec `aria-label="Top menu"`
- Boutons de menu : `button` avec
  - `aria-haspopup="menu"`
  - `aria-expanded={true|false}`
- Dropdown : conteneur avec `role="menu"` et `aria-label="${key} menu"`
- Items dropdown : `button` avec `role="menuitem"`

### Navigation clavier (comportement)
- `Tab` / `Shift+Tab` : progression logique (ordre DOM)
- `Entrée` / `Espace` sur un bouton de menu : ouvre/ferme le dropdown
- `Échap` :
  - ferme le dropdown
  - remet le focus sur le bouton du menu parent
- `Flèche bas` / `Flèche haut` dans un dropdown : déplace le focus entre items

### Style focus
Fichier : [index.css](../../src/index.css)
- `.menu-button:focus-visible`, `.menu-item:focus-visible` :
  - outline visible
  - fond actif/hover (différenciation nette)

## Visibilité / fermeture des dropdowns (robustesse multi-navigateurs)
Objectif :
- Éviter les “flash” de contenu lors de l’ouverture (FOUC).
- Garantir qu’un dropdown ne reste pas visible sous une autre modal (palette, settings, global search…).

Comportements :
- Clic extérieur : fermeture (écoute `pointerdown` + fallback `mousedown`).
- `Échap` : fermeture globale même si le focus a quitté le bouton.
- Ouverture d’une modal (palette/settings/global search/mission control) : fermeture du dropdown.

Implémentation :
- JS : [MenuBar.tsx](../../src/components/MenuBar.tsx)
- CSS : `.menu-dropdown-in` initialise `opacity/transform` avant l’animation : [index.css](../../src/index.css)
