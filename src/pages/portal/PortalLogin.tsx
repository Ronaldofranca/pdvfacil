import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Zap, UserCircle, LogOut, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { useToast } from "@/hooks/use-toast";
import { isValidCPF, formatCPF, normalizeCPF } from "@/lib/cpfUtils";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [loginConta, setLoginConta] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithCPF, signInWithConta, signOut, session, isCliente } = usePortalAuth();
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
        description: "Limpando sessão congelada do navegador. Tente logar novamente.",
        variant: "destructive",
      });
      // Deadlock Escape
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) localStorage.removeItem(key);
      });
      // Force generic state reset
      setTimeout(() => window.location.reload(), 1000);
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
        description: "Limpando cache congelado do navegador. Tente logar novamente.",
        variant: "destructive",
      });
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) localStorage.removeItem(key);
      });
      setTimeout(() => window.location.reload(), 1000);
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
          description: "Esta conta não tem permissão de Cliente.",
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

  const handleContaLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginConta.trim() || !password) return;
    setLoading(true);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast({
        title: "Tempo de resposta excedido",
        description: "Limpando cache congelado do navegador. Tente logar novamente.",
        variant: "destructive",
      });
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') && key.includes('-auth-token')) localStorage.removeItem(key);
      });
      setTimeout(() => window.location.reload(), 1000);
    }, 15000);

    try {
      toast({ title: "Acessando conta", description: "Verificando credenciais..." });
      const { error } = await signInWithConta(loginConta, password);
      
      if (error) {
        clearTimeout(timeoutId);
        setLoading(false);
        toast({ title: "Acesso Negado", description: "Usuário ou senha incorretos.", variant: "destructive" });
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
          description: "Esta conta não tem permissão de Cliente.",
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

        <Tabs defaultValue="conta" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="conta">Usuário</TabsTrigger>
            <TabsTrigger value="cpf">CPF</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>

          <TabsContent value="conta">
            <form className="space-y-4" onSubmit={handleContaLogin}>
              <div className="space-y-2">
                <Label htmlFor="portal-conta">Usuário / Login</Label>
                <Input
                  id="portal-conta"
                  type="text"
                  placeholder="Ex: telefone, nome ou código"
                  value={loginConta}
                  onChange={(e) => setLoginConta(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portal-pw-conta">Senha</Label>
                <div className="relative">
                  <Input
                    id="portal-pw-conta"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button className="w-full" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

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
                <div className="relative">
                  <Input
                    id="portal-pw-email"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
                <div className="relative">
                  <Input
                    id="portal-pw-cpf"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
