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
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { url } = await request.json();

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

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.statusText}` },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        }
      );
    }

    const html = await response.text();
    const $ = load(html);

    // --- Basic Metadata Extraction ---
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || $('h1').first().text() || '';
    let description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || '';
    const h1 = $('h1').first().text().trim();
    const domain = new URL(url).hostname.replace('www.', '');
    const ogImage = $('meta[property="og:image"]').attr('content') || '';

    // If description is missing, construct one from the main content
    if (!description) {
      const mainContent = $('article, .content, .main, main, #main, #content').first().text().trim();
      if (mainContent) {
        description = mainContent.substring(0, 2000).replace(/\s\s+/g, ' ');
      } else {
        description = $('body').text().trim().substring(0, 2000).replace(/\s\s+/g, ' ');
      }
    }

    // --- AI-Powered Tag Generation or Fallback ---
    const aiTags: string[] = [domain]; // Start with the domain as a default tag

    // Try AI generation if OpenAI is available
    if (openai) {
      try {
        const textContentForAI = `URL: ${url}\nTitle: ${title}\nH1: ${h1}\nDescription: ${description.substring(0, 4000)}`;

        const completion = await openai.chat.completions.create({
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
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');
        if (result.tags && Array.isArray(result.tags)) {
          aiTags.push(...result.tags);
        }

      } catch (aiError) {
        console.error('AI generation failed:', aiError);
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

    console.log('AI-enhanced metadata extraction complete:', {
      title: title?.substring(0, 50) + '...',
      descriptionLength: description.length,
      tags: finalTags,
      favicon,
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
    console.error('Error extracting metadata:', error);
    return NextResponse.json(
      { error: 'Failed to extract metadata' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
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
