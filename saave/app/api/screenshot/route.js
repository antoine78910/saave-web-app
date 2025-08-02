import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { uploadScreenshotBufferToR2 } from "../../../lib/r2";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }
  const filename = `screenshot_${Date.now()}.jpg`;
  try {
    console.log('📸 Prise de screenshot RÉEL pour:', url);
    
    // Configuration Puppeteer pour éviter la détection par Cold Turkey
    const browser = await puppeteer.launch({
      headless: true, // Mode headless standard
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--mute-audio',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ],
      defaultViewport: null
    });
    
    const page = await browser.newPage();
    
    // Configuration d'une taille d'écran 16:9 standard (1280x720)
    // Configuration User-Agent réaliste pour éviter la détection de bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Headers supplémentaires pour éviter la détection
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
    });

    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
    });
    
    // Naviguer vers l'URL avec configuration plus robuste
    try {
      await page.goto(url, { 
        waitUntil: "domcontentloaded", // Plus rapide que networkidle2
        timeout: 45000 // Augmenté à 45 secondes
      });
      
      // Attendre que le contenu soit visible
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (navigationError) {
      console.warn('⚠️ Première tentative échouée, retry avec configuration minimale:', navigationError.message);
      
      // Fallback : tentative avec configuration minimale
      await page.goto(url, { 
        waitUntil: "load", 
        timeout: 60000 
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Capture directement en buffer (sans sauvegarde locale)
    console.log('📸 Capture du screenshot en mémoire...');
    const screenshotBuffer = await page.screenshot({ 
      type: "jpeg", 
      quality: 85, 
      fullPage: false 
    });
    
    await browser.close();
    
    console.log('✅ Screenshot capturé en mémoire, taille:', screenshotBuffer.length, 'bytes');
    
    // Upload DIRECTEMENT vers Cloudflare R2 (sans sauvegarde locale)
    console.log('☁️ Upload DIRECT vers Cloudflare R2...');
    const uploadResult = await uploadScreenshotBufferToR2(filename, screenshotBuffer);
    
    if (uploadResult.success) {
      console.log('✅ Upload R2 réussi:', uploadResult.url);
      return NextResponse.json({ 
        success: true, 
        filename, 
        url: uploadResult.url, // URL Cloudflare R2
        localUrl: `/captures/${filename}`, // URL locale en backup
        r2Key: uploadResult.key,
        source: 'cloudflare-r2'
      });
    } else {
      console.warn('⚠️ Upload R2 échoué, utilisation URL locale:', uploadResult.error);
      return NextResponse.json({ 
        success: true, 
        filename, 
        url: `/captures/${filename}`, // Fallback vers local
        error: uploadResult.error,
        source: 'local-fallback'
      });
    }
  } catch (e) {
    console.error('❌ Erreur screenshot:', e);
    return NextResponse.json({ 
      error: e.message 
    }, { status: 500 });
  }
}