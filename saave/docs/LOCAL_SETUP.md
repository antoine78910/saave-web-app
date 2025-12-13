# Configuration locale - app.localhost:5000

## Configuration du serveur

L'application est configurée pour fonctionner sur `http://app.localhost:5000/`

### Configuration Windows (fichier hosts)

Pour que `app.localhost` fonctionne, vous devez ajouter cette ligne dans votre fichier `hosts` :

1. Ouvrez le fichier hosts en tant qu'administrateur :
   - Chemin : `C:\Windows\System32\drivers\etc\hosts`
   - Clic droit → Ouvrir avec → Bloc-notes (en tant qu'administrateur)

2. Ajoutez cette ligne à la fin du fichier :
   ```
   127.0.0.1    app.localhost
   ```

3. Sauvegardez le fichier

### Lancer l'application

#### Option 1 : Avec server.mjs (recommandé)
```bash
npm run serve
```

#### Option 2 : Avec next dev
```bash
npm run dev
```

L'application sera accessible sur :
- `http://app.localhost:5000/`
- `http://localhost:5000/` (fonctionne aussi)

### URL Inngest en local

Pour Inngest en développement local, utilisez :
```
http://app.localhost:5000/api/inngest
```

ou

```
http://localhost:5000/api/inngest
```

**Note** : Pour tester Inngest en local avec le dashboard, consultez le guide complet dans [INNGEST_LOCAL_SETUP.md](./INNGEST_LOCAL_SETUP.md)

## Variables d'environnement

Assurez-vous d'avoir configuré dans votre `.env.local` :

```env
INNGEST_SIGNING_KEY=signkey-prod-c12a4630c2c9c0ed7d8e2ef8350ccc0ecb321215b38220aeec90ca6b1fc778ca
NEXT_PUBLIC_SITE_URL=http://app.localhost:5000
```

