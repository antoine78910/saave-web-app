# 🔖 Saave - Extension Chrome

Extension Chrome pour ajouter instantanément des bookmarks à votre collection Saave d'un simple clic !

## ✨ Fonctionnalités

- ✅ **Ajout en un clic** - Cliquez sur l'icône pour sauvegarder la page courante
- 📄 **Métadonnées automatiques** - Extrait le titre, description, favicon et thumbnail
- 🔐 **Connexion automatique** - Détecte votre session Saave existante
- 🔔 **Notifications** - Confirmations de succès/échec
- 🌐 **Support universel** - Fonctionne sur tous les sites web

## 📦 Installation

### 1. Préparer l'extension
1. Téléchargez ou clonez ce dossier `saave-extension`
2. Assurez-vous que votre application Saave est lancée sur `http://localhost:3000` (ou autre port)

### 2. Installer dans Chrome
1. Ouvrez Chrome et allez à `chrome://extensions/`
2. Activez le **"Mode développeur"** (toggle en haut à droite)
3. Cliquez sur **"Charger l'extension non empaquetée"**
4. Sélectionnez le dossier `saave-extension`
5. L'icône Saave apparaît dans la barre d'outils ! 🎉

## 🚀 Utilisation

### Première utilisation
1. **Connectez-vous** à votre app Saave sur `http://localhost:3000`
2. L'extension détectera automatiquement votre session

### Ajouter un bookmark
1. Naviguez vers n'importe quelle page web
2. Cliquez sur l'icône Saave dans la barre d'outils
3. ✅ Le bookmark est automatiquement ajouté avec toutes les métadonnées !

## 🔧 Configuration

L'extension recherche automatiquement votre serveur Saave sur les ports :
- `3000` à `3010`

Si votre app Saave utilise un autre port, modifiez le tableau `API_PORTS` dans `background.js`.

## 🐛 Dépannage

### "Aucun serveur Saave trouvé"
- Vérifiez que votre app Saave est lancée
- L'URL doit être accessible sur `http://localhost:XXXX`

### "Connexion requise"
- Connectez-vous sur votre app Saave dans Chrome
- L'extension ouvrira automatiquement l'onglet de connexion

### "Impossible de sauvegarder cette page"
- L'extension ne fonctionne pas sur les pages Chrome internes
- Essayez sur une page web classique (http/https)

## 🛠️ Développement

Structure de l'extension :
```
saave-extension/
├── manifest.json       # Configuration de l'extension
├── background.js       # Script principal
├── icons/             
│   ├── icon16.png      # Icône 16x16
│   ├── icon48.png      # Icône 48x48
│   └── icon128.png     # Icône 128x128
└── README.md          # Cette documentation
```

## 📝 Logs

Pour déboguer, ouvrez la console des outils de développement Chrome :
1. `chrome://extensions/`
2. Cliquez sur "Détails" de l'extension Saave
3. Cliquez sur "Afficher les vues : service worker"
4. Les logs de l'extension s'affichent dans la console

---

**Développé pour Saave** - Gestionnaire de bookmarks moderne 🚀