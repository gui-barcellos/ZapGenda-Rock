import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Crown, Star, User, Clock } from "lucide-react";

interface UsersSummaryCardProps {
  users: Array<{ role: string; is_active?: boolean }>;
  pendingInvites: Array<any>;
  maxUsers: number;
}

export function UsersSummaryCard({ users, pendingInvites, maxUsers }: UsersSummaryCardProps) {
  const totalUsers = users.length;
  const admins = users.filter(u => u.role === 'admin').length;
  const attendants = users.filter(u => u.role === 'attendant').length;
  const pending = pendingInvites.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo</CardTitle>
        <CardDescription>
          Estatísticas de usuários da sua empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-2xl font-bold">{totalUsers}/{maxUsers}</span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          
          <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span className="text-2xl font-bold">1</span>
            <span className="text-xs text-muted-foreground">Proprietário</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
            <Star className="h-5 w-5 text-blue-500" />
            <span className="text-2xl font-bold">{Math.max(0, admins - 1)}</span>
            <span className="text-xs text-muted-foreground">Admin Extra</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
            <User className="h-5 w-5 text-gray-500" />
            <span className="text-2xl font-bold">{attendants}</span>
            <span className="text-xs text-muted-foreground">Atendentes</span>
          </div>

          <div className="flex flex-col items-center gap-2 p-4 bg-muted rounded-lg">
            <Clock className="h-5 w-5 text-orange-500" />
            <span className="text-2xl font-bold">{pending}</span>
            <span className="text-xs text-muted-foreground">Pendentes</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
