import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  LogOut, 
  User, 
  LayoutDashboard, 
  Building2, 
  CreditCard, 
  Receipt, 
  Cpu, 
  Bot, 
  Settings, 
  Headphones,
  Users,
  ClipboardList
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/layout/Footer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SuperUserLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { label: "Dashboard", path: "/superuser/dashboard", icon: LayoutDashboard },
  { label: "Afiliados", path: "/superuser/affiliates", icon: Users },
  { label: "Empresas", path: "/superuser/companies", icon: Building2 },
  { label: "Assinaturas", path: "/superuser/subscriptions", icon: CreditCard },
  { label: "Faturamento", path: "/superuser/billing", icon: Receipt },
  { label: "Uso de Tokens", path: "/superuser/tokens", icon: Cpu },
  { label: "Auditoria", path: "/superuser/audit-logs", icon: ClipboardList },
  { label: "Cerebro da IA", path: "/superuser/ai-settings", icon: Bot },
  { label: "Configuracoes", path: "/superuser/settings", icon: Settings },
  { label: "Suporte Tecnico", path: "/superuser/support", icon: Headphones },
];

const SuperUserLayout = ({ children }: SuperUserLayoutProps) => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-8 flex-1">
            <Link to="/superuser/dashboard" className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Marca Pra Mim
              </h1>
            </Link>
            <TooltipProvider>
              <nav className="hidden md:flex items-center gap-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.path}>
                      <TooltipTrigger asChild>
                        <Link to={item.path}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "transition-smooth",
                              location.pathname === item.path &&
                                "bg-primary/10 text-primary hover:bg-primary/15"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>
            </TooltipProvider>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">SuperUser</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 p-6">{children}</main>
      <Footer />
    </div>
  );
};

export default SuperUserLayout;
