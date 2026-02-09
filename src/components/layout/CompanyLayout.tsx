import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LogOut, User, ChevronDown, Calendar, MessageSquare, Users, BarChart3, Settings, Menu, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useThemeColor } from "@/hooks/useThemeColor";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppAlert } from "@/components/layout/WhatsAppAlert";
import { useBillingStatus } from "@/hooks/useBillingStatus";

interface CompanyLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { label: "Agenda", path: "/company/schedule", icon: Calendar },
  { label: "Chat ao Vivo", path: "/company/live-chat", icon: MessageSquare },
  {
    label: "Contatos",
    path: "/company/contacts",
    icon: Users,
    submenu: [
      { label: "Contatos WhatsApp", path: "/company/contacts/whatsapp" },
      { label: "Clientes", path: "/company/contacts/patients" },
    ],
  },
  { label: "CRM", path: "/company/crm", icon: TrendingUp },
  { label: "Relatórios", path: "/company/reports", icon: BarChart3 },
  {
    label: "Configurações",
    path: "/company/settings",
    icon: Settings,
    submenu: [
      { label: "Profissionais", path: "/company/settings/professionals" },
      { label: "Serviços", path: "/company/settings/services" },
      { label: "Disponibilidade", path: "/company/settings/availability" },
      { label: "Dados da Empresa", path: "/company/settings/company-data" },
      { label: "Mensagens Automáticas", path: "/company/settings/auto-messages" },
      { label: "Personalização Visual", path: "/company/settings/visual" },
      { label: "Regras de Agendamento", path: "/company/settings/scheduling-rules" },
      { label: "Usuários do Sistema", path: "/company/settings/users" },
      { label: "Tags de Contato", path: "/company/settings/tags" },
      { label: "FAQ", path: "/company/settings/faq" },
      { label: "Auditoria", path: "/company/settings/audit-logs" },
      { label: "Suporte Técnico", path: "/company/settings/support" },
      { label: "Configurar IA", path: "/company/ai-usage" },
      { label: "WhatsApp Conexão", path: "/company/settings/whatsapp" },
    ],
  },
];

const CompanyLayout = ({ children }: CompanyLayoutProps) => {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { companyData } = useCompanyData();
  const { data: billingInfo } = useBillingStatus();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userProfile, setUserProfile] = useState<{ full_name: string } | null>(null);
  
  // Apply theme color
  useThemeColor();

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Update document title dynamically
  useEffect(() => {
    if (companyData?.name) {
      document.title = `${companyData.name} - Gestão de Agenda`;
    } else {
      document.title = "Marca Pra Mim - Gestão de Agenda";
    }
  }, [companyData?.name]);

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        if (data) setUserProfile(data);
      }
    };
    fetchUserProfile();
  }, [user?.id]);

  const getFormattedDateTime = () => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayName = dayNames[currentTime.getDay()];
    
    const date = currentTime.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const time = currentTime.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return { dayName, date, time };
  };

  const { dayName, date, time } = getFormattedDateTime();

  return (
    <div
      className={cn(
        location.pathname === "/company/live-chat"
          ? "h-screen overflow-hidden flex flex-col bg-background"
          : "min-h-screen flex flex-col bg-background"
      )}
    >
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="flex h-16 items-center px-6 gap-4">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <Link to="/company/schedule" className="flex items-center">
              {companyData?.logo_url ? (
                <img 
                  src={companyData.logo_url} 
                  alt="Logo" 
                  className="h-10 w-auto max-w-[150px] object-contain"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-lg">
                  M
                </div>
              )}
            </Link>
          </div>

          {/* MENU MOBILE (<1024px) */}
          <div className="flex lg:hidden items-center justify-between flex-1">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mx-auto">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] bg-card">
                <div className="py-4 space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname.startsWith(item.path);
                    
                    if (item.submenu) {
                      return (
                        <div key={item.path} className="space-y-1">
                          <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
                            <Icon className="h-4 w-4 inline mr-2" />
                            {item.label}
                          </div>
                          <div className="ml-4 space-y-1">
                            {item.submenu.map((subItem) => (
                              <Link key={subItem.path} to={subItem.path}>
                                <Button
                                  variant="ghost"
                                  className={cn(
                                    "w-full justify-start text-sm",
                                    location.pathname === subItem.path && "bg-primary text-white"
                                  )}
                                >
                                  {subItem.label}
                                </Button>
                              </Link>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <Link key={item.path} to={item.path}>
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full justify-start",
                            isActive && "bg-primary text-white"
                          )}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* MENU ÍCONES APENAS (1024-1439px) */}
          <nav className="hidden lg:flex xl:hidden items-center justify-center gap-2 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              
              if (item.submenu) {
                return (
                  <DropdownMenu key={item.path}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "transition-smooth hover:bg-gray-100",
                          isActive && "bg-primary text-white hover:bg-primary/90"
                        )}
                        title={item.label}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card">
                      {item.submenu.map((subItem) => (
                        <DropdownMenuItem key={subItem.path} asChild>
                          <Link to={subItem.path} className="cursor-pointer">
                            {subItem.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "transition-smooth hover:bg-gray-100",
                      isActive && "bg-primary text-white hover:bg-primary/90"
                    )}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* MENU COMPLETO (≥1440px) */}
          <nav className="hidden xl:flex items-center justify-center gap-1 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              
              if (item.submenu) {
                return (
                  <DropdownMenu key={item.path}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "transition-smooth hover:bg-gray-100",
                          isActive && "bg-primary text-white hover:bg-primary/90"
                        )}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-card">
                      {item.submenu.map((subItem) => (
                        <DropdownMenuItem key={subItem.path} asChild>
                          <Link to={subItem.path} className="cursor-pointer">
                            {subItem.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "transition-smooth hover:bg-gray-100",
                      isActive && "bg-primary text-white hover:bg-primary/90"
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Data + Usuário + Logout (APENAS DESKTOP ≥1024px) */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="text-sm text-muted-foreground hidden xl:flex flex-col items-end leading-tight">
              <div>{dayName}, {date}</div>
              <div className="font-medium">{time}</div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden xl:inline">{userProfile?.full_name || "Usuário"}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card">
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      {/* Banner de alerta crítico WhatsApp */}
      <WhatsAppAlert />
      {billingInfo?.status === "grace" && (
        <div className="border-b bg-amber-50 text-amber-900">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-2 text-sm">
            <div>
              Pagamento vencido em {billingInfo.dueDate}. Você ainda tem {billingInfo.daysRemaining} dia(s) para regularizar antes do bloqueio.
            </div>
            <Link to="/company/setup/payment" className="underline">
              Regularizar pagamento
            </Link>
          </div>
        </div>
      )}
      
      <main className={cn(
        "flex-1",
        location.pathname === "/company/live-chat"
          ? "flex flex-col overflow-hidden"
          : "overflow-y-auto"
      )}>
        {children}
      </main>
      {location.pathname !== "/company/live-chat" && <Footer />}
    </div>
  );
};

export default CompanyLayout;

