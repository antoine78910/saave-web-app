import { NextResponse } from 'next/server';
import { load } from 'cheerio';
import { URL } from 'url';
import OpenAI from 'openai';

// Initialize OpenAI client.
// It will automatically pick up the OPENAI_API_KEY from the environment variables.
const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.statusText}` }, { status: 500 });
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

    // --- AI-Powered Tag Generation ---
    const aiTags: string[] = [domain]; // Start with the domain as a default tag

    try {
      const textContentForAI = `URL: ${url}\nTitle: ${title}\nH1: ${h1}\nDescription: ${description.substring(0, 4000)}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
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
        max_tokens: 300, // Increased max_tokens for more tags
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      if (result.tags && Array.isArray(result.tags)) {
        aiTags.push(...result.tags);
      }

    } catch (aiError) {
      console.error('AI generation failed:', aiError);
      // Fallback to meta keywords if AI fails
      const metaKeywords = $('meta[name="keywords"]').attr('content');
      if (metaKeywords) {
        aiTags.push(...metaKeywords.split(',').map(k => k.trim().toLowerCase()));
      }
    }

    // --- Favicon Fetching ---
    // Use Google's service as it's highly reliable and provides a standard size.
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    // --- Final Response ---
    const finalTags = [...new Set(aiTags)].filter(Boolean).slice(0, 15);

    console.log('AI-enhanced metadata extraction complete:', {
      title: title?.substring(0, 50) + '...',
      descriptionLength: description.length,
      tags: finalTags,
      favicon,
    });

    return NextResponse.json({
      title: title || 'Untitled',
      description: description, // Use the extracted metadata description
      tags: finalTags,
      ogImage: ogImage,
      favicon: favicon,
      url: url,
    });

  } catch (error) {
    console.error('Error extracting metadata:', error);
    return NextResponse.json({ error: 'Failed to extract metadata' }, { status: 500 });
  }
}
