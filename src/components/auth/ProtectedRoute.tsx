import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'superuser' | 'admin' | 'attendant' | 'affiliate';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [companyStatus, setCompanyStatus] = useState<string | null>(null);
  const [hasPaymentMethod, setHasPaymentMethod] = useState<boolean>(false);
  const [billingBlocked, setBillingBlocked] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleData) {
          setUserRole(roleData.role);

          // If not superuser/affiliate, check company status
          if (roleData.role !== 'superuser' && roleData.role !== 'affiliate') {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('company_id')
              .eq('id', user.id)
              .single();

            if (profileData?.company_id) {
              const { data: companyData } = await supabase
                .from('companies')
                .select('status')
                .eq('id', profileData.company_id)
                .single();

              const { data: paymentData } = await supabase
                .from('payment_methods')
                .select('id')
                .eq('company_id', profileData.company_id)
                .maybeSingle();

              setCompanyStatus(companyData?.status || null);
              setHasPaymentMethod(!!paymentData);

              const { data: invoice } = await supabase
                .from('invoices')
                .select('due_date, status')
                .eq('company_id', profileData.company_id)
                .in('status', ['open', 'overdue'])
                .order('due_date', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (invoice?.due_date) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const due = new Date(`${invoice.due_date}T00:00:00`);
                const daysPastDue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                setBillingBlocked(daysPastDue > 7);
              } else {
                setBillingBlocked(false);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking access:', error);
      } finally {
        setLoading(false);
      }
    }

    checkAccess();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role requirement
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  // If company user, check status and payment
  if (userRole !== 'superuser' && userRole !== 'affiliate') {
    const isPaymentRoute = location.pathname === "/company/setup/payment";
    if ((companyStatus === 'suspended' || billingBlocked) && !isPaymentRoute) {
      return <Navigate to="/company/setup/payment" replace />;
    }
  }

  return <>{children}</>;
}
