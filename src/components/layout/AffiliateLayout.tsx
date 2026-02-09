import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Building2, Wallet, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface AffiliateLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { label: "Dashboard", path: "/affiliate/dashboard", icon: LayoutDashboard },
  { label: "Empresas", path: "/affiliate/companies", icon: Building2 },
  { label: "Pagamentos", path: "/affiliate/payouts", icon: Wallet },
  { label: "Configuracoes", path: "/affiliate/settings", icon: Settings },
];

const AffiliateLayout = ({ children }: AffiliateLayoutProps) => {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card shadow-sm">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-6 flex-1">
            <Link to="/affiliate/dashboard" className="flex items-center">
              <h1 className="text-2xl font-bold">ZapGenda</h1>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        location.pathname === item.path &&
                          "bg-primary/10 text-primary hover:bg-primary/15"
                      )}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default AffiliateLayout;
