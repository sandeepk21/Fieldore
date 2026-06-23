import { getToken } from '@/src/utils/storage';
import { initCurrencyFromStorage } from '@/src/utils/currency';
import { useEffect, useState } from 'react';

export const useAuth = () => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Restore the last-known business currency for app-wide formatting.
        await initCurrencyFromStorage();

        const token = await getToken();

        if (token) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return { loading, isAuthenticated };
};