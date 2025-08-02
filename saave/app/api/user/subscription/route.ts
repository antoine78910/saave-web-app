import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    console.log('🔧 GET /api/user/subscription [DEV MODE] - Email:', email);
    
    if (!email || email === 'No email') {
      console.log('📧 Email invalide, retour subscription par défaut');
      return NextResponse.json({
        subscription_type: 'free',
        subscription_status: 'active',
        bookmarks_limit: 20,
        bookmarks_count: 0,
        plan: 'free',
        bookmarkLimit: 20,
        dev_mode: true
      });
    }
    
    // Compter les vrais bookmarks de l'utilisateur
    let userBookmarksCount = 0;
    try {
      const BOOKMARKS_FILE = join(process.cwd(), 'dev-bookmarks.json');
      if (existsSync(BOOKMARKS_FILE)) {
        const data = readFileSync(BOOKMARKS_FILE, 'utf8');
        const allBookmarks = JSON.parse(data);
        userBookmarksCount = allBookmarks.filter((bookmark: any) => 
          bookmark.user_id === 'dev-user-123'
        ).length;
      }
    } catch (error) {
      console.warn('⚠️ Erreur lecture bookmarks pour comptage:', error);
    }

    // En mode développement, simuler un plan GRATUIT avec limite de 20
    const mockSubscription = {
      subscription_type: 'free',
      subscription_status: 'active',
      bookmarks_limit: 20, // Pour la compatibilité API
      bookmarks_count: userBookmarksCount, // Compter les vrais bookmarks
      plan: 'free', // Plan pour le frontend
      bookmarkLimit: 20, // Nom utilisé par useSubscription hook
      dev_mode: true
    };
    
    console.log('✅ Subscription simulée retournée:', mockSubscription);
    
    return NextResponse.json(mockSubscription, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('❌ Erreur subscription:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch subscription (dev mode)',
        subscription_type: 'free',
        subscription_status: 'active',
        bookmarks_limit: 20,
        bookmarks_count: 0,
        plan: 'free',
        bookmarkLimit: 20,
        dev_mode: true
      },
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