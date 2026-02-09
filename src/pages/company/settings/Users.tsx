import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import CompanyLayout from "@/components/layout/CompanyLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "@/components/company/UsersTable";
import { PendingInvitesTable } from "@/components/company/PendingInvitesTable";
import { InviteUserDialog } from "@/components/company/InviteUserDialog";
import { PermissionsAccordion } from "@/components/company/PermissionsAccordion";
import { UsersSummaryCard } from "@/components/company/UsersSummaryCard";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { useCompanySubscription } from "@/hooks/useCompanySubscription";
import { UserPlus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const Users = () => {
  const { canManageUsers } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { 
    users, 
    pendingInvites, 
    deleteUser, 
    toggleUserStatus, 
    updateUserData,
    cancelInvite, 
    resendInvite, 
    refetch 
  } = useCompanyUsers();
  
  const { subscription } = useCompanySubscription();

  const handleInvite = () => {
    // Validar limite antes de abrir dialog
    const totalUsers = (users?.length || 0) + (pendingInvites?.length || 0);
    const maxUsers = subscription?.max_users || 2;
    
    if (totalUsers >= maxUsers) {
      toast.error("Limite de usuários atingido. Exclua usuários ou faça upgrade do plano.");
      return;
    }
    
    setInviteDialogOpen(true);
  };

  return (
    <CompanyLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuários do Sistema</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie os usuários que acessam o sistema
            </p>
          </div>
          {canManageUsers && (
            <Button onClick={handleInvite}>
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Usuário
            </Button>
          )}
        </div>

        {/* Alert para Admin Extra */}
        {!canManageUsers && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Apenas o Administrador Original pode gerenciar usuários.
            </AlertDescription>
          </Alert>
        )}

        {/* Card 1: Usuários Ativos */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários Ativos</CardTitle>
            <CardDescription>
              Usuários com acesso ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {users ? (
              <UsersTable
                users={users}
                onDelete={deleteUser.mutate}
                onToggleStatus={toggleUserStatus.mutate}
                onRoleUpdated={refetch}
                onUpdateData={(userId, data) => updateUserData.mutate({ userId, ...data })}
                canManage={canManageUsers}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Convites Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle>
              Convites Pendentes
              {pendingInvites && pendingInvites.length > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({pendingInvites.length})
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Convites enviados aguardando aceitação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInvites ? (
              <PendingInvitesTable
                invites={pendingInvites}
                onResend={(email, role) => resendInvite.mutate({ email, role })}
                onCancel={cancelInvite.mutate}
                canManage={canManageUsers}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            )}
          </CardContent>
        </Card>

        {/* Card 3: Entenda as Permissões */}
        <PermissionsAccordion />

        {/* Card 4: Resumo (no final) */}
        <UsersSummaryCard 
          users={users || []}
          pendingInvites={pendingInvites || []}
          maxUsers={subscription?.max_users || 2}
        />

        <InviteUserDialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen} />
      </div>
    </CompanyLayout>
  );
};

export default Users;
