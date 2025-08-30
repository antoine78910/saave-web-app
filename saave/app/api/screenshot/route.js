import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { uploadScreenshotBufferToR2 } from "../../../lib/r2";

export const dynamic = "force-dynamic";

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req) {
  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }
  const filename = `screenshot_${Date.now()}.jpg`;
  try {
    console.log('📸 Prise de screenshot RÉEL pour:', url);
    
    const executablePath = (await chromium.executablePath()) || '/usr/bin/chromium'
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    })
    
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
    
    // Upload vers R2 si config présente; sinon retourner un data URL pour l'affichage immédiat
    const hasR2Config = !!(process.env.CLOUDFLARE_R2_ENDPOINT && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY && process.env.CLOUDFLARE_R2_BUCKET_NAME)
    if (hasR2Config) {
      console.log('☁️ Upload DIRECT vers Cloudflare R2...');
      const uploadResult = await uploadScreenshotBufferToR2(filename, screenshotBuffer);
      if (uploadResult.success) {
        console.log('✅ Upload R2 réussi:', uploadResult.url);
        return NextResponse.json({ success: true, filename, url: uploadResult.url, r2Key: uploadResult.key, source: 'cloudflare-r2' });
      }
      console.warn('⚠️ Upload R2 échoué:', uploadResult.error)
    }
    const dataUrl = `data:image/jpeg;base64,${Buffer.from(screenshotBuffer).toString('base64')}`
    return NextResponse.json({ success: true, filename, url: dataUrl, source: 'data-url' })
  } catch (e) {
    console.error('❌ Erreur screenshot:', e);
    return NextResponse.json({ 
      error: e.message 
    }, { status: 500 });
  }
}