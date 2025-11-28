# Guide : Tester Inngest en local

Ce guide vous explique comment tester et développer vos fonctions Inngest en local.

## Prérequis

1. Votre application Next.js doit être en cours d'exécution
2. Les fonctions Inngest doivent être configurées

## Méthode 1 : Inngest Dev Server (Recommandé)

### Étape 1 : Installer le CLI Inngest

```bash
npm install -g inngest-cli
```

Ou avec npx (sans installation globale) :
```bash
npx inngest-cli@latest dev
```

### Étape 2 : Lancer votre application Next.js

Dans un premier terminal :
```bash
npm run dev
# ou
npm run serve
```

Votre app sera accessible sur `http://app.localhost:5000`

### Étape 3 : Lancer Inngest Dev Server

Dans un deuxième terminal :
```bash
npx inngest-cli@latest dev
```

Le serveur Inngest Dev Server sera accessible sur `http://localhost:8288` par défaut.

### Étape 4 : Configurer l'URL de votre app dans Inngest Dev Server

Quand vous lancez `inngest dev`, il vous demandera l'URL de votre serve endpoint. Entrez :

```
http://app.localhost:5000/app/api/inngest
```

ou

```
http://localhost:5000/app/api/inngest
```

### Étape 5 : Accéder au dashboard Inngest local

Ouvrez votre navigateur sur :
```
http://localhost:8288
```

Vous verrez :
- La liste de vos fonctions Inngest
- L'historique des événements
- La possibilité de déclencher des événements manuellement
- Les logs en temps réel

## Méthode 2 : Utiliser le dashboard Inngest cloud avec URL locale (via tunnel)

### Option A : Utiliser ngrok

1. Installez ngrok : https://ngrok.com/download

2. Créez un tunnel vers votre app locale :
```bash
ngrok http 5000
```

3. Utilisez l'URL ngrok dans le dashboard Inngest :
```
https://votre-url-ngrok.ngrok.io/app/api/inngest
```

### Option B : Utiliser Cloudflare Tunnel

1. Installez cloudflared : https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

2. Créez un tunnel :
```bash
cloudflared tunnel --url http://localhost:5000
```

3. Utilisez l'URL fournie dans le dashboard Inngest

## Tester vos fonctions

### Déclencher un événement depuis le code

Dans votre code, vous pouvez déclencher un événement :

```typescript
import { inngest } from '@/lib/inngest';

// Déclencher l'événement bookmark/process
await inngest.send({
  name: 'bookmark/process',
  data: {
    bookmarkId: '123',
    url: 'https://example.com',
  },
});
```

### Déclencher un événement depuis le dashboard Inngest Dev Server

1. Ouvrez `http://localhost:8288`
2. Allez dans l'onglet "Events"
3. Cliquez sur "Send Event"
4. Sélectionnez l'événement (ex: `bookmark/process`)
5. Ajoutez les données JSON :
```json
{
  "bookmarkId": "123",
  "url": "https://example.com"
}
```
6. Cliquez sur "Send"

### Voir les logs

Les logs de vos fonctions s'affichent :
- Dans la console de votre application Next.js
- Dans le dashboard Inngest Dev Server (`http://localhost:8288`)

## Variables d'environnement pour le développement local

Dans votre `.env.local` :

```env
# Pour le développement local, vous pouvez utiliser une clé de dev
# ou laisser vide si vous utilisez Inngest Dev Server
INNGEST_SIGNING_KEY=

# URL de votre app locale
NEXT_PUBLIC_SITE_URL=http://app.localhost:5000

# Optionnel : URL de l'endpoint Inngest pour le dev
INNGEST_EVENT_KEY=your-dev-event-key
```

## Dépannage

### Erreur "No functions registered"

- Vérifiez que vos fonctions sont bien exportées dans `lib/inngest-functions.ts`
- Vérifiez que le serve handler importe bien toutes les fonctions
- Redémarrez votre serveur Next.js

### Erreur de connexion

- Vérifiez que votre app Next.js est bien lancée
- Vérifiez que l'URL dans Inngest Dev Server est correcte
- Vérifiez que le port 5000 n'est pas utilisé par un autre processus

### Les événements ne se déclenchent pas

- Vérifiez les logs dans la console Next.js
- Vérifiez les logs dans le dashboard Inngest Dev Server
- Vérifiez que le nom de l'événement correspond exactement à celui défini dans votre fonction

## Ressources

- Documentation Inngest : https://www.inngest.com/docs
- CLI Inngest : https://www.inngest.com/docs/local-development

