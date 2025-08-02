## Saave Chrome Extension - Version Popup

Extension Chrome moderne avec interface popup pour ajouter rapidement des bookmarks à votre collection Saave.

### ✨ Nouvelles Fonctionnalités

- **Interface Popup Modern** : Popup élégant avec suivi des étapes en temps réel
- **Icônes Saave** : Nouveau design avec le logo Saave
- **Suivi d'Étapes** : Visualisation du processus (Analyse → Métadonnées → Screenshot → Sauvegarde)
- **Feedback Visuel** : Animations et indicateurs de progression
- **Gestion d'Erreurs** : Messages d'erreur clairs et possibilité de réessayer

### 🚀 Installation

1. **Générer les icônes** (optionnel) :
   - Ouvrir `generate-saave-icons.html` dans votre navigateur
   - Télécharger les 3 icônes dans le dossier `icons/`

2. **Installer l'extension** :
   - Ouvrir Chrome → `chrome://extensions/`
   - Activer le "Mode développeur" (coin supérieur droit)
   - Cliquer "Charger l'extension non empaquetée"
   - Sélectionner le dossier `saave-extension`

3. **Épingler l'extension** (recommandé) :
   - Cliquer sur l'icône puzzle 🧩 dans Chrome
   - Épingler l'extension Saave pour un accès rapide

### 📱 Utilisation

1. **Démarrer l'app Saave** : `npm run dev` (port 3000-3010)
2. **Se connecter** dans l'application web Saave
3. **Naviguer** vers une page à sauvegarder
4. **Cliquer** sur l'icône Saave épinglée
5. **Popup vert simple** : "Envoyer vers Saave.io"
6. **Redirection automatique** vers l'app pour voir toutes les étapes dans le terminal
7. **Terminé** ! Le bookmark est ajouté avec tags, description et screenshot complets

### 🎯 Interface Popup

Le popup affiche :
- **Design vert Saave.io** : Logo et bouton verts
- **Informations de la page** : URL et titre actuels
- **Bouton simple** : "Envoyer vers Saave.io"
- **Message de succès** : "URL envoyée ! Traitement en cours dans Saave.io"
- **Fermeture automatique** : 2 secondes après succès
- **Gestion d'erreurs** : Messages clairs + bouton "Réessayer"

**Workflow :**
1. **Popup** → Envoie juste l'URL à la webapp
2. **Redirection** → Ouvre/active l'onglet Saave.io
3. **Webapp** → Lance automatiquement le processus complet visible dans le terminal :
   - 🔍 **Scraping** - Analyse de la page
   - 📊 **Métadonnées** - Titre, description, tags via IA
   - 📸 **Screenshot** - Capture d'écran (Puppeteer + R2)
   - 💾 **Sauvegarde** - Ajout à votre collection
4. **Résultat** → Bookmark complet avec tags, description, screenshot

### ⚙️ Configuration Automatique

L'extension détecte automatiquement :
- **Serveur Saave** sur les ports : 3000-3010
- **Utilisateur connecté** via localStorage ou onglets ouverts
- **Page valide** (exclut chrome:// et autres pages système)

### 🛠️ Dépannage

**Extension ne fonctionne pas ?**
1. ✅ App Saave lancée (`npm run dev`)
2. ✅ Connecté dans l'application web
3. ✅ Page web normale (pas chrome:// ou extension://)
4. 🔍 Console Chrome (F12) pour voir les logs

**Popup ne s'ouvre pas ?**
- Vérifier que `popup.html` est dans le dossier
- Recharger l'extension dans `chrome://extensions/`

**Étapes bloquées ?**
- Vérifier la connexion réseau vers localhost
- Vérifier que l'utilisateur est bien connecté

### 🔧 Développement

**Structure des fichiers :**
```
saave-extension/
├── manifest.json          # Configuration extension
├── popup.html             # Interface utilisateur
├── popup.js               # Logique popup
├── background.js          # Service worker
├── icons/                 # Icônes Saave
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── generate-saave-icons.html  # Générateur d'icônes
```

**Workflow de développement :**
1. Modifier les fichiers
2. `chrome://extensions/` → Recharger l'extension
3. Tester le popup et les fonctionnalités
4. Vérifier les logs dans la console background

### 📡 Communication Extension ↔ Webapp

L'extension communique avec l'app Saave via :
- **Détection de port** : Scan automatique 3000-3010
- **Authentification** : Vérification user connecté
- **Envoi d'URL** : sessionStorage + événements personnalisés
- **Redirection** : Activation/création d'onglet webapp
- **Messages temps réel** : Background ↔ Popup simple

**Méthodes de communication :**
1. **Onglet existant** : Injection script + événement `extensionBookmarkRequest`
2. **Pas d'onglet** : Création avec paramètre `?extensionUrl=...`
3. **Fallback** : sessionStorage `extensionBookmarkUrl`

**Avantages :**
- ✅ **Popup simple** : Design vert minimaliste
- ✅ **Processus visible** dans la webapp + terminal
- ✅ **Données complètes** (tags, description, screenshot)
- ✅ **UX fluide** : Redirection automatique

### 🎨 Personnalisation

**Modifier les icônes :**
1. Ouvrir `generate-saave-icons.html`
2. Modifier les couleurs dans le gradient CSS
3. Télécharger les nouvelles icônes
4. Recharger l'extension

**Modifier l'interface :**
- `popup.html` : Structure et styles
- `popup.js` : Logique et interactions
- `background.js` : Communication API