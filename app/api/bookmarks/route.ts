import { NextRequest, NextResponse } from 'next/server';

// Types (should match your main app types)
interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  thumbnail: string | null;
  favicon: string;
  created_at: string;
  tags: string[];
  screenshotDescription: string;
  summary: string;
  status: 'loading' | 'complete' | 'error';
  source?: string;
}

// Simple in-memory storage (in production, use a database)
const bookmarksStore: Bookmark[] = [];

// GET endpoint to retrieve all bookmarks
export async function GET() {
  try {
    const response = NextResponse.json(bookmarksStore);
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;
  } catch (error) {
    console.error('Error retrieving bookmarks:', error);
    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    
    // Add CORS headers to error response
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return errorResponse;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, title, source } = body;

    // Validate required fields
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Generate unique ID
    const bookmarkId = Date.now().toString();
    const domain = parsedUrl.hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

    // Create initial bookmark object (processing state)
    const bookmark: Bookmark = {
      id: bookmarkId,
      url,
      title: title || 'Loading...',
      description: '',
      thumbnail: null,
      favicon,
      created_at: new Date().toISOString(),
      tags: [],
      screenshotDescription: '',
      summary: '',
      status: 'loading',
      source: source || 'extension'
    };

    // Add to store
    bookmarksStore.push(bookmark);

    // Start background processing (similar to your main app)
    processBookmarkAsync(bookmark);

    const response = NextResponse.json({
      success: true,
      bookmark,
      message: 'Bookmark saved and processing started'
    });
    
    // Add CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return response;

  } catch (error) {
    console.error('Error saving bookmark:', error);
    const errorResponse = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    
    // Add CORS headers to error response
    errorResponse.headers.set('Access-Control-Allow-Origin', '*');
    errorResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    errorResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    return errorResponse;
  }
}

// Background processing function (similar to your main app logic)
async function processBookmarkAsync(bookmark: Bookmark) {
  try {
    // Step 1: Take screenshot
    const screenshotResponse = await fetch(`${getBaseUrl()}/api/screenshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: bookmark.url })
    });

    let thumbnail = null;
    if (screenshotResponse.ok) {
      const screenshotData = await screenshotResponse.json();
      thumbnail = screenshotData.screenshot;
    }

    // Step 2: Extract metadata
    const metadataResponse = await fetch(`${getBaseUrl()}/api/extract-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: bookmark.url })
    });

    let metadataData = {};
    if (metadataResponse.ok) {
      metadataData = await metadataResponse.json();
    }

    // Step 3: Generate AI summary (if screenshot available)
    let screenshotDescription = '';
    let summary = '';
    
    if (thumbnail) {
      const aiResponse = await fetch(`${getBaseUrl()}/api/ai-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          screenshot: thumbnail,
          url: bookmark.url,
          title: bookmark.title 
        })
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        screenshotDescription = aiData.screenshotDescription || '';
        summary = aiData.summary || '';
      }
    }

    // Final bookmark object
    const metadata = metadataData as { title?: string; description?: string; tags?: string[] };
    const updatedBookmark: Bookmark = {
      ...bookmark,
      title: metadata.title || bookmark.title,
      description: metadata.description || '',
      thumbnail,
      tags: metadata.tags || [],
      screenshotDescription,
      summary,
      status: 'complete'
    };

    // Update bookmark in store
    const index = bookmarksStore.findIndex(b => b.id === bookmark.id);
    if (index !== -1) {
      bookmarksStore[index] = updatedBookmark;
    }
    
    console.log('Bookmark processed:', updatedBookmark);

  } catch (error) {
    console.error('Error processing bookmark:', error);
    // Update bookmark status to error in store
    const index = bookmarksStore.findIndex(b => b.id === bookmark.id);
    if (index !== -1) {
      bookmarksStore[index] = { ...bookmark, status: 'error' };
    }
    
    console.log('Bookmark processing failed:', bookmark.id);
  }
}

// Helper function to get base URL
function getBaseUrl(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://your-domain.com';
  }
  return 'http://localhost:3000';
}



// Enable CORS for the extension
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
