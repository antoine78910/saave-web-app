import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
  updated_at: string;
  source: string;
  user_id: string;
}

// Stockage local pour le développement
const BOOKMARKS_FILE = join(process.cwd(), 'dev-bookmarks.json');

function getBookmarks(): Bookmark[] {
  try {
    if (!existsSync(BOOKMARKS_FILE)) {
      console.log('📁 Création du fichier bookmarks:', BOOKMARKS_FILE);
      writeFileSync(BOOKMARKS_FILE, JSON.stringify([], null, 2));
      return [];
    }
    const data = readFileSync(BOOKMARKS_FILE, 'utf8');
    const bookmarks = JSON.parse(data);
    console.log('📚 Bookmarks chargés:', bookmarks.length);
    return bookmarks;
  } catch (error) {
    console.warn('⚠️ Erreur lecture bookmarks:', error);
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]) {
  try {
    writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));
    console.log('💾 Bookmarks sauvegardés:', bookmarks.length);
  } catch (error) {
    console.error('❌ Erreur sauvegarde bookmarks:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  
  console.log('🔧 GET /api/bookmarks [DEV MODE] - User ID:', userId);
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const allBookmarks = getBookmarks();
    const userBookmarks = allBookmarks.filter(bookmark => bookmark.user_id === userId);
    
    console.log('📚 Bookmarks trouvés pour utilisateur', userId, ':', userBookmarks.length);
    
    return NextResponse.json(userBookmarks || [], {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('❌ Erreur lecture bookmarks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks (dev mode)' },
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
    console.log('🔧 POST /api/bookmarks [DEV MODE] - Données reçues:', data);
    
    if (!data.user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Créer un nouveau bookmark
    const newBookmark: Bookmark = {
      id: Date.now().toString(),
      url: data.url,
      title: data.title,
      description: data.description || '',
      favicon: data.favicon || '',
      thumbnail: data.thumbnail || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      category_id: data.category_id || null,
      source: data.source || 'webapp',
      user_id: data.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Ajouter à la liste
    const allBookmarks = getBookmarks();
    allBookmarks.push(newBookmark);
    saveBookmarks(allBookmarks);
    
    console.log('✅ Bookmark ajouté pour utilisateur:', data.user_id, '- Total:', allBookmarks.length);
    
    return NextResponse.json(newBookmark, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('❌ Erreur ajout bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to add bookmark (dev mode)' },
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookmarkId = searchParams.get('id');
    const userId = searchParams.get('user_id');
    
    console.log('🔧 DELETE /api/bookmarks [DEV MODE] - ID:', bookmarkId, 'User:', userId);
    
    if (!bookmarkId || !userId) {
      return NextResponse.json(
        { error: 'Bookmark ID and User ID are required' },
        { status: 400 }
      );
    }
    
    // Charger les bookmarks actuels
    const allBookmarks = getBookmarks();
    
    // Filtrer pour supprimer le bookmark
    const updatedBookmarks = allBookmarks.filter(
      bookmark => !(bookmark.id === bookmarkId && bookmark.user_id === userId)
    );
    
    if (allBookmarks.length === updatedBookmarks.length) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }
    
    // Sauvegarder la liste mise à jour
    saveBookmarks(updatedBookmarks);
    
    console.log('🗑️ Bookmark supprimé, reste:', updatedBookmarks.filter(b => b.user_id === userId).length);
    
    return NextResponse.json({ 
      message: 'Bookmark deleted successfully',
      remaining: updatedBookmarks.filter(b => b.user_id === userId).length
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('❌ Erreur suppression bookmark:', error);
    return NextResponse.json(
      { error: 'Failed to delete bookmark (dev mode)' },
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