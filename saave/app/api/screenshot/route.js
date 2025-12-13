import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";
import path from "path";
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

    let browser = null;
    let page = null;

    // IMPORTANT: Prefer bundled Chromium in dev/local, and @sparticuz/chromium in serverless/prod.
    // Also: avoid `pipe: true` unless using `--remote-debugging-pipe` (mismatch can break launches).
    if (process.env.VERCEL !== '1' && (process.env.NODE_ENV !== 'production' || process.platform === 'win32')) {
      try {
        const mod = await import('puppeteer');
        const puppeteer = mod.default || mod;
        browser = await puppeteer.launch({
          headless: 'new',
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });
        console.log('🚀 Launched puppeteer (bundled Chromium)');
      } catch (e) {
        console.warn('⚠️ puppeteer not available, using @sparticuz/chromium instead:', e?.message);
      }
    }

    if (!browser) {
      const executablePath = (await chromium.executablePath()) || '/usr/bin/chromium';
      // Ensure shared libs shipped with @sparticuz/chromium are discoverable (fixes libnss3.so missing on some runtimes)
      try {
        const dir = path.dirname(executablePath);
        const libDir = path.join(dir, 'lib');
        const libsDir = path.join(dir, 'libs');
        const prev = process.env.LD_LIBRARY_PATH || '';
        process.env.LD_LIBRARY_PATH = [libDir, libsDir, dir, prev].filter(Boolean).join(':');
      } catch {}
      console.log('ℹ️ Using @sparticuz/chromium at', executablePath, 'on', process.platform);
      browser = await puppeteerCore.launch({
        args: [...(chromium.args || []), '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars', '--disable-dev-shm-usage'],
        defaultViewport: chromium.defaultViewport || { width: 1280, height: 720 },
        executablePath,
        headless: chromium.headless !== false,
        ignoreHTTPSErrors: true,
      });
      console.log('🚀 Launched puppeteer-core with @sparticuz/chromium');
    }

    try {
      page = await browser.newPage();

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

      console.log('🧭 Navigating to target URL...', url)
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

      console.log('✅ Screenshot capturé en mémoire, taille:', screenshotBuffer.length, 'bytes');

      // Upload vers R2 si config présente; sinon retourner un data URL pour l'affichage immédiat
      const hasR2Config = !!(process.env.CLOUDFLARE_R2_ENDPOINT && process.env.CLOUDFLARE_R2_ACCESS_KEY_ID && process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY && process.env.CLOUDFLARE_R2_BUCKET_NAME)
      console.log('🔎 R2 configured:', hasR2Config)
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
    } finally {
      try { await page?.close?.(); } catch {}
      try { await browser?.close?.(); } catch {}
    }
  } catch (e) {
    // Vercel frequently cannot run headless Chromium due to missing system libs (ex: libnss3.so).
    // Don't fail the whole bookmark pipeline: return a remote screenshot URL fallback.
    const msg = (e && e.message) ? e.message : String(e || 'unknown_error');
    console.error('❌ Erreur screenshot:', e);
    // mShots can get stuck on "Generating Preview..." for some domains, so prefer thum.io as a more stable fallback.
    const fallbackUrl = `https://image.thum.io/get/width/1280/crop/720/noanimate/${encodeURIComponent(String(url))}`;
    console.warn('🟡 Screenshot fallback used:', { fallbackUrl, error: msg });
    return NextResponse.json({
      success: true,
      filename,
      url: fallbackUrl,
      source: 'thumio-fallback',
      warning: 'chromium_unavailable',
    }, { status: 200 });
  }
}