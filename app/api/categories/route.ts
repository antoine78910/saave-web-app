import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface Category {
  id: string;
  name: string;
  color: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Stockage local pour le développement
const CATEGORIES_FILE = join(process.cwd(), 'dev-categories.json');

function getCategories(): Category[] {
  try {
    if (!existsSync(CATEGORIES_FILE)) {
      console.log('📁 Création du fichier categories:', CATEGORIES_FILE);
      const defaultCategories: Category[] = [
        {
          id: 'cat-1',
          name: 'Travail',
          color: '#3B82F6',
          user_id: 'dev-user-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'cat-2',
          name: 'Personnel',
          color: '#10B981',
          user_id: 'dev-user-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'cat-3',
          name: 'Développement',
          color: '#8B5CF6',
          user_id: 'dev-user-123',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      writeFileSync(CATEGORIES_FILE, JSON.stringify(defaultCategories, null, 2));
      return defaultCategories;
    }
    const data = readFileSync(CATEGORIES_FILE, 'utf8');
    const categories = JSON.parse(data);
    console.log('📚 Catégories chargées:', categories.length);
    return categories;
  } catch (error) {
    console.warn('⚠️ Erreur lecture catégories:', error);
    return [];
  }
}

function saveCategories(categories: Category[]) {
  try {
    writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
    console.log('💾 Catégories sauvegardées:', categories.length);
  } catch (error) {
    console.error('❌ Erreur sauvegarde catégories:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  
  console.log('🔧 GET /api/categories [DEV MODE] - User ID:', userId);
  
  if (!userId) {
    return NextResponse.json(
      { error: 'User ID is required' },
      { status: 400 }
    );
  }
  
  try {
    const allCategories = getCategories();
    const userCategories = allCategories.filter(category => category.user_id === userId);
    
    console.log('🏷️ Catégories trouvées pour utilisateur', userId, ':', userCategories.length);
    
    return NextResponse.json(userCategories || [], {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('❌ Erreur lecture catégories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories (dev mode)' },
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
    console.log('🔧 POST /api/categories [DEV MODE] - Données reçues:', data);
    
    if (!data.user_id) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // Créer une nouvelle catégorie
    const newCategory: Category = {
      id: Date.now().toString(),
      name: data.name,
      color: data.color || '#6B7280',
      user_id: data.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Ajouter à la liste
    const allCategories = getCategories();
    allCategories.push(newCategory);
    saveCategories(allCategories);
    
    console.log('✅ Catégorie ajoutée pour utilisateur:', data.user_id, '- Total:', allCategories.length);
    
    return NextResponse.json(newCategory, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('❌ Erreur ajout catégorie:', error);
    return NextResponse.json(
      { error: 'Failed to add category (dev mode)' },
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