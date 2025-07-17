import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }
  const filename = `screenshot_${Date.now()}.jpg`;
  const outPath = path.join(process.cwd(), "public", "captures", filename);
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Configuration d'une taille d'écran 16:9 standard (1280x720)
    await page.setViewport({
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
    });
    
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    
    // Capture avec les mêmes dimensions (format 16:9) et qualité optimisée
    await page.screenshot({ 
      path: outPath, 
      type: "jpeg", 
      quality: 85, 
      fullPage: false 
    });
    
    await browser.close();
    return NextResponse.json({ success: true, filename, url: `/captures/${filename}` });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
