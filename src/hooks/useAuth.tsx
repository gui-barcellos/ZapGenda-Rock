import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isCompanyOwner: boolean;
  userRole: 'admin' | 'attendant' | 'superuser' | null;
  canManageUsers: boolean;
  companyId: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCompanyOwner, setIsCompanyOwner] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'attendant' | 'superuser' | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      setUser(null);
      setSession(null);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !user) {
      setIsCompanyOwner(false);
      setUserRole(null);
      setCompanyId(null);
      return;
    }

    const fetchUserData = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      setUserRole(roleData?.role || null);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, company_id')
        .eq('id', user.id)
        .single();

      if (profileData?.company_id) {
        setCompanyId(profileData.company_id);

        const { data: companyData } = await supabase
          .from('companies')
          .select('owner_email')
          .eq('id', profileData.company_id)
          .single();

        setIsCompanyOwner(companyData?.owner_email === profileData.email);
      } else {
        setCompanyId(null);
      }
    };

    fetchUserData();
  }, [user]);

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      navigate('/login');
      return;
    }

    await supabase.auth.signOut();
    navigate('/login');
  };

  const canManageUsers = isCompanyOwner;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signOut,
      isCompanyOwner,
      userRole,
      canManageUsers,
      companyId
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
