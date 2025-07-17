import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const { url } = await req.json();
  
  if (!url) {
    return NextResponse.json({ error: "Missing URL" }, { status: 400 });
  }
  
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // Naviguer vers la page
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    
    // 1. Scraping du contenu et métadonnées
    const metadata = await page.evaluate(() => {
      // Extraction du titre
      const title = document.title || document.querySelector('h1')?.textContent || '';
      
      // Extraction de la description
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                             document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      
      // Extraction du contenu principal (texte visible)
      function getVisibleText() {
        const bodyText = document.body.innerText;
        return bodyText.substring(0, 1000); // Limiter pour éviter les données trop volumineuses
      }
      
      // Extraction des mots-clés/tags
      const keywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
      const tags = keywords.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag.length < 20)
        .slice(0, 5);  // Limiter à 5 tags
      
      // Extraction des liens
      const links = Array.from(document.querySelectorAll('a[href]'))
        .map(a => a.href)
        .filter(href => href.startsWith('http'))
        .slice(0, 10);  // Limiter à 10 liens
        
      return {
        title,
        description: metaDescription,
        content: getVisibleText(),
        tags,
        links,
        url: document.URL
      };
    });
    
    // 2. Analyse du contenu pour générer un résumé
    const summary = await page.evaluate(() => {
      // Chercher les sections importantes (paragraphes non vides)
      const paragraphs = Array.from(document.querySelectorAll('p'))
        .map(p => p.textContent.trim())
        .filter(text => text.length > 50)  // Paragraphes substantiels uniquement
        .slice(0, 3);  // Prendre les 3 premiers paragraphes significatifs
        
      return paragraphs.join('\n\n').substring(0, 500); // Limiter la longueur totale
    });
    
    // Fermer le navigateur
    await browser.close();
    
    return NextResponse.json({
      success: true,
      title: metadata.title,
      description: metadata.description || summary.substring(0, 150),
      content: metadata.content,
      summary: summary || metadata.description,
      tags: metadata.tags,
      links: metadata.links,
      url: metadata.url
    });
    
  } catch (e) {
    console.error("Erreur lors du scraping:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
