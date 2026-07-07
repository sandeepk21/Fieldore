import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { MySubscription, getMySubscriptionApi } from '@/src/services/subscriptionService';

type SubscriptionContextType = {
  subscription: MySubscription | null;
  loading: boolean;
  error: string | null;
  /** Re-fetch /api/subscription/me (e.g. after returning from web checkout). */
  refresh: () => Promise<void>;
  /** Is the subscription in an access-granting state? */
  isActive: boolean;
  /** Is a boolean feature available on the current plan? */
  can: (featureKey: string) => boolean;
  /** Numeric limit for a feature (null = unlimited / unknown). */
  limitFor: (featureKey: string) => number | null;
};

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export const useSubscription = () => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used inside SubscriptionProvider');
  return ctx;
};

export const SubscriptionProvider = ({ children }: { children: React.ReactNode }) => {
  const [subscription, setSubscription] = useState<MySubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSubscription(await getMySubscriptionApi());
    } catch (e: any) {
      // 401 before login / business not set up yet — keep silent, just no subscription.
      setSubscription(null);
      setError(e?.message ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const can = useCallback(
    (featureKey: string) => {
      if (!subscription?.isActive) return false;
      const f = subscription.features.find((x) => x.featureKey === featureKey);
      return !!f?.enabled;
    },
    [subscription],
  );

  const limitFor = useCallback(
    (featureKey: string) => subscription?.features.find((x) => x.featureKey === featureKey)?.limit ?? null,
    [subscription],
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        error,
        refresh,
        isActive: subscription?.isActive ?? false,
        can,
        limitFor,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};
