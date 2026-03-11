import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AceitarConvitePage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // The invite link will auto-sign the user in via the hash token
    // We just need to check if there's a session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setNome(session.user.user_metadata?.nome || "");
        setReady(true);
      } else {
        // Listen for auth changes (invite token processing)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (newSession) {
            setNome(newSession.user.user_metadata?.nome || "");
            setReady(true);
          }
        });
        // Wait a bit then give up
        setTimeout(() => setReady(true), 3000);
        return () => subscription.unsubscribe();
      }
    };
    checkSession();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Senha deve ter pelo menos 6 caracteres", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Senhas não coincidem", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Erro ao definir senha", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Update profile name if changed
      if (nome) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").update({ nome }).eq("user_id", user.id);
        }
      }

      setDone(true);
      toast({ title: "Senha definida com sucesso!" });
    } catch {
      toast({ title: "Erro inesperado", variant: "destructive" });
    }
    setLoading(false);
  };

  if (done) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Tudo pronto!</h1>
          </div>
          <p className="text-sm text-muted-foreground">Sua senha foi definida. Agora você pode acessar o sistema.</p>
          <Button className="w-full" onClick={() => navigate("/")}>
            Acessar Sistema
          </Button>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <p className="text-muted-foreground">Processando convite...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo!</h1>
          <p className="text-sm text-muted-foreground">Defina sua senha para acessar o sistema</p>
        </div>

        <form className="space-y-4" onSubmit={handleSetPassword}>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-2">
            <Label>Confirmar Senha</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Definir Senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
