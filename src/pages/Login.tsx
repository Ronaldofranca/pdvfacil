import { Zap, Loader2, ShieldCheck, ShieldAlert, Key, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  
  // MFA States
  const [requireMFA, setRequireMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [useBackupMode, setUseBackupMode] = useState(false);
  
  const { signIn, session, profile, rolesLoaded, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Blocks redirect if we're waiting for MFA
    if (session && rolesLoaded && !requireMFA) {
      if (profile) {
        navigate("/", { replace: true });
      } else if (hasRole("cliente")) {
        navigate("/portal", { replace: true });
      }
    }
  }, [session, profile, rolesLoaded, requireMFA, navigate, hasRole]);

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
      if (error) return { blocked: false };
      return data as { blocked: boolean; attempts?: number; remaining?: number; blocked_until?: string };
    } catch {
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

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length < 6) return;
    setLoading(true);

    try {
      if (useBackupMode) {
        // Fluxo de Código de Backup (Consome o código e cancela o MFA do usuário)
         const { data: { user } } = await supabase.auth.getUser();
         const backupCodes = user?.user_meta_data?.backup_codes || [];
         
         if (backupCodes.includes(mfaCode.trim().toUpperCase())) {
            // Success Backup Code
            const newCodes = backupCodes.filter((c: string) => c !== mfaCode.trim().toUpperCase());
            
            // Remove TOTP factors para dar fallback ao usuário que perdeu tudo
            const { data: factors } = await supabase.auth.mfa.listFactors();
            if (factors && factors.totp.length > 0) {
               for (const f of factors.totp) {
                 await supabase.auth.mfa.unenroll({ factorId: f.id });
               }
            }
            
            await supabase.auth.updateUser({
              data: { backup_codes: newCodes, mfa_active: false }
            });

            toast({ title: "Acesso por Backup", description: "Autenticador desativado. Você deve configurar um novo nas opções." });
            setRequireMFA(false);
            navigate("/", { replace: true });
         } else {
            toast({ title: "Código Incorreto", description: "Código de backup inválido ou já usado.", variant: "destructive" });
         }
      } else {
        // Fluxo normal TOTP
        const challenge = await supabase.auth.mfa.challenge({ factorId });
        if (challenge.error) throw challenge.error;

        const verify = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challenge.data.id,
          code: mfaCode
        });

        if (verify.error) throw verify.error;
        
        setRequireMFA(false);
        navigate("/", { replace: true });
      }
    } catch (e: any) {
       toast({
         title: "Falha na Verificação",
         description: "Código inválido. Tente novamente.",
         variant: "destructive"
       });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) return;

    if (blocked) {
      toast({ title: "Acesso bloqueado", description: "Muitas tentativas de login. " + getBlockTimeRemaining(), variant: "destructive" });
      return;
    }

    setLoading(true);

    const rateLimitResult = await checkRateLimit(trimmedEmail, "check");
    if (rateLimitResult.blocked) {
      setBlocked(true);
      setBlockedUntil(rateLimitResult.blocked_until || null);
      setLoading(false);
      toast({ title: "Acesso bloqueado", description: "Muitas tentativas.", variant: "destructive" });
      return;
    }

    const { error } = await signIn(trimmedEmail, password);
    
    if (error) {
      setLoading(false);
      const remaining = rateLimitResult.remaining;
      setRemainingAttempts(typeof remaining === "number" ? remaining : null);
      toast({ title: "Credenciais inválidas", description: "Verifique seu email e senha e tente novamente.", variant: "destructive" });
    } else {
      // MFA CHECK
      const mfaCheck = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (mfaCheck.data?.nextLevel === 'aal2' && mfaCheck.data?.currentLevel === 'aal1') {
         // Requer MFA
         const { data: factorsData } = await supabase.auth.mfa.listFactors();
         const factor = factorsData?.totp.find(f => f.status === 'verified');
         if (factor) {
           setFactorId(factor.id);
         }
         setRequireMFA(true);
         setLoading(false);
         return;
      }

      // Verificação estrita para Admins
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        if (hasRole("cliente")) {
          await supabase.auth.signOut();
          setLoading(false);
          toast({ title: "Acesso Negado", description: "Clientes devem acessar o Portal pelo link correto.", variant: "destructive" });
          return;
        }
      }

      await checkRateLimit(trimmedEmail, "reset");
      setRemainingAttempts(null);
      setLoading(false);
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4 relative overflow-hidden">
      {!requireMFA ? (
        <div className="w-full max-w-sm space-y-6 z-10">
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
                id="email" type="email" placeholder="seu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                disabled={loading || blocked}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Senha</Label>
                <Link to="/esqueci-senha" className="text-xs text-primary hover:underline" tabIndex={-1}>Esqueceu a senha?</Link>
              </div>
              <div className="relative">
                <Input
                  id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  disabled={loading || blocked}
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
            <Button className="w-full" type="submit" disabled={loading || blocked}>
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
              {loading ? "Entrando..." : blocked ? "Bloqueado" : "Entrar"}
            </Button>
            {remainingAttempts !== null && remainingAttempts > 0 && !blocked && (
              <p className="text-center text-xs text-muted-foreground">
                ⚠️ {remainingAttempts} tentativa{remainingAttempts > 1 ? "s" : ""} restante{remainingAttempts > 1 ? "s" : ""}
              </p>
            )}
          </form>
          <p className="text-center text-[10px] text-muted-foreground/60 pt-4">
            Criado com carinho por Ronaldo França
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm z-10 animate-in fade-in zoom-in duration-300">
           <Card className="border-t-4 border-t-primary shadow-xl">
             <CardContent className="pt-6 pb-8 space-y-6 flex flex-col items-center">
                <div className="bg-primary/10 p-4 rounded-full">
                   {useBackupMode ? <Key className="h-8 w-8 text-primary" /> : <ShieldCheck className="h-8 w-8 text-primary" />}
                </div>
                <div className="text-center space-y-1">
                   <h2 className="text-xl font-bold">{useBackupMode ? "Código de Backup" : "Verificação em Duas Etapas"}</h2>
                   <p className="text-sm text-muted-foreground">
                     {useBackupMode 
                       ? "Digite um dos seus códigos de backup para acessar e desativar o autenticador."
                       : "Abra o Google Authenticator ou Authy e insira o código de 6 dígitos gerado."}
                   </p>
                </div>
                
                <form className="w-full space-y-4" onSubmit={handleMfaSubmit}>
                   <div className="space-y-4 text-center">
                      <Input
                        autoFocus
                        value={mfaCode}
                        onChange={e => setMfaCode(useBackupMode ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, "").slice(0,6))}
                        placeholder={useBackupMode ? "XXXX-XXXX" : "123456"}
                        className={`text-xl tracking-[0.5em] font-mono text-center h-14 ${useBackupMode ? "text-lg uppercase" : ""}`}
                      />
                   </div>
                   <Button type="submit" disabled={loading || mfaCode.length < 6} className="w-full h-11">
                      {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                      Verificar Identidade
                   </Button>
                </form>

                <div className="w-full pt-4 border-t text-center">
                   <Button 
                     variant="link" 
                     className="text-muted-foreground text-xs"
                     onClick={() => {
                       setUseBackupMode(!useBackupMode);
                       setMfaCode("");
                     }}
                   >
                     {useBackupMode ? "Tentar usar o Aplicativo Autenticador" : "Perdeu o acesso? Usar código de backup"}
                   </Button>
                </div>
             </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}
