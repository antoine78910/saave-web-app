# Saave Browser Extension

Extension browser pour ajouter rapidement des bookmarks à votre collection Saave.

## Installation

### Chrome/Edge (Mode Développeur)

1. Ouvrez Chrome et allez dans `chrome://extensions/`
2. Activez le "Mode développeur" en haut à droite
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `extension/` de ce projet
5. L'extension apparaît dans votre barre d'outils

### Configuration

Avant d'utiliser l'extension, assurez-vous que :

1. Votre webapp Saave est en cours d'exécution sur `http://localhost:3000`
2. Modifiez la variable `API_BASE_URL` dans `popup.js` si votre webapp est sur une autre URL

## Utilisation

1. Naviguez vers une page web que vous voulez sauvegarder
2. Cliquez sur l'icône Saave dans votre barre d'outils
3. L'URL actuelle sera automatiquement détectée
4. Les métadonnées (titre, description, tags) seront extraites automatiquement
5. Modifiez les champs si nécessaire
6. Cliquez sur "Add Bookmark"
7. Une barre de progression s'affichera, reproduisant exactement le même processus que la webapp
8. Le bookmark sera ajouté à votre collection

## Fonctionnalités

- ✅ Détection automatique de l'URL actuelle
- ✅ Extraction automatique des métadonnées
- ✅ Même système de progression que la webapp
- ✅ Interface cohérente avec le design de Saave
- ✅ Gestion d'erreurs et fallback en local
- ✅ Favicon automatiquement détecté

## Développement

Pour modifier l'extension :

1. Éditez les fichiers dans le dossier `extension/`
2. Retournez dans `chrome://extensions/`
3. Cliquez sur le bouton "Actualiser" de l'extension
4. Testez vos changements

## Files Structure

```
extension/
├── manifest.json     # Configuration de l'extension
├── popup.html       # Interface utilisateur
├── popup.js         # Logique principale
├── icon16.png       # Icône 16x16
├── icon48.png       # Icône 48x48
├── icon128.png      # Icône 128x128
└── README.md        # Ce fichier
```