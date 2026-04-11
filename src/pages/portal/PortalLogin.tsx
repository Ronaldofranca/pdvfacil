import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Zap, UserCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortalAuth } from "@/hooks/usePortalAuth";
import { useToast } from "@/hooks/use-toast";
import { isValidCPF, formatCPF, normalizeCPF } from "@/lib/cpfUtils";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithCPF, signOut, session, isCliente } = usePortalAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (session && !loading) {
      if (isCliente) {
        navigate("/portal", { replace: true });
      }
      // Se for Admin acessando a tela de cliente, deixamos ele na tela de login
      // mas NÃO damos signOut automático no useEffect para não quebrar o F5.
    }
  }, [session, isCliente, navigate, loading]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast({
        title: "Tempo de resposta excedido",
        description: "A conexÃ£o demorou demais. Verifique sua internet ou fale com o suporte.",
        variant: "destructive",
      });
    }, 15000);

    try {
      toast({ title: "Iniciando login", description: "Enviando credenciais..." });
      const { error } = await signIn(email, password);
      
      if (error) {
        clearTimeout(timeoutId);
        setLoading(false);
        toast({ title: "Credenciais inválidas", description: "Verifique seu email e senha.", variant: "destructive" });
        return;
      } 
      
      toast({ title: "Verificando sessão", description: "Aguardando resposta do servidor..." });
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        clearTimeout(timeoutId);
        setLoading(false);
        toast({ title: "Erro de autenticação", description: "Não foi possível recuperar seus dados.", variant: "destructive" });
        return;
      }

      toast({ title: "Verificando permissões", description: "Consultando nível de acesso..." });
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);

      if (rolesErr) {
        clearTimeout(timeoutId);
        setLoading(false);
        toast({ title: "Erro de permissão", description: "Falha ao verificar seu nível de acesso.", variant: "destructive" });
        return;
      }

      const isCliente = roles?.some((r: any) => r.role === "cliente");
      if (!isCliente) {
        await signOut();
        clearTimeout(timeoutId);
        setLoading(false);
        toast({
          title: "Acesso Negado",
          description: "Sua conta não tem permissão de Cliente. Role encontrada: " + (roles?.[0]?.role || "nenhuma"),
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Sucesso!", description: "Redirecionando para o portal...", variant: "default" });
      clearTimeout(timeoutId);
      setLoading(false);
    } catch (err) {
      clearTimeout(timeoutId);
      setLoading(false);
      toast({ title: "Erro no login", description: "Ocorreu um erro inesperado.", variant: "destructive" });
    }
  };

  const handleCPFLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeCPF(cpf);
    if (!isValidCPF(normalized)) {
      toast({ title: "CPF inválido", description: "Digite um CPF válido.", variant: "destructive" });
      return;
    }
    if (!password) return;
    setLoading(true);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast({
        title: "Tempo de resposta excedido",
        description: "A conexão demorou demais. Tente novamente.",
        variant: "destructive",
      });
    }, 15000);

    try {
      toast({ title: "Buscando CPF", description: "Localizando cadastro do cliente..." });
      const { error } = await signInWithCPF(normalized, password);
      
      if (error) {
        clearTimeout(timeoutId);
        setLoading(false);
        toast({ title: "Credenciais inválidas", description: "CPF ou senha incorretos.", variant: "destructive" });
        return;
      }

      toast({ title: "Sessão iniciada", description: "Verificando perfil..." });
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        clearTimeout(timeoutId);
        setLoading(false);
        toast({ title: "Erro de autenticação", description: "Não foi possível recuperar seus dados.", variant: "destructive" });
        return;
      }

      toast({ title: "Validando acesso", description: "Checando se é o Portal do Cliente..." });
      const { data: roles, error: rolesErr } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id);

      if (rolesErr) {
        clearTimeout(timeoutId);
        setLoading(false);
        toast({ title: "Erro de permissão", description: "Falha ao validar seu nível de acesso.", variant: "destructive" });
        return;
      }

      const isCliente = roles?.some((r: any) => r.role === "cliente");
      if (!isCliente) {
        await signOut();
        clearTimeout(timeoutId);
        setLoading(false);
        toast({
          title: "Acesso Negado",
          description: "Esta conta nÃ£o tem permissÃ£o de Cliente.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Sucesso!", description: "Bem-vindo ao portal!", variant: "default" });
      clearTimeout(timeoutId);
      setLoading(false);
    } catch (err) {
      clearTimeout(timeoutId);
      setLoading(false);
      toast({ title: "Erro no login", description: "Ocorreu um erro inesperado.", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
            <UserCircle className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Portal do Cliente</h1>
          <p className="text-sm text-muted-foreground">Acesse seus pedidos e parcelas</p>
        </div>

        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="cpf">CPF</TabsTrigger>
          </TabsList>

          <TabsContent value="email">
            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <div className="space-y-2">
                <Label htmlFor="portal-email">Email</Label>
                <Input
                  id="portal-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal-pw-email">Senha</Label>
                <Input
                  id="portal-pw-email"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="cpf">
            <form className="space-y-4" onSubmit={handleCPFLogin}>
              <div className="space-y-2">
                <Label htmlFor="portal-cpf">CPF</Label>
                <Input
                  id="portal-cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCPF(e.target.value))}
                  disabled={loading}
                  maxLength={14}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal-pw-cpf">Senha</Label>
                <Input
                  id="portal-pw-cpf"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {session && !isCliente && !loading && (
          <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg border border-amber-200 dark:border-amber-800 text-center space-y-3">
             <p className="text-xs text-amber-800 dark:text-amber-300">
               Você já está logado com uma conta Administrativa. 
               Para entrar no Portal do Cliente, você precisa sair primeiro.
             </p>
             <Button 
               variant="outline" 
               size="sm" 
               className="w-full h-8 gap-2 border-amber-300 text-amber-900 dark:text-amber-200"
               onClick={() => signOut()}
             >
               <LogOut className="w-3.5 h-3.5" /> Sair da conta atual
             </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          NÃ£o tem acesso? Fale com seu vendedor para ativar seu portal.
        </p>
      </div>
    </div>
  );
}
