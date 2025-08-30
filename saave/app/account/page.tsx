"use client";

import { useAuth } from "../../src/hooks/useAuth";

export default function AccountPage() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6">Loading...</div>;
  if (!user) return <div className="p-6">Please sign in.</div>;
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Account</h1>
      <p className="text-sm text-muted-foreground">{user.email}</p>
    </div>
  );
}


