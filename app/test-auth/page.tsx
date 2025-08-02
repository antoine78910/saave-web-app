"use client";

import { useAuth } from '../../src/hooks/useAuth';

export default function TestAuthPage() {
  const { user, loading, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#181a1b] text-white p-8">
      <h1 className="text-3xl font-bold mb-8">🔧 Test d'Authentification</h1>
      
      <div className="space-y-4">
        <div className="bg-[#2c2c2c] p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">État de chargement :</h2>
          <p className="text-lg">{loading ? '⏳ Chargement...' : '✅ Chargé'}</p>
        </div>
        
        <div className="bg-[#2c2c2c] p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Utilisateur :</h2>
          {user ? (
            <div className="space-y-2">
              <p><strong>ID :</strong> {user.id}</p>
              <p><strong>Email :</strong> {user.email}</p>
              <p><strong>Nom :</strong> {user.display_name || 'Non défini'}</p>
              <p><strong>Créé le :</strong> {new Date(user.created_at).toLocaleString()}</p>
            </div>
          ) : (
            <p className="text-red-400">❌ Aucun utilisateur connecté</p>
          )}
        </div>
        
        <div className="space-x-4">
          <button 
            onClick={() => window.location.href = '/app'}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Aller vers /app
          </button>
          
          <button 
            onClick={() => window.location.href = '/auth'}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Aller vers /auth
          </button>
          
          <button 
            onClick={signOut}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
          >
            Se déconnecter
          </button>
        </div>
        
        <div className="mt-8 bg-[#2c2c2c] p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">💡 Instructions :</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Regardez la console pour les logs détaillés</li>
            <li>Vous devriez voir "Antoine Delebos" comme utilisateur</li>
            <li>Si ça ne marche pas, ouvrez F12 → Console</li>
          </ul>
        </div>
      </div>
    </div>
  );
}