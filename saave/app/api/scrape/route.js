import { NextResponse } from "next/server";
import { load } from "cheerio";

export const dynamic = "force-dynamic";

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req) {
  const { url } = await req.json();
  
  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }
  
  try {
    // Vercel/serverless friendly scrape: no headless browser required.
    const REQUEST_TIMEOUT_MS = Number(process.env.SCRAPE_TIMEOUT_MS || 15000);
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const resp = await fetch(String(url), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    const html = resp.ok ? await resp.text() : '';
    clearTimeout(to);

    const $ = load(html || '');
    // remove noisy nodes
    $('script, style, noscript, svg').remove();

    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || $('h1').first().text() || '';
    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      '';

    const keywords = $('meta[name="keywords"]').attr('content') || '';
    const tags = keywords
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0 && t.length < 24)
      .slice(0, 5);

    const links = $('a[href]')
      .map((_, a) => $(a).attr('href'))
      .get()
      .map(href => String(href || '').trim())
      .filter(href => /^https?:\/\//i.test(href))
      .slice(0, 10);

    const text = $('body').text().replace(/\s\s+/g, ' ').trim();
    const content = text.substring(0, 1000);

    // crude summary: first 2-3 substantial sentences
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 40);
    const summary = sentences.slice(0, 3).join('. ').substring(0, 500);

    return NextResponse.json({
      success: true,
      title: String(title || '').trim(),
      description: String(description || '').trim() || summary.substring(0, 150),
      content,
      summary: summary || String(description || '').trim(),
      tags,
      links,
      url: String(url),
    }, { status: 200 });
    
  } catch (e) {
    console.error("Erreur lors du scraping:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
