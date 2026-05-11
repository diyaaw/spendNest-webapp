'use client';

/**
 * ClientOnly: renders children only after the component is mounted on the client.
 * Prevents hydration mismatches for components that read from localStorage-backed
 * Zustand stores (e.g. auth token, dashboard data) which are unavailable during SSR.
 */
import { useEffect, useState } from 'react';

export default function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
