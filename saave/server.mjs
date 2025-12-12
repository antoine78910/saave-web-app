import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || '0.0.0.0'; // Écouter sur toutes les interfaces pour app.localhost
const port = process.env.PORT || 5000;

// Préparer l'application Next.js
// Next.js doit accepter app.localhost comme hostname valide
const app = next({ 
  dev, 
  hostname: '0.0.0.0', // Écouter sur toutes les interfaces
  port 
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      // Extraire et parser l'URL
      const parsedUrl = parse(req.url, true);
      
      // Passer la requête à Next.js
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Erreur lors du traitement de la requête:', err);
      res.statusCode = 500;
      res.end('Erreur interne du serveur');
    }
  }).listen(port, '0.0.0.0', (err) => {
    if (err) throw err;
    console.log(`> 🚀 Serveur prêt à l'adresse http://app.localhost:${port}`);
    console.log(`> 📂 Mode: ${dev ? 'développement' : 'production'}`);
    console.log('> ✅ Votre application SAAVE est en ligne!');
    console.log(`> 🌐 Accessible sur: http://app.localhost:${port}`);
  });
});
