import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Zap, UserCircle } from "lucide-react";
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
  const { signIn, signInWithCPF, session, isCliente } = usePortalAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (session && isCliente) {
      navigate("/portal", { replace: true });
    }
  }, [session, isCliente, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      setLoading(false);
      toast({ title: "Credenciais inválidas", description: "Verifique seu email e senha.", variant: "destructive" });
    } else {
      // Verificação estrita: Esta tela é APENAS para clientes
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id);

        const isCliente = roles?.some((r: any) => r.role === "cliente");
        if (!isCliente) {
          // Admin ou Vendedor tentando usar o portal
          await signOut();
          setLoading(false);
          toast({
            title: "Acesso Negado",
            description: "Esta tela é exclusiva para Clientes. Acesse pelo link administrativo.",
            variant: "destructive",
          });
          return;
        }
      }
      setLoading(false);
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
    const { error } = await signInWithCPF(normalized, password);
    
    if (error) {
      setLoading(false);
      toast({ title: "Credenciais inválidas", description: "Verifique seu CPF e senha.", variant: "destructive" });
    } else {
      // Verificação estrita
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id);

        const isCliente = roles?.some((r: any) => r.role === "cliente");
        if (!isCliente) {
          await signOut();
          setLoading(false);
          toast({
            title: "Acesso Negado",
            description: "Esta tela é exclusiva para Clientes. Acesse pelo link administrativo.",
            variant: "destructive",
          });
          return;
        }
      }
      setLoading(false);
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

        <p className="text-center text-xs text-muted-foreground">
          Não tem acesso? Fale com seu vendedor para ativar seu portal.
        </p>
      </div>
    </div>
  );
}
