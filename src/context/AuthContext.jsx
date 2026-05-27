import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch role — with 2s timeout, falls back to 'owner'
  const fetchRole = async (authUser) => {
    if (!authUser) {
      setRole(null);
      return;
    }
    try {
      const result = await Promise.race([
        // Wrap in new Promise so Promise.race works reliably
        new Promise((resolve) => {
          supabase
            .from('profiles')
            .select('role')
            .eq('id', authUser.id)
            .single()
            .then(resolve)
            .catch(() => resolve({ data: null }));
        }),
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: null }), 2000)
        ),
      ]);
      // Use profile role → user_metadata role → default 'owner'
      const metaRole = authUser.user_metadata?.role;
      setRole(result?.data?.role || metaRole || 'owner');
    } catch {
      setRole('owner');
    }
  };

  useEffect(() => {
    let didFinish = false;

    // Hard safety net: never hang forever
    const safetyTimer = setTimeout(() => {
      if (!didFinish) {
        didFinish = true;
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    }, 8000);

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const currentUser = data?.session?.user ?? null;
        setUser(currentUser);
        await fetchRole(currentUser);
      } catch {
        setUser(null);
        setRole(null);
      } finally {
        if (!didFinish) {
          didFinish = true;
          clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          const currentUser = session?.user ?? null;
          setUser(currentUser);
          await fetchRole(currentUser);
        } catch {
          // keep existing state
        } finally {
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  const hasAccess = (requiredRoles) => {
    if (!role) return false;
    return requiredRoles.includes(role);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, login, logout, hasAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export default AuthContext;
