# Rapport de test accessibilité — Navigation clavier (menu)

## Résumé
Objectif : garantir que 100% des éléments du menu latéral et des sous-menus du menu haut sont :
- focusables au clavier (Tab / Shift+Tab)
- activables (Entrée / Espace)
- identifiables visuellement (outline + fond)
- annoncés correctement par un lecteur d’écran

## Périmètre
- Menu latéral : [ActivityBar.tsx](../../src/components/ActivityBar.tsx)
- Menu haut : [MenuBar.tsx](../../src/components/MenuBar.tsx)
- Styles focus : [index.css](../../src/index.css)
- Global Search (résultats + filtres) : [GlobalSearch.tsx](../../src/components/GlobalSearch.tsx)

## Vérification “100% focusable”
Contrôle automatisé (tests) :
- [App.test.tsx](../../src/components/App.test.tsx) vérifie :
  - présence de `tabindex="0"` sur les boutons du menu latéral
  - présence de `tabindex="0"` sur un bouton top-menu et un menuitem (exemple View)

Contrôle manuel :
- Tabuler depuis le haut de la page : chaque bouton du menu latéral reçoit le focus.
- Ouvrir un menu (Entrée/Espace) puis tabuler : chaque item de dropdown reçoit le focus.

## Global Search — cohérence thème (focus)
Constat :
- Sur certains navigateurs, les lignes de résultats et les sélecteurs pouvaient afficher un focus natif “bleu” (style navigateur) au lieu du focus aligné sur le thème global.

Correctif :
- Les éléments Global Search utilisent des classes dédiées (`search-result-item`, `search-select`, `search-chip`) pour appliquer un focus `:focus-visible` cohérent avec les tokens de thème (violet).
- Styles : [index.css](../../src/index.css)
- Les menus déroulants “Mode/Scope” n’utilisent plus de `<select>` natif : un contrôle custom est utilisé pour éviter la coloration bleue du choix sélectionné dans la liste d’options (UI navigateur/OS non stylable de manière fiable).
- Composant : [ThemedSelect.tsx](../../src/components/ThemedSelect.tsx)

## Menu haut — visibilité dropdown (régression évitée)
Constat :
- Selon le timing de rendu/animation, certains navigateurs pouvaient afficher brièvement le contenu du dropdown avant le début de l’animation.
- Le dropdown pouvait rester visible si une autre modal était ouverte via raccourci (ex : Ctrl+K) pendant qu’un menu était déployé.

Correctif :
- `.menu-dropdown-in` définit `opacity/transform` par défaut pour éviter le flash avant animation.
- Le MenuBar ferme le dropdown sur clic extérieur (pointerdown + mousedown), sur `Échap`, et lorsque la palette / settings / global search / mission control s’ouvre.

## Lecteurs d’écran (procédure manuelle)
### NVDA (Windows)
1) Activer NVDA
2) Naviguer au clavier avec `Tab`
3) Sur “View” : NVDA doit annoncer un bouton (et idéalement “expanded” quand ouvert)
4) Dans le dropdown : NVDA doit annoncer chaque item comme élément interactif (menu item)
5) `Échap` : le menu se ferme et le focus revient sur “View”

### VoiceOver (macOS)
1) Activer VoiceOver
2) Utiliser `Tab` ou `VO + Flèches` pour parcourir les contrôles
3) Vérifier l’annonce des boutons de menu et des items
4) `Échap` ferme le menu, focus rendu au menu parent

## Contraste (WCAG 2.1)
Couleurs utilisées :
- Fond menu : `#0c0c0c`
- Fond surfaces : `#111111`
- Focus outline : `#a855f7`
- Focus/hover background : `rgba(168, 85, 247, 0.18)` (sur fond `#111111`)
- Texte : `#ffffff` (dans les états focus/hover)

Contrastes calculés :
- Texte blanc vs fond menu `#0c0c0c` : **19.56:1**
- Texte blanc vs fond `#111111` : **18.88:1**
- Outline focus `#a855f7` vs fond menu `#0c0c0c` : **4.94:1**
- Outline focus `#a855f7` vs fond `#111111` : **4.77:1**
- Texte blanc vs fond focus (blend) : **15.58:1**

Conclusion :
- Les états focus/hover respectent le minimum **4.5:1** pour la perception et la lisibilité.

## ARIA utilisés (liste)
- `aria-label` (navigation et boutons)
- `aria-haspopup="menu"` sur boutons du menu haut
- `aria-expanded` sur boutons du menu haut
- `role="menu"` sur conteneur dropdown
- `role="menuitem"` sur items dropdown
- `aria-haspopup="listbox"` sur les sélecteurs custom Global Search
- `role="listbox"` et `role="option"` + `aria-selected` pour les options
- `aria-live="polite"` pour les annonces non bloquantes
