import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CompanySettings {
  primaryColor: string;
  logoUrl: string | null;
  companyName: string;
  companyId: string;
  loading: boolean;
}

const CompanySettingsContext = createContext<CompanySettings | undefined>(undefined);

export function CompanySettingsProvider({ children }: { children: ReactNode }) {
  const { user, companyId } = useAuth();
  const [settings, setSettings] = useState<CompanySettings>({
    primaryColor: '#8B5CF6',
    logoUrl: null,
    companyName: '',
    companyId: '',
    loading: true,
  });

  useEffect(() => {
    if (!user || !companyId) {
      setSettings(prev => ({ ...prev, loading: false }));
      return;
    }

    const fetchSettings = async () => {
      try {
        // Buscar company_settings
        const { data: settingsData } = await supabase
          .from('company_settings')
          .select('primary_color, logo_url')
          .eq('company_id', companyId)
          .single();

        // Buscar company name
        const { data: companyData } = await supabase
          .from('companies')
          .select('name')
          .eq('id', companyId)
          .single();

        setSettings({
          primaryColor: settingsData?.primary_color || '#8B5CF6',
          logoUrl: settingsData?.logo_url || null,
          companyName: companyData?.name || '',
          companyId,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching company settings:', error);
        setSettings(prev => ({ ...prev, loading: false }));
      }
    };

    fetchSettings();
  }, [user, companyId]);

  return (
    <CompanySettingsContext.Provider value={settings}>
      {children}
    </CompanySettingsContext.Provider>
  );
}

export function useCompanySettings() {
  const context = useContext(CompanySettingsContext);
  if (context === undefined) {
    throw new Error('useCompanySettings must be used within a CompanySettingsProvider');
  }
  return context;
}
