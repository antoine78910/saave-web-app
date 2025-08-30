import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// Configuration Cloudflare R2 (compatible avec l'API S3)
const r2Client = new S3Client({
  region: 'auto', // Cloudflare R2 utilise 'auto'
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT, // ex: https://xxxxx.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;
const FAVICON_BUCKET = process.env.CLOUDFLARE_R2_FAVICON_BUCKET!;
const PUBLIC_URL_BASE = process.env.CLOUDFLARE_R2_PUBLIC_URL; // ex: https://pub-xxxxx.r2.dev
const FAVICON_URL_BASE = process.env.CLOUDFLARE_R2_FAVICON_URL; // ex: https://pub-xxxxx.r2.dev

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
  needsPublicUrl?: boolean;
}

export async function getJsonFromR2<T = any>(key: string): Promise<T | null> {
  try {
    if (!process.env.CLOUDFLARE_R2_BUCKET_NAME) return null;
    const cmd = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const res = await r2Client.send(cmd);
    const stream = res.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
    }
    const buf = Buffer.concat(chunks);
    const text = buf.toString('utf8');
    return JSON.parse(text) as T;
  } catch (e) {
    return null;
  }
}

export async function putJsonToR2(key: string, data: any): Promise<boolean> {
  try {
    if (!process.env.CLOUDFLARE_R2_BUCKET_NAME) return false;
    const body = Buffer.from(JSON.stringify(data));
    const cmd = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: 'application/json',
      CacheControl: 'no-cache',
    });
    await r2Client.send(cmd);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Upload un buffer screenshot DIRECTEMENT vers Cloudflare R2 (sans sauvegarde locale)
 * @param filename - Le nom du fichier (ex: screenshot_1234567890.jpg)
 * @param screenshotBuffer - Le buffer contenant l'image
 * @returns L'URL publique du fichier uploadé
 */
export async function uploadScreenshotBufferToR2(filename: string, screenshotBuffer: Buffer): Promise<UploadResult> {
  try {
    console.log('☁️ Upload DIRECT buffer vers R2:', filename, 'Taille:', screenshotBuffer.length, 'bytes');
    
    // Vérifier les variables d'environnement
    console.log('🔧 Variables R2:', {
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT ? '✅ OK' : '❌ MANQUANT',
      accessKey: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ? '✅ OK' : '❌ MANQUANT',
      secretKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ? '✅ OK' : '❌ MANQUANT',
      bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME ? '✅ OK' : '❌ MANQUANT',
      publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL ? '✅ OK' : '⚠️ Non configuré'
    });
    
    if (!process.env.CLOUDFLARE_R2_ENDPOINT || 
        !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 
        !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || 
        !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
      throw new Error('Variables d\'environnement R2 essentielles manquantes');
    }

    // Générer une clé unique pour R2
    const timestamp = Date.now();
    const fileKey = `screenshots/${timestamp}_${filename}`;
    
    console.log('📁 Clé R2:', fileKey);
    console.log('🪣 Bucket cible:', BUCKET_NAME);
    
    // Configuration de l'upload
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: screenshotBuffer,
      ContentType: 'image/jpeg',
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000',
    };

    console.log('🚀 Envoi vers R2...');
    const command = new PutObjectCommand(uploadParams);
    const response = await r2Client.send(command);
    
    console.log('📤 Réponse R2:', {
      statusCode: response.$metadata?.httpStatusCode,
      requestId: response.$metadata?.requestId,
      etag: response.ETag
    });
    
    // Construire l'URL publique
    const publicUrl = PUBLIC_URL_BASE ? `${PUBLIC_URL_BASE}/${fileKey}` : `/r2-pending/${fileKey}`;
    
    console.log('✅ Upload R2 DIRECT réussi!');
    console.log('🌐 URL publique:', publicUrl);
    
    return {
      success: true,
      url: publicUrl,
      key: fileKey,
      needsPublicUrl: !PUBLIC_URL_BASE
    };
    
  } catch (error) {
    console.error('❌ Erreur upload R2 DIRECT:', error);
    console.error('📋 Détails erreur:', {
      name: (error as any)?.name,
      message: (error as any)?.message,
      code: (error as any)?.code,
      statusCode: (error as any)?.$metadata?.httpStatusCode
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Upload un fichier screenshot depuis /captures vers Cloudflare R2 (DEPRECATED - utiliser uploadScreenshotBufferToR2)
 * @param filename - Le nom du fichier dans /captures (ex: screenshot_1234567890.jpg)
 * @returns L'URL publique du fichier uploadé
 */
export async function uploadCaptureToR2(filename: string): Promise<UploadResult> {
  try {
    console.log('☁️ Upload vers R2:', filename);
    
    // Vérifier que les variables d'environnement essentielles sont présentes
    if (!process.env.CLOUDFLARE_R2_ENDPOINT || 
        !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || 
        !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || 
        !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
      throw new Error('Variables d\'environnement R2 essentielles manquantes');
    }

    // Chemin local du fichier
    const localPath = path.join(process.cwd(), 'public', 'captures', filename);
    
    if (!existsSync(localPath)) {
      throw new Error(`Fichier non trouvé: ${localPath}`);
    }

    // Lire le fichier
    const fileBuffer = readFileSync(localPath);
    
    // Générer une clé unique pour R2 (avec timestamp pour éviter les collisions)
    const timestamp = Date.now();
    const fileKey = `screenshots/${timestamp}_${filename}`;
    
    // Configuration de l'upload
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: 'image/jpeg',
      ContentDisposition: 'inline', // Pour affichage direct dans le navigateur
      CacheControl: 'public, max-age=31536000', // Cache 1 an
    };

    // Upload vers R2
    const command = new PutObjectCommand(uploadParams);
    await r2Client.send(command);
    
    // Construire l'URL publique (si configurée, sinon utiliser l'URL locale comme fallback)
    const publicUrl = PUBLIC_URL_BASE ? `${PUBLIC_URL_BASE}/${fileKey}` : `/r2-pending/${fileKey}`;
    
    console.log('✅ Upload R2 réussi:', publicUrl);
    
    return {
      success: true,
      url: publicUrl,
      key: fileKey,
      needsPublicUrl: !PUBLIC_URL_BASE
    };
    
  } catch (error) {
    console.error('❌ Erreur upload R2:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Fonction utilitaire pour tester la connexion R2
 */
export async function testR2Connection(): Promise<boolean> {
  try {
    // Test simple : essayer de lister les objets du bucket
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: 'test-connection' // Fichier qui n'existe probablement pas
    });
    
    await r2Client.send(command);
    return true;
  } catch (error) {
    // Si c'est une erreur "NoSuchKey", la connexion fonctionne
    if (error instanceof Error && error.name === 'NoSuchKey') {
      return true;
    }
    console.error('❌ Test connexion R2 échoué:', error);
    return false;
  }
}

/**
 * Upload un favicon vers le bucket favicon R2
 * @param filename - Le nom du fichier favicon
 * @param fileBuffer - Le contenu du fichier
 * @returns L'URL publique du favicon uploadé
 */
export async function uploadFaviconToR2(filename: string, fileBuffer: Buffer): Promise<UploadResult> {
  try {
    console.log('🎨 Upload favicon vers R2:', filename);
    
    if (!FAVICON_BUCKET) {
      throw new Error('CLOUDFLARE_R2_FAVICON_BUCKET non configuré');
    }

    // Générer une clé unique pour le favicon
    const timestamp = Date.now();
    const fileKey = `favicons/${timestamp}_${filename}`;
    
    // Configuration de l'upload
    const uploadParams = {
      Bucket: FAVICON_BUCKET,
      Key: fileKey,
      Body: fileBuffer,
      ContentType: 'image/x-icon',
      ContentDisposition: 'inline',
      CacheControl: 'public, max-age=31536000', // Cache 1 an
    };

    const command = new PutObjectCommand(uploadParams);
    await r2Client.send(command);
    
    // Construire l'URL publique
    const publicUrl = FAVICON_URL_BASE ? `${FAVICON_URL_BASE}/${fileKey}` : `/r2-pending/${fileKey}`;
    
    console.log('✅ Upload favicon R2 réussi:', publicUrl);
    
    return {
      success: true,
      url: publicUrl,
      key: fileKey,
      needsPublicUrl: !FAVICON_URL_BASE
    };
    
  } catch (error) {
    console.error('❌ Erreur upload favicon R2:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Nettoyer les anciens screenshots (optionnel)
 * Supprime les fichiers plus anciens que X jours
 */
export async function cleanupOldScreenshots(daysOld: number = 30): Promise<void> {
  // Cette fonction pourrait être implémentée pour nettoyer les anciens fichiers
  // Pour l'instant, on la laisse vide
  console.log(`🧹 Nettoyage des screenshots > ${daysOld} jours (à implémenter)`);
}