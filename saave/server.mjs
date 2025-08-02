import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;

// Préparer l'application Next.js
const app = next({ dev, hostname, port });
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
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> 🚀 Serveur prêt à l'adresse http://${hostname}:${port}`);
    console.log(`> 📂 Mode: ${dev ? 'développement' : 'production'}`);
    console.log('> ✅ Votre application SAAVE est en ligne!');
  });
});
