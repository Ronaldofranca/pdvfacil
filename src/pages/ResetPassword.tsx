import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, ArrowRight, Loader2, KeyRound, Eye, EyeOff } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionValida, setSessionValida] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Verifica se há uma sessão ativa proveniente do link de recovery
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSessionValida(false);
        return;
      }
      setSessionValida(true);
    };
    checkSession();

    // Supabase intercala hash URL com access_token. O onAuthStateChange pega o RECOVERY se disparado
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setSessionValida(true);
      } else {
        setSessionValida(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não conferem");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;
      
      toast.success("Senha atualizada com sucesso!");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (sessionValida === null) {
    return (
      <div className="flex bg-muted/30 min-h-dvh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sessionValida === false) {
    return (
      <div className="flex bg-muted/30 min-h-dvh flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-destructive">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-destructive font-bold">Link Inválido</CardTitle>
            <CardDescription>
              Este link de redefinição de senha expirou ou é inválido.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 pb-6">
            <Button asChild className="w-full" variant="outline">
               <Link to="/esqueci-senha">Solicitar novo link</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex bg-muted/30 min-h-dvh flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm mb-6 flex justify-center">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-lg">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">VendaForce</h1>
        </div>
      </div>
      
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">Nova Senha</CardTitle>
          <CardDescription>
            Crie uma senha forte e segura para a sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova Senha</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="******" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
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
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirme a Senha</Label>
              <div className="relative">
                <Input 
                  id="confirm" 
                  type={showConfirmPassword ? "text" : "password"} 
                  placeholder="******" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full h-11 text-base font-semibold mt-6" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Atualizando...</> : <><KeyRound className="mr-2 w-5 h-5" /> Salvar e Acessar</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
