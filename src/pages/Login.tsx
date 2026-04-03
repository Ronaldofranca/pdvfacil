import { Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const { signIn, session, profile, rolesLoaded, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already logged in (but ONLY if they have an admin/internal profile)
  useEffect(() => {
    if (session && rolesLoaded) {
      if (profile) {
        navigate("/", { replace: true });
      } else if (hasRole("cliente")) {
        // Only redirect to portal if we're CERTAIN they are a client
        navigate("/portal", { replace: true });
      }
      // If no profile and no client role, stay here (might be loading or broken account)
      // but DO NOT signOut() as that breaks the session on F5 refresh.
    }
  }, [session, profile, rolesLoaded, navigate, hasRole]);

  // Countdown timer for block
  useEffect(() => {
    if (!blockedUntil) return;
    const checkBlock = () => {
      if (new Date(blockedUntil) <= new Date()) {
        setBlocked(false);
        setBlockedUntil(null);
        setRemainingAttempts(null);
      }
    };
    const interval = setInterval(checkBlock, 1000);
    checkBlock();
    return () => clearInterval(interval);
  }, [blockedUntil]);

  const checkRateLimit = async (trimmedEmail: string, action: "check" | "reset") => {
    try {
      const { data, error } = await supabase.functions.invoke("check-login-attempt", {
        body: { email: trimmedEmail, action },
      });
      if (error) {
        console.warn("Rate limit check failed, allowing login:", error);
        return { blocked: false };
      }
      return data as { blocked: boolean; attempts?: number; remaining?: number; blocked_until?: string };
    } catch {
      // Don't block login if rate limit service is unavailable
      return { blocked: false };
    }
  };

  const getBlockTimeRemaining = () => {
    if (!blockedUntil) return "";
    const diff = new Date(blockedUntil).getTime() - Date.now();
    if (diff <= 0) return "";
    const mins = Math.ceil(diff / 60000);
    return `Tente novamente em ${mins} minuto${mins > 1 ? "s" : ""}.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) return;

    if (blocked) {
      toast({
        title: "Acesso bloqueado",
        description: "Muitas tentativas de login. " + getBlockTimeRemaining(),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Check rate limit before attempting login
    const rateLimitResult = await checkRateLimit(trimmedEmail, "check");

    if (rateLimitResult.blocked) {
      setBlocked(true);
      setBlockedUntil(rateLimitResult.blocked_until || null);
      setLoading(false);
      toast({
        title: "Acesso bloqueado",
        description: "Muitas tentativas de login. Tente novamente mais tarde.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await signIn(trimmedEmail, password);
    
    if (error) {
      setLoading(false);
      const remaining = rateLimitResult.remaining;
      setRemainingAttempts(typeof remaining === "number" ? remaining : null);

      toast({
        title: "Credenciais inválidas",
        description: "Verifique seu email e senha e tente novamente.",
        variant: "destructive",
      });
    } else {
      // Verificação estrita: Esta tela é APENAS para admin/equipe interna
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (hasRole("cliente")) {
          // É um cliente tentando fazer login na tela de master
          await supabase.auth.signOut();
          setLoading(false);
          toast({
            title: "Acesso Negado",
            description: "Esta tela é restrita para funcionários. Clientes devem acessar o Portal pelo link correto.",
            variant: "destructive",
          });
          return;
        }
      }

      // Reset rate limit on successful login
      await checkRateLimit(trimmedEmail, "reset");
      setRemainingAttempts(null);
      setLoading(false);
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">VendaForce</h1>
          <p className="text-sm text-muted-foreground">Gestão de Vendas Externas</p>
        </div>

        {blocked && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive">
            🔒 Muitas tentativas de login. {getBlockTimeRemaining()}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || blocked}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || blocked}
            />
          </div>
          <Button className="w-full" type="submit" disabled={loading || blocked}>
            {loading ? "Entrando..." : blocked ? "Bloqueado" : "Entrar"}
          </Button>
          {remainingAttempts !== null && remainingAttempts > 0 && !blocked && (
            <p className="text-center text-xs text-muted-foreground">
              ⚠️ {remainingAttempts} tentativa{remainingAttempts > 1 ? "s" : ""} restante{remainingAttempts > 1 ? "s" : ""}
            </p>
          )}
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={loading || blocked}
          onClick={async () => {
            setLoading(true);
            const result = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (result.error) {
              setLoading(false);
              toast({ title: "Erro ao entrar com Google", description: String(result.error), variant: "destructive" });
              return;
            }
            if (result.redirected) return;
            setLoading(false);
            navigate("/", { replace: true });
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Entrar com Google
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Não tem conta? Entre em contato com o administrador.
        </p>
        <p className="text-center text-[10px] text-muted-foreground/60 pt-4">
          Criado com carinho por Ronaldo França
        </p>
      </div>
    </div>
  );
}
