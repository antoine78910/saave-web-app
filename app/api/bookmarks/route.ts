import { NextRequest, NextResponse } from 'next/server';

interface Bookmark {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  thumbnail?: string;
  tags?: string[];
  category_id: string | null;
  created_at: string;
  source: string;
  user_id: string;
}

// Store en mémoire pour les bookmarks par utilisateur
const bookmarksStore: Map<string, Bookmark[]> = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  
  console.log('GET /api/bookmarks - User ID:', userId);
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  const userBookmarks = bookmarksStore.get(userId) || [];
  console.log('GET /api/bookmarks - Returning bookmarks for user:', userId, userBookmarks);
  
  try {
    return NextResponse.json(userBookmarks, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('POST /api/bookmarks - Received data:', data);
    
    if (!data.user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Créer un nouveau bookmark avec toutes les métadonnées
    const newBookmark: Bookmark = {
      id: crypto.randomUUID(),
      url: data.url,
      title: data.title,
      description: data.description || '',
      favicon: data.favicon || '',
      thumbnail: data.thumbnail || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      category_id: data.category_id || null,
      created_at: new Date().toISOString(),
      source: data.source || 'webapp',
      user_id: data.user_id
    };
    
    // Ajouter le bookmark au store de l'utilisateur
    const userBookmarks = bookmarksStore.get(data.user_id) || [];
    userBookmarks.push(newBookmark);
    bookmarksStore.set(data.user_id, userBookmarks);
    
    console.log('Bookmark added for user:', data.user_id, newBookmark);
    
    return NextResponse.json(newBookmark, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error adding bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to add bookmark' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
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
