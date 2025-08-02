import { useState, useEffect } from 'react';

interface SubscriptionData {
  plan: 'free' | 'pro';
  bookmarkLimit: number; // -1 = illimité
  customerId: string | null;
  subscriptionId?: string;
  subscriptionStatus?: string;
}

export const useSubscription = (userEmail: string | null) => {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userEmail) {
      // Si pas d'email, considérer comme plan gratuit
      setSubscription({
        plan: 'free',
        bookmarkLimit: 20,
        customerId: null,
      });
      setLoading(false);
      return;
    }

    const fetchSubscription = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/user/subscription?email=${encodeURIComponent(userEmail)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch subscription');
        }

        const data = await response.json();
        setSubscription(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        // En cas d'erreur, considérer comme plan gratuit par défaut
        setSubscription({
          plan: 'free',
          bookmarkLimit: 20,
          customerId: null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [userEmail]);

  const canAddBookmark = (currentBookmarkCount: number): boolean => {
    console.log('🔍 useSubscription: canAddBookmark appelé');
    console.log('🔍 useSubscription: subscription:', subscription);
    console.log('🔍 useSubscription: currentBookmarkCount:', currentBookmarkCount);
    
    if (!subscription) {
      console.log('❌ useSubscription: Pas de subscription, retour false');
      return false;
    }
    
    if (subscription.bookmarkLimit === -1) {
      console.log('✅ useSubscription: Plan pro illimité, retour true');
      return true; // Plan pro = illimité
    }
    
    const canAdd = currentBookmarkCount < subscription.bookmarkLimit;
    console.log(`🔍 useSubscription: ${currentBookmarkCount} < ${subscription.bookmarkLimit} = ${canAdd}`);
    return canAdd;
  };

  const getRemainingBookmarks = (currentBookmarkCount: number): number => {
    if (!subscription) return 0;
    if (subscription.bookmarkLimit === -1) return Infinity;
    return Math.max(0, subscription.bookmarkLimit - currentBookmarkCount);
  };

  return {
    subscription,
    loading,
    error,
    canAddBookmark,
    getRemainingBookmarks,
    refetch: () => {
      if (userEmail) {
        const fetchSubscription = async () => {
          try {
            setLoading(true);
            const response = await fetch(`/api/user/subscription?email=${encodeURIComponent(userEmail)}`);
            const data = await response.json();
            setSubscription(data);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
          } finally {
            setLoading(false);
          }
        };
        fetchSubscription();
      }
    },
  };
};