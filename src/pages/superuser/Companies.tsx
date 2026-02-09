import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SuperUserLayout from "@/components/layout/SuperUserLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { useCompanies, useCreateCompany, useUpdateCompany, useUpdateCompanyStatus, useDeleteCompany, useSendAdminPasswordReset, type CompanyFormData } from "@/hooks/useCompanies";
import { useAssignAffiliateCompany, useSuperuserAffiliates } from "@/hooks/useSuperuserAffiliates";
import { Building2, MoreVertical, Plus, Search, Users, Phone, Mail, Calendar, Eye, Edit, Ban, CheckCircle, XCircle, AlertCircle, Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAllCompaniesZAPIStatus } from "@/hooks/useSuperUserZAPI";

const companySchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  workspace_id: z.string().min(3, "Workspace ID obrigatório").regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
  owner_name: z.string().min(3, "Nome do dono obrigatório"),
  owner_email: z.string().email("Email inválido"),
  owner_whatsapp: z.string().min(10, "WhatsApp inválido"),
  owner_cpf: z.string().min(11, "CPF inválido"),
  status: z.enum(['trial', 'active', 'suspended', 'cancelled']),
  trial_start_date: z.string().optional(),
  trial_end_date: z.string().optional(),
  payment_due_day: z.coerce.number().min(1).max(31).optional(),
  free_days_granted: z.coerce.number().min(0).optional(),
});

const Companies = () => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [affiliateFilter, setAffiliateFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState("none");
  const [statusChangeDialog, setStatusChangeDialog] = useState<{ open: boolean; companyId: string; newStatus: string; companyName: string }>({ open: false, companyId: "", newStatus: "", companyName: "" });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; companyId: string; companyName: string }>({ open: false, companyId: "", companyName: "" });
  const [deletePassword, setDeletePassword] = useState("");
  const [calculatedDays, setCalculatedDays] = useState(0);

  const navigate = useNavigate();
  const { data: companies, isLoading } = useCompanies({
    status: statusFilter,
    search: searchTerm,
    affiliateId: affiliateFilter,
  });
  const { data: affiliates } = useSuperuserAffiliates();
  const { data: zapiStatusMap } = useAllCompaniesZAPIStatus();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const assignAffiliateCompany = useAssignAffiliateCompany();
  const updateStatus = useUpdateCompanyStatus();
  const deleteCompany = useDeleteCompany();
  const sendAdminPasswordReset = useSendAdminPasswordReset();
  const { toast } = useToast();

  const createForm = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      status: 'trial',
      free_days_granted: 0,
    },
  });

  const editForm = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  });

  // Auto-gerar workspace_id baseado no nome da empresa
  const generateWorkspaceId = (companyName: string): string => {
    const slug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]+/g, '-') // Substitui espaços/caracteres especiais por hífen
      .replace(/^-+|-+$/g, ''); // Remove hífens do início/fim
    
    const random = Math.floor(1000 + Math.random() * 9000); // 4 dígitos
    return `${slug}-${random}`;
  };

  // Watcher para auto-gerar workspace_id
  const nameValue = createForm.watch("name");
  useEffect(() => {
    if (nameValue && nameValue.length >= 3) {
      const workspaceId = generateWorkspaceId(nameValue);
      createForm.setValue("workspace_id", workspaceId);
    }
  }, [nameValue]);

  // Watcher para calcular dias grátis
  const trialStartDate = createForm.watch("trial_start_date");
  const trialEndDate = createForm.watch("trial_end_date");
  useEffect(() => {
    if (trialStartDate && trialEndDate) {
      const start = new Date(trialStartDate);
      const end = new Date(trialEndDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setCalculatedDays(diffDays);
      createForm.setValue("free_days_granted", diffDays);
    } else {
      setCalculatedDays(0);
      createForm.setValue("free_days_granted", 0);
    }
  }, [trialStartDate, trialEndDate]);

  const handleCreateSubmit = async (data: CompanyFormData) => {
    const cleanedData = {
      ...data,
      owner_whatsapp: data.owner_whatsapp.replace(/\D/g, ''),
      owner_cpf: data.owner_cpf.replace(/\D/g, ''),
    };
    
    const result = await createCompany.mutateAsync(cleanedData);
    
    setCreateDialogOpen(false);
    createForm.reset();
  };

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const handleEditSubmit = async (data: CompanyFormData) => {
    if (!selectedCompany) return;
    await updateCompany.mutateAsync({ id: selectedCompany.id, data });
    await assignAffiliateCompany.mutateAsync({
      companyId: selectedCompany.id,
      affiliateId: selectedAffiliateId === "none" ? null : selectedAffiliateId,
    });
    setEditDialogOpen(false);
    setSelectedCompany(null);
  };

  const handleStatusChange = async () => {
    await updateStatus.mutateAsync({ 
      id: statusChangeDialog.companyId, 
      status: statusChangeDialog.newStatus 
    });
    setStatusChangeDialog({ open: false, companyId: "", newStatus: "", companyName: "" });
  };

  const handleDeleteCompany = async () => {
    if (!deletePassword.trim()) {
      toast({
        title: "Senha obrigatória",
        description: "Digite sua senha para confirmar a exclusão.",
        variant: "destructive",
      });
      return;
    }

    await deleteCompany.mutateAsync({
      id: deleteDialog.companyId,
      password: deletePassword,
    });
    
    setDeleteDialog({ open: false, companyId: "", companyName: "" });
    setDeletePassword("");
  };

  const openEditDialog = (company: any) => {
    setSelectedCompany(company);
    setSelectedAffiliateId(company.affiliate_companies?.[0]?.affiliate_id || "none");
    editForm.reset({
      name: company.name,
      workspace_id: company.workspace_id,
      owner_name: company.owner_name,
      owner_email: company.owner_email,
      owner_whatsapp: company.owner_whatsapp,
      owner_cpf: company.owner_cpf || "",
      status: company.status,
      trial_start_date: company.trial_start_date || undefined,
      trial_end_date: company.trial_end_date || undefined,
      payment_due_day: company.payment_due_day || undefined,
      free_days_granted: company.free_days_granted || 0,
    });
    setEditDialogOpen(true);
  };

  const openDetailsDialog = (company: any) => {
    setSelectedCompany(company);
    setDetailsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      trial: { variant: "secondary", label: "Trial" },
      active: { variant: "default", label: "Ativa" },
      suspended: { variant: "outline", label: "Suspensa" },
      cancelled: { variant: "destructive", label: "Cancelada" },
    };
    const config = variants[status] || variants.active;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const stats = companies ? {
    total: companies.length,
    active: companies.filter(c => c.status === 'active').length,
    trial: companies.filter(c => c.status === 'trial').length,
    suspended: companies.filter(c => c.status === 'suspended').length,
  } : { total: 0, active: 0, trial: 0, suspended: 0 };

  return (
    <SuperUserLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Empresas</h1>
            <p className="text-muted-foreground mt-2">
              Gerencie as empresas cadastradas no sistema
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Empresa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Empresa</DialogTitle>
                <DialogDescription>
                  Preencha os dados para cadastrar uma nova empresa no sistema
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Dados da Empresa</h3>
                    <FormField
                      control={createForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Empresa</FormLabel>
                          <FormControl>
                            <Input placeholder="Empresa ABC" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="workspace_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Workspace ID</FormLabel>
                          <FormControl>
                            <Input placeholder="clinica-abc" disabled {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Responsável</h3>
                    <FormField
                      control={createForm.control}
                      name="owner_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input placeholder="João Silva" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="owner_cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="000.000.000-00"
                              {...field}
                              onChange={(e) => {
                                const formatted = formatCpf(e.target.value);
                                field.onChange(formatted);
                              }}
                              maxLength={14}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="owner_email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="joao@clinica.com" {...field} />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">
                            Enviaremos um email para o administrador definir a senha de acesso.
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="owner_whatsapp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="(11) 99876-5432" 
                              {...field}
                              onChange={(e) => {
                                const formatted = formatWhatsApp(e.target.value);
                                field.onChange(formatted);
                              }}
                              maxLength={15}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold">Configurações</h3>
                    <FormField
                      control={createForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status Inicial</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="trial">Trial</SelectItem>
                              <SelectItem value="active">Ativa</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="trial_start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Início do Trial</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="trial_end_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fim do Trial</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="payment_due_day"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Melhor dia para faturamento</FormLabel>
                            <Select 
                              onValueChange={(value) => field.onChange(parseInt(value))} 
                              value={field.value?.toString()}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o dia" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="5">Dia 5</SelectItem>
                                <SelectItem value="10">Dia 10</SelectItem>
                                <SelectItem value="15">Dia 15</SelectItem>
                                <SelectItem value="20">Dia 20</SelectItem>
                                <SelectItem value="25">Dia 25</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="space-y-2">
                        <Label>Dias Grátis</Label>
                        <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center">
                          <span className="text-lg font-semibold">{calculatedDays}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Calculado automaticamente baseado nas datas do trial
                        </p>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={createCompany.isPending}>
                      {createCompany.isPending ? "Criando..." : "Criar Empresa"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trial</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.trial}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suspensas</CardTitle>
              <Ban className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.suspended}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, workspace ou dono..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="suspended">Suspensas</SelectItem>
                  <SelectItem value="cancelled">Canceladas</SelectItem>
                </SelectContent>
              </Select>
              <Select value={affiliateFilter} onValueChange={setAffiliateFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Filtrar por afiliado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os afiliados</SelectItem>
                  <SelectItem value="none">Sem afiliado</SelectItem>
                  {(affiliates || []).map((affiliate) => (
                    <SelectItem key={affiliate.id} value={affiliate.id}>
                      {affiliate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Afiliado</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : companies?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      Nenhuma empresa encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  companies?.map((company) => {
                    const zapiStatus = zapiStatusMap?.[company.id];
                    const affiliateName = company.affiliate_companies?.[0]?.affiliates?.name;
                    
                    return (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{company.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {company.workspace_id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(company.status)}</TableCell>
                      <TableCell>
                        {zapiStatus ? (
                          <div className="flex items-center gap-2">
                            {zapiStatus.isConnected ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle className="h-3 w-3" />
                                Conectado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Desconectado
                              </Badge>
                            )}
                            {zapiStatus.phone && (
                              <span className="text-xs text-muted-foreground">
                                {zapiStatus.phone}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Não configurado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{company.owner_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {company.owner_email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {affiliateName ? (
                          <Badge variant="secondary">{affiliateName}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sem afiliado</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(new Date(company.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openDetailsDialog(company)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(company)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => navigate(`/superuser/companies/${company.id}/zapi`)}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Gerenciar Z-API
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => sendAdminPasswordReset.mutate(company.id)}
                            >
                              <Mail className="mr-2 h-4 w-4" />
                              Enviar link de senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {company.status !== 'active' && company.status !== 'cancelled' && (
                              <DropdownMenuItem
                                onClick={() => setStatusChangeDialog({ 
                                  open: true, 
                                  companyId: company.id, 
                                  newStatus: 'active',
                                  companyName: company.name 
                                })}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Ativar
                              </DropdownMenuItem>
                            )}
                            {company.status === 'active' && (
                              <DropdownMenuItem
                                onClick={() => setStatusChangeDialog({ 
                                  open: true, 
                                  companyId: company.id, 
                                  newStatus: 'suspended',
                                  companyName: company.name 
                                })}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Suspender
                              </DropdownMenuItem>
                            )}
                            {company.status !== 'cancelled' && (
                              <DropdownMenuItem
                                onClick={() => setStatusChangeDialog({ 
                                  open: true, 
                                  companyId: company.id, 
                                  newStatus: 'cancelled',
                                  companyName: company.name 
                                })}
                                className="text-destructive"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                            {company.status === 'cancelled' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteDialog({ 
                                    open: true, 
                                    companyId: company.id, 
                                    companyName: company.name 
                                  })}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </DropdownMenuItem>
                              </>
                            )}
                           </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Empresa</DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Informações Básicas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{selectedCompany.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Workspace ID</Label>
                    <p className="font-medium">{selectedCompany.workspace_id}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedCompany.status)}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Criação</Label>
                    <p className="font-medium">
                      {format(new Date(selectedCompany.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Responsável</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nome</Label>
                    <p className="font-medium">{selectedCompany.owner_name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{selectedCompany.owner_email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">WhatsApp</Label>
                    <p className="font-medium">{selectedCompany.owner_whatsapp}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CPF</Label>
                    <p className="font-medium">{selectedCompany.owner_cpf || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Afiliado</Label>
                    <p className="font-medium">
                      {selectedCompany.affiliate_companies?.[0]?.affiliates?.name || "Sem afiliado"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedCompany.company_subscriptions?.[0] && (
                <div>
                  <h3 className="font-semibold mb-3">Limites de Recursos</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Usuários</Label>
                      <p className="font-medium">
                        {selectedCompany.company_subscriptions[0].current_users} / {selectedCompany.company_subscriptions[0].max_users}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Profissionais</Label>
                      <p className="font-medium">
                        {selectedCompany.company_subscriptions[0].current_professionals} / {selectedCompany.company_subscriptions[0].max_professionals}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Contatos</Label>
                      <p className="font-medium">
                        {selectedCompany.company_subscriptions[0].current_contacts} / {selectedCompany.company_subscriptions[0].max_contacts}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">WhatsApp</Label>
                      <p className="font-medium">
                        {selectedCompany.company_subscriptions[0].current_whatsapp_numbers} / {selectedCompany.company_subscriptions[0].max_whatsapp_numbers}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedCompany.status === 'trial' && (
                <div>
                  <h3 className="font-semibold mb-3">Período de Trial</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCompany.trial_start_date && (
                      <div>
                        <Label className="text-muted-foreground">Início</Label>
                        <p className="font-medium">
                          {format(new Date(selectedCompany.trial_start_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                    {selectedCompany.trial_end_date && (
                      <div>
                        <Label className="text-muted-foreground">Fim</Label>
                        <p className="font-medium">
                          {format(new Date(selectedCompany.trial_end_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
            <DialogDescription>
              Atualize as informações da empresa
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <div className="space-y-4">
                <h3 className="font-semibold">Dados da Empresa</h3>
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Empresa</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="workspace_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Workspace ID</FormLabel>
                      <FormControl>
                        <Input {...field} disabled />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Responsável</h3>
                <FormField
                  control={editForm.control}
                  name="owner_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="owner_cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="000.000.000-00"
                          onChange={(e) => field.onChange(formatCpf(e.target.value))}
                          maxLength={14}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="owner_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="owner_whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold">Configurações</h3>
                <FormField
                  control={editForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="active">Ativa</SelectItem>
                          <SelectItem value="suspended">Suspensa</SelectItem>
                          <SelectItem value="cancelled">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Afiliado</Label>
                    <Select value={selectedAffiliateId} onValueChange={setSelectedAffiliateId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem afiliado</SelectItem>
                        {(affiliates || []).map((affiliate) => (
                          <SelectItem key={affiliate.id} value={affiliate.id}>
                            {affiliate.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="trial_start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início do Trial</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="trial_end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim do Trial</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="payment_due_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dia de Vencimento</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" max="31" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="free_days_granted"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dias Grátis</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateCompany.isPending || assignAffiliateCompany.isPending}>
                  {updateCompany.isPending || assignAffiliateCompany.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Status Change Confirmation */}
      <AlertDialog open={statusChangeDialog.open} onOpenChange={(open) => !open && setStatusChangeDialog({ open: false, companyId: "", newStatus: "", companyName: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Mudança de Status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja alterar o status da empresa <strong>{statusChangeDialog.companyName}</strong> para{" "}
              <strong>
                {statusChangeDialog.newStatus === 'active' && 'Ativa'}
                {statusChangeDialog.newStatus === 'suspended' && 'Suspensa'}
                {statusChangeDialog.newStatus === 'cancelled' && 'Cancelada'}
              </strong>?
              {statusChangeDialog.newStatus === 'cancelled' && (
                <span className="block mt-2 text-destructive">
                  Esta ação é irreversível!
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Company Confirmation */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDeleteDialog({ open: false, companyId: "", companyName: "" });
          setDeletePassword("");
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Empresa
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Você está prestes a <strong className="text-destructive">excluir permanentemente</strong> a empresa{" "}
                  <strong>{deleteDialog.companyName}</strong>.
                </p>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive font-semibold">
                    ⚠️ ATENÇÃO: Esta ação não pode ser desfeita!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Todos os dados da empresa, incluindo usuários, contatos, agendamentos e configurações serão removidos permanentemente.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delete-password">Confirme sua senha para continuar:</Label>
                  <Input
                    id="delete-password"
                    type="password"
                    placeholder="Digite sua senha"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleDeleteCompany();
                      }
                    }}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePassword("")}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCompany}
              disabled={deleteCompany.isPending || !deletePassword.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteCompany.isPending ? "Excluindo..." : "Excluir Permanentemente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </SuperUserLayout>
  );
};

export default Companies;
