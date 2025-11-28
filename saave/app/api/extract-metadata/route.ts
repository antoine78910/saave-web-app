import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { URL } from 'url';
import OpenAI from 'openai';

// Initialize OpenAI client only if API key is available
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI();
}

export async function POST(request: Request) {
  try {
    const started = Date.now();
    const { url, content } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    const REQUEST_TIMEOUT_MS = Number(process.env.METADATA_TIMEOUT_MS || 8000);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let html = '';
    let $ = load('');
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: controller.signal,
      });
      if (response.ok) {
        html = await response.text();
        $ = load(html);
      } else {
        console.warn('extract-metadata: non-OK response', response.status, response.statusText);
      }
    } catch (err) {
      console.warn('extract-metadata: fetch failed/timeout:', (err as any)?.message);
    } finally {
      clearTimeout(timeout);
    }

    // --- Basic Metadata Extraction ---
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || $('h1').first().text() || '';
    let description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text().trim();
    const domain = new URL(url).hostname.replace('www.', '');
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    // If description is missing, try multiple strategies to extract it
    if (!description || description.trim().length < 20) {
      // Strategy 1: Try to find paragraph text near the h1 or title
      const h1Element = $('h1').first();
      if (h1Element.length) {
        const nextParagraph = h1Element.nextAll('p').first().text().trim();
        if (nextParagraph && nextParagraph.length > 20) {
          description = nextParagraph.substring(0, 500);
        }
      }

      // Strategy 2: Look for common description containers
      if (!description || description.length < 20) {
        const descriptionSelectors = [
          'meta[name="twitter:description"]',
          '.description',
          '.subtitle',
          '.lead',
          '.intro',
          '[class*="description"]',
          '[class*="intro"]',
          '[class*="summary"]',
          'p.lead',
          'p.intro',
        ];
        
        for (const selector of descriptionSelectors) {
          const found = $(selector).first().text().trim();
          if (found && found.length > 20) {
            description = found.substring(0, 500);
            break;
          }
        }
      }

      // Strategy 3: Extract from main content areas
      if (!description || description.length < 20) {
        const mainContent = $('article, .content, .main, main, #main, #content, section').first().text().trim();
        if (mainContent && mainContent.length > 50) {
          // Take first meaningful paragraph (at least 50 chars)
          const paragraphs = mainContent.split(/\n\n|\r\n\r\n/).filter(p => p.trim().length > 50);
          if (paragraphs.length > 0) {
            description = paragraphs[0].substring(0, 500).replace(/\s\s+/g, ' ').trim();
          }
        }
      }

      // Strategy 4: Use scraped content if available
      if ((!description || description.length < 20) && content && typeof content === 'string' && content.length > 50) {
        // Clean and extract meaningful text from scraped content
        const cleanedContent = content.replace(/\s\s+/g, ' ').trim();
        const sentences = cleanedContent.split(/[.!?]+/).filter(s => s.trim().length > 30);
        if (sentences.length > 0) {
          // Take first 2-3 sentences
          description = sentences.slice(0, 3).join('. ').substring(0, 500).trim();
          if (!description.endsWith('.')) description += '.';
        }
      }

      // Strategy 5: Fallback to body text (last resort)
      if (!description || description.length < 20) {
        const bodyText = $('body').text().trim();
        if (bodyText && bodyText.length > 50) {
          // Remove common noise (navigation, footer, etc.)
          $('nav, footer, header, script, style, .nav, .footer, .header').remove();
          const cleanBody = $('body').text().trim();
          const firstParagraph = cleanBody.split(/\n\n|\r\n\r\n/).find(p => p.trim().length > 50);
          if (firstParagraph) {
            description = firstParagraph.substring(0, 500).replace(/\s\s+/g, ' ').trim();
          }
        }
      }
    }

    // Clean up description
    if (description) {
      description = description
        .replace(/\s\s+/g, ' ')
        .replace(/\n+/g, ' ')
        .trim()
        .substring(0, 1000); // Limit to 1000 chars
    }

    // --- AI-Powered Tag Generation or Fallback ---
    const aiTags: string[] = [domain]; // Start with the domain as a default tag

    // Try AI generation if OpenAI is available
    if (openai) {
      try {
        const textContentForAI = `URL: ${url}\nTitle: ${title}\nH1: ${h1}\nDescription: ${description.substring(0, 4000)}`;
        const AI_TIMEOUT_MS = Number(process.env.METADATA_AI_TIMEOUT_MS || 5000);
        const withTimeout = <T>(p: Promise<T>) => {
          return new Promise<T>((resolve, reject) => {
            const to = setTimeout(() => reject(new Error('openai_timeout')), AI_TIMEOUT_MS);
            p.then(v => { clearTimeout(to); resolve(v); }).catch(e => { clearTimeout(to); reject(e); });
          });
        };

        const completion = await withTimeout(openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert assistant specializing in extracting relevant keywords from web content. Analyze the provided text (Title, H1, Description) and URL. Provide a list of 15-20 relevant, lowercase, single-word tags that describe the content, topic, industry, and context. Return the result as a JSON object with a 'tags' key."
            },
            {
              role: "user",
              content: textContentForAI,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.5,
          max_tokens: 300,
        }));

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        if (result.tags && Array.isArray(result.tags)) {
          aiTags.push(...result.tags);
        }

      } catch (aiError) {
        console.warn('AI generation failed/timeout:', (aiError as any)?.message);
      }
    }
    
    // Fallback to basic tag extraction
    if (aiTags.length <= 1) {
      // Extract tags from meta keywords
      const metaKeywords = $('meta[name="keywords"]').attr('content');
      if (metaKeywords) {
        aiTags.push(...metaKeywords.split(',').map(k => k.trim().toLowerCase()));
      }
      
      // Extract basic tags from title and description
      const words = (title + ' ' + description).toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .slice(0, 10);
      aiTags.push(...words);
    }

    // --- Favicon Fetching ---
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    // --- Final Response ---
    const finalTags = [...new Set(aiTags)].filter(Boolean).slice(0, 15);

    console.log('extract-metadata done in', Date.now() - started, 'ms', {
      title: title?.substring(0, 50) + '...',
      descriptionLength: description.length,
      tagsCount: finalTags.length,
    });

    return NextResponse.json(
      {
        title: title || 'Untitled',
        description: description,
        tags: finalTags,
        ogImage: ogImage,
        favicon: favicon,
        url: url,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );

  } catch (error) {
    console.warn('extract-metadata unexpected error, returning fallback:', (error as any)?.message);
    try {
      const { url } = await request.json();
      const domain = url ? new URL(url).hostname.replace('www.', '') : 'unknown';
      return NextResponse.json(
        {
          title: domain,
          description: '',
          tags: [domain],
          ogImage: '',
          favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
          url,
        },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    } catch {
      return NextResponse.json(
        { title: 'Untitled', description: '', tags: [], ogImage: '', favicon: '', url: '' },
        {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
