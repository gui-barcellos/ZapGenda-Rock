import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCompanyData } from "@/hooks/useCompanyData";
import { useConnectedWhatsApp } from "@/hooks/useConnectedWhatsApp";
import { useAuth } from "@/hooks/useAuth";
import { Phone, MessageCircle, CreditCard, Instagram, Facebook, Music, Youtube, Linkedin, Globe, Mail } from "lucide-react";

interface BusinessHour {
  day: number;
  start: string;
  end: string;
  is_active: boolean;
}

interface SocialMedia {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  linkedin?: string;
  website?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

const INITIAL_BUSINESS_HOURS: BusinessHour[] = [
  { day: 1, start: "08:00", end: "18:00", is_active: true },
  { day: 2, start: "08:00", end: "18:00", is_active: true },
  { day: 3, start: "08:00", end: "18:00", is_active: true },
  { day: 4, start: "08:00", end: "18:00", is_active: true },
  { day: 5, start: "08:00", end: "18:00", is_active: true },
  { day: 6, start: "08:00", end: "13:00", is_active: false },
  { day: 0, start: "08:00", end: "13:00", is_active: false },
];

const BRAZIL_TIMEZONES = [
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "America/Sao_Paulo", label: "Brasília (UTC-3)" },
  { value: "America/Manaus", label: "Manaus (UTC-4)" },
  { value: "America/Rio_Branco", label: "Acre (UTC-5)" },
];

const LANGUAGES = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "es", label: "Espanhol" },
  { value: "en", label: "Inglês" },
];

export function CompanyInfoForm() {
  const { companyData, isLoading, updateCompanyData } = useCompanyData();
  const { companyId } = useAuth();
  const { data: whatsappData } = useConnectedWhatsApp(companyId);
  
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [hasPhysicalAddress, setHasPhysicalAddress] = useState(true);
  const [googleMapsLink, setGoogleMapsLink] = useState("");
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [language, setLanguage] = useState("pt-BR");
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(INITIAL_BUSINESS_HOURS);
  const [alternativePhone, setAlternativePhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethods, setPaymentMethods] = useState("");
  const [socialMedia, setSocialMedia] = useState<SocialMedia>({});

  const timezones = useMemo(() => {
    const supported = (Intl as any).supportedValuesOf?.("timeZone") as string[] | undefined;
    if (supported && supported.length > 0) {
      return supported
        .slice()
        .sort()
        .map((tz) => ({ value: tz, label: tz }));
    }
    return BRAZIL_TIMEZONES;
  }, []);

  useEffect(() => {
    if (companyData) {
      setName(companyData.name);
      setAddress(companyData.address || "");
      setHasPhysicalAddress(companyData.has_physical_address);
      setGoogleMapsLink(companyData.google_maps_link || "");
      setTimezone(companyData.timezone);
      setLanguage(companyData.language || "pt-BR");
      setBusinessHours(companyData.business_hours.length > 0 
        ? companyData.business_hours 
        : INITIAL_BUSINESS_HOURS);
      setAlternativePhone(companyData.alternative_phone || "");
      setEmail(companyData.email || "");
      setPaymentMethods(companyData.payment_methods || "");
      setSocialMedia(companyData.social_media || {});
    }
  }, [companyData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await updateCompanyData.mutateAsync({ 
      name, 
      address: hasPhysicalAddress ? address : null,
      has_physical_address: hasPhysicalAddress,
      google_maps_link: hasPhysicalAddress ? googleMapsLink : null,
      timezone,
      language,
      business_hours: businessHours,
      alternative_phone: alternativePhone.trim() || null,
      email: email.trim() || null,
      payment_methods: paymentMethods.trim() || null,
      social_media: socialMedia,
    });
  };

  const handleSocialMediaChange = (platform: keyof SocialMedia, value: string) => {
    setSocialMedia(prev => ({
      ...prev,
      [platform]: value.trim() || undefined,
    }));
  };

  if (isLoading) return <div>Carregando...</div>;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* INFORMAÇÕES BÁSICAS */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Informações Básicas</h2>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Empresa</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      {/* LOCALIZAÇÃO */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Localização</h2>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="address">Endereço Completo</Label>
              <div className="flex items-center gap-2">
                <Switch
                  checked={hasPhysicalAddress}
                  onCheckedChange={setHasPhysicalAddress}
                />
                <Label className="text-sm text-muted-foreground">
                  Tenho endereço físico
                </Label>
              </div>
            </div>
            
            {hasPhysicalAddress ? (
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Trabalho em domicílio / Sem endereço físico
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_maps">Link do Google Maps (Opcional)</Label>
            <Input
              id="google_maps"
              value={googleMapsLink}
              onChange={(e) => setGoogleMapsLink(e.target.value)}
              placeholder="https://maps.google.com/..."
              disabled={!hasPhysicalAddress}
            />
            <p className="text-xs text-muted-foreground">
              Facilita o envio de localização para clientes
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CONFIGURAÇÕES */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold">Configurações</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Idioma do Sistema</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um idioma" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O idioma define os textos do sistema e mensagens automáticas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Fuso Horário</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Importante para vendas internacionais e agendamentos
            </p>
          </div>

          <div className="space-y-2">
            <Label>Horário de Funcionamento Geral</Label>
            <div className="space-y-2">
              {businessHours.map((schedule, index) => (
                <div key={schedule.day} className="flex items-center gap-4 p-3 border rounded-lg">
                  <div className="flex items-center gap-2 w-40">
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={(checked) => {
                        const updated = [...businessHours];
                        updated[index].is_active = checked;
                        setBusinessHours(updated);
                      }}
                    />
                    <Label className="text-sm font-medium">
                      {DAYS_OF_WEEK.find(d => d.value === schedule.day)?.label}
                    </Label>
                  </div>

                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      type="time"
                      value={schedule.start}
                      onChange={(e) => {
                        const updated = [...businessHours];
                        updated[index].start = e.target.value;
                        setBusinessHours(updated);
                      }}
                      disabled={!schedule.is_active}
                      className="w-32"
                    />
                    <span className="text-muted-foreground">às</span>
                    <Input
                      type="time"
                      value={schedule.end}
                      onChange={(e) => {
                        const updated = [...businessHours];
                        updated[index].end = e.target.value;
                        setBusinessHours(updated);
                      }}
                      disabled={!schedule.is_active}
                      className="w-32"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Define os dias e horários gerais de funcionamento da empresa
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CONTATO */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Contato</h2>
          </div>

          <div className="space-y-2">
            <Label>WhatsApp Conectado</Label>
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/30">
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              {whatsappData?.isConnected ? (
                <>
                  <span className="font-medium">{whatsappData.formattedPhone}</span>
                  <Badge variant="outline" className="ml-auto bg-green-500/10 text-green-600 border-green-500/20">
                    Conectado
                  </Badge>
                </>
              ) : (
                <span className="text-muted-foreground">Nenhum WhatsApp conectado</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Este é o número usado pela IA para conversar com clientes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail para Contato
              </div>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@suaempresa.com.br"
            />
            <p className="text-xs text-muted-foreground">
              E-mail para clientes entrarem em contato (opcional)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="alternative_phone">Telefone Alternativo</Label>
            <Input
              id="alternative_phone"
              value={alternativePhone}
              onChange={(e) => setAlternativePhone(e.target.value)}
              placeholder="(XX) XXXXX-XXXX"
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              Telefone adicional para clientes entrarem em contato (opcional)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FORMAS DE PAGAMENTO */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Formas de Pagamento</h2>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_methods">Formas de Pagamento Aceitas</Label>
            <Textarea
              id="payment_methods"
              value={paymentMethods}
              onChange={(e) => setPaymentMethods(e.target.value)}
              placeholder="Ex: Pix, Cartão de Crédito/Débito, Dinheiro, Transferência Bancária..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Descreva todas as formas de pagamento aceitas. Deixe em branco se não quiser informar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* REDES SOCIAIS */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Redes Sociais</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagram">
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram
                </div>
              </Label>
              <Input
                id="instagram"
                value={socialMedia.instagram || ""}
                onChange={(e) => handleSocialMediaChange("instagram", e.target.value)}
                placeholder="@seuusuario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook">
                <div className="flex items-center gap-2">
                  <Facebook className="h-4 w-4" />
                  Facebook
                </div>
              </Label>
              <Input
                id="facebook"
                value={socialMedia.facebook || ""}
                onChange={(e) => handleSocialMediaChange("facebook", e.target.value)}
                placeholder="facebook.com/suapagina"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  TikTok
                </div>
              </Label>
              <Input
                id="tiktok"
                value={socialMedia.tiktok || ""}
                onChange={(e) => handleSocialMediaChange("tiktok", e.target.value)}
                placeholder="@seuusuario"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube">
                <div className="flex items-center gap-2">
                  <Youtube className="h-4 w-4" />
                  YouTube
                </div>
              </Label>
              <Input
                id="youtube"
                value={socialMedia.youtube || ""}
                onChange={(e) => handleSocialMediaChange("youtube", e.target.value)}
                placeholder="youtube.com/@seucanal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">
                <div className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  LinkedIn
                </div>
              </Label>
              <Input
                id="linkedin"
                value={socialMedia.linkedin || ""}
                onChange={(e) => handleSocialMediaChange("linkedin", e.target.value)}
                placeholder="linkedin.com/company/suaempresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Site
                </div>
              </Label>
              <Input
                id="website"
                value={socialMedia.website || ""}
                onChange={(e) => handleSocialMediaChange("website", e.target.value)}
                placeholder="www.seusite.com.br"
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Deixe em branco as redes sociais que não utilizar. A IA nunca mencionará redes não cadastradas.
          </p>
        </CardContent>
      </Card>

      <Button type="submit" disabled={updateCompanyData.isPending} className="w-full">
        {updateCompanyData.isPending ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </form>
  );
}

