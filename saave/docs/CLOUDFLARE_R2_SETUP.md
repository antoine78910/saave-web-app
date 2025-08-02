# 🌐 Configuration Cloudflare R2 pour Saave

Ce guide vous explique comment configurer Cloudflare R2 pour stocker les screenshots de votre application Saave.

## 📋 Prérequis

- Un compte Cloudflare (gratuit)
- Accès à Cloudflare R2 Object Storage

## 🛠️ Étapes de configuration

### 1. Activer Cloudflare R2

1. Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Dans la barre latérale, cliquez sur **"R2 Object Storage"**
3. Si ce n'est pas encore activé, activez R2 (il y a un quota gratuit généreux)

### 2. Créer un bucket

1. Dans la section R2, cliquez sur **"Create bucket"**
2. Nommez votre bucket : `saave-screenshots` (ou le nom de votre choix)
3. Choisissez une région proche de vos utilisateurs
4. Cliquez sur **"Create bucket"**

### 3. Configurer l'accès public (optionnel)

1. Dans votre bucket, allez dans l'onglet **"Settings"**
2. Sous **"Public access"**, cliquez sur **"Allow Access"** 
3. Ou configurez un domaine personnalisé pour un URL plus propre

### 4. Créer des clés API

1. Allez dans **"Manage R2 API tokens"** (dans la section R2)
2. Cliquez sur **"Create API token"**
3. Choisissez **"Custom token"**
4. Configuration recommandée :
   - **Token name**: `saave-screenshots-access`
   - **Permissions**: `Admin Read & Write`
   - **Account Resources**: Include - All accounts
   - **Bucket Resources**: Include - Specific bucket: `saave-screenshots`
5. Cliquez sur **"Continue to summary"** puis **"Create Token"**
6. **IMPORTANT**: Copiez et sauvegardez immédiatement :
   - Access Key ID
   - Secret Access Key
   - Endpoint URL

### 5. Trouver votre endpoint et URL publique

#### Endpoint R2 :
- Se trouve dans la page des API tokens ou les détails de votre compte R2
- Format : `https://xxxxxxxxxxxxx.r2.cloudflarestorage.com`

#### URL publique :
- **Option 1 (Simple)**: `https://pub-xxxxxxxxxxxxx.r2.dev/`
- **Option 2 (Domaine personnalisé)**: Configurez un CNAME dans vos DNS

### 6. Configuration des variables d'environnement

Créez un fichier `.env.local` dans votre projet avec :

```env
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ENDPOINT=https://xxxxxxxxxxxxx.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id_here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key_here
CLOUDFLARE_R2_BUCKET_NAME=saave-screenshots
CLOUDFLARE_R2_PUBLIC_URL=https://pub-xxxxxxxxxxxxx.r2.dev
```

## 🧪 Test de la configuration

Pour tester que tout fonctionne :

1. Redémarrez votre serveur de développement : `npm run dev`
2. Ajoutez un bookmark dans votre application
3. Vérifiez les logs de la console pour voir :
   ```
   ☁️ Upload vers Cloudflare R2...
   ✅ Upload R2 réussi: https://pub-xxxxx.r2.dev/screenshots/...
   ```
4. Le screenshot devrait être accessible via l'URL Cloudflare

## 💰 Coûts

Cloudflare R2 offre un quota gratuit généreux :
- **10 GB** de stockage gratuit
- **1 million** d'opérations de lecture gratuites par mois
- **1 million** d'opérations d'écriture gratuites par mois

Pour une application de bookmarks, cela devrait largement suffire pour commencer !

## 🔒 Sécurité

- Les clés API ne sont jamais exposées côté client
- Seul votre serveur Next.js a accès aux clés
- Les screenshots sont stockés avec des noms uniques (collision impossible)
- Les fichiers sont mis en cache pour 1 an (performance optimale)

## 🚨 Dépannage

### Erreur "Variables d'environnement R2 manquantes"
- Vérifiez que toutes les variables sont dans `.env.local`
- Redémarrez le serveur après modification du fichier

### Erreur "Access Denied"
- Vérifiez que votre token API a les bonnes permissions
- Assurez-vous que le nom du bucket est correct

### Upload échoue mais l'app fonctionne
- L'application utilise automatiquement le stockage local en fallback
- Vérifiez vos logs pour identifier le problème

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :
1. Les logs de votre console de développement
2. La configuration de votre bucket R2
3. Les permissions de votre token API
4. Que toutes les variables d'environnement sont correctes