import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ADMIN_EMAIL = "contatonutary@gmail.com";
const EMPRESA_ID = "a0000000-0000-0000-0000-000000000001";

export default function SetupPage() {
  const [step, setStep] = useState<"register" | "done">("register");
  const [nome, setNome] = useState("Administrador");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
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
      const { error } = await supabase.auth.signUp({
        email: ADMIN_EMAIL,
        password,
        options: {
          data: {
            empresa_id: EMPRESA_ID,
            nome,
          },
          emailRedirectTo: window.location.origin + "/login",
        },
      });

      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      setStep("done");
    } catch {
      toast({ title: "Erro inesperado", variant: "destructive" });
    }
    setLoading(false);
  };

  if (step === "done") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Conta Criada!</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Um email de confirmação foi enviado para <strong>{ADMIN_EMAIL}</strong>.
            <br />Confirme seu email e depois faça login.
          </p>
          <Button className="w-full" onClick={() => navigate("/login")}>
            Ir para Login
          </Button>
        </div>
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
          <h1 className="text-2xl font-bold text-foreground">Configuração Inicial</h1>
          <p className="text-sm text-muted-foreground">Criar conta de administrador</p>
        </div>

        <form className="space-y-4" onSubmit={handleRegister}>
          <div className="space-y-2">
            <Label>Email (fixo)</Label>
            <Input value={ADMIN_EMAIL} disabled />
          </div>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label>Senha</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="space-y-2">
            <Label>Confirmar Senha</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
          </div>
          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Criando conta..." : "Criar Conta de Admin"}
          </Button>
        </form>
      </div>
    </div>
  );
}
