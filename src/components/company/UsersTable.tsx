import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MoreHorizontal, UserCog, UserX, UserCheck, Trash2, Crown, Star, User, Edit } from "lucide-react";
import { useState, useEffect } from "react";
import { EditUserRoleDialog } from "./EditUserRoleDialog";
import { EditUserDataDialog } from "./EditUserDataDialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { supabase } from "@/integrations/supabase/client";

interface UserData {
  id: string;
  full_name: string;
  email: string;
  whatsapp?: string;
  role: string;
  is_active: boolean;
}

interface UsersTableProps {
  users: UserData[];
  onDelete: (userId: string) => void;
  onToggleStatus: (userId: string) => void;
  onRoleUpdated: () => void;
  onUpdateData: (userId: string, data: { full_name: string; email: string; whatsapp?: string }) => void;
  canManage: boolean;
}

export function UsersTable({ users, onDelete, onToggleStatus, onRoleUpdated, onUpdateData, canManage }: UsersTableProps) {
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [editDataDialogOpen, setEditDataDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string>("");

  useEffect(() => {
    const fetchOwnerEmail = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profile?.company_id) {
        const { data: company } = await supabase
          .from("companies")
          .select("owner_email")
          .eq("id", profile.company_id)
          .single();

        if (company) setOwnerEmail(company.owner_email);
      }
    };
    fetchOwnerEmail();
  }, []);

  const handleEditRole = (user: UserData) => {
    setSelectedUser(user);
    setEditRoleDialogOpen(true);
  };

  const handleEditData = (user: UserData) => {
    setSelectedUser(user);
    setEditDataDialogOpen(true);
  };

  const handleDeleteClick = (user: UserData) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedUser) {
      onDelete(selectedUser.id);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const getRoleBadge = (user: UserData) => {
    const isOwner = user.email === ownerEmail;
    
    if (isOwner) {
      return (
        <Badge variant="default" className="gap-1 bg-yellow-500 hover:bg-yellow-600">
          <Crown className="h-3 w-3" />
          Proprietário
        </Badge>
      );
    }
    
    if (user.role === "admin") {
      return (
        <Badge variant="default" className="gap-1 bg-blue-500 hover:bg-blue-600">
          <Star className="h-3 w-3" />
          Administrador
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary" className="gap-1">
        <User className="h-3 w-3" />
        Atendente
      </Badge>
    );
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Permissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isOwner = user.email === ownerEmail;
                const canEdit = canManage && !isOwner;
                const canDelete = canManage && !isOwner;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {user.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.whatsapp || "-"}</TableCell>
                    <TableCell>{getRoleBadge(user)}</TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? "🟢 Ativo" : "🔴 Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditData(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar Dados
                            </DropdownMenuItem>
                            {!isOwner && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleEditRole(user)}>
                                  <UserCog className="h-4 w-4 mr-2" />
                                  Alterar Permissão
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onToggleStatus(user.id)}>
                                  {user.is_active ? (
                                    <>
                                      <UserX className="h-4 w-4 mr-2" />
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="h-4 w-4 mr-2" />
                                      Reativar
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(user)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <>
          <EditUserRoleDialog
            open={editRoleDialogOpen}
            onOpenChange={setEditRoleDialogOpen}
            user={selectedUser}
            onSuccess={onRoleUpdated}
          />
          <EditUserDataDialog
            open={editDataDialogOpen}
            onOpenChange={setEditDataDialogOpen}
            user={selectedUser}
            onSuccess={onRoleUpdated}
          />
          <DeleteConfirmDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onConfirm={handleDeleteConfirm}
            title="Excluir Usuário"
            description={`Tem certeza que deseja excluir ${selectedUser.full_name}? Esta ação não pode ser desfeita.`}
          />
        </>
      )}
    </>
  );
}
