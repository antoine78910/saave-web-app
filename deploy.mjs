#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le chemin du répertoire courant en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du déploiement

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

console.log(`${colors.blue}=====================================${colors.reset}`);
console.log(`${colors.blue}   SAAVE.IO - SCRIPT DE DÉPLOIEMENT${colors.reset}`);
console.log(`${colors.blue}=====================================${colors.reset}\n`);

// Vérifier que les fichiers essentiels existent
try {
  if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
    throw new Error('package.json est manquant');
  }

  if (!fs.existsSync(path.join(__dirname, 'next.config.js'))) {
    throw new Error('next.config.js est manquant');
  }
} catch (error) {
  console.error(`${colors.red}✖ Erreur: ${error.message}${colors.reset}`);
  process.exit(1);
}

// Fonction pour exécuter des commandes avec affichage
function execCommand(command, message) {
  console.log(`${colors.yellow}→ ${message}...${colors.reset}`);
  try {
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`${colors.red}✖ Échec: ${error.message}${colors.reset}`);
    return false;
  }
}

// Vérifier les variables d'environnement
console.log(`${colors.blue}Vérification des variables d'environnement...${colors.reset}`);
const envFile = path.join(__dirname, '.env.local');
if (!fs.existsSync(envFile)) {
  console.log(`${colors.yellow}⚠ Attention: .env.local introuvable${colors.reset}`);
  console.log(`${colors.yellow}⚠ Assurez-vous que vos variables Supabase sont configurées!${colors.reset}`);
} else {
  console.log(`${colors.green}✓ Fichier .env.local trouvé${colors.reset}`);
}

// Installer les dépendances
if (!execCommand('npm install', 'Installation des dépendances')) {
  process.exit(1);
}

// Build de l'application
if (!execCommand('npm run build', 'Construction de l\'application')) {
  process.exit(1);
}

// Démarrer l'application
console.log(`\n${colors.green}✓ Déploiement réussi!${colors.reset}`);
console.log(`${colors.blue}-----------------------------------${colors.reset}`);
console.log(`${colors.green}Pour démarrer le serveur en production:${colors.reset}`);
console.log(`${colors.yellow}NODE_ENV=production node server.mjs${colors.reset}`);
console.log(`\n${colors.green}Pour démarrer en développement:${colors.reset}`);
console.log(`${colors.yellow}node server.mjs${colors.reset}`);
console.log(`${colors.blue}-----------------------------------${colors.reset}`);
