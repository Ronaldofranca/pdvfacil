import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Mail, ArrowLeft, Loader2 } from "lucide-react";

export default function EsqueciSenha() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      setSent(true);
      toast.success("Verifique sua caixa de entrada!");
    } catch (error: any) {
      // Por segurança, não confirmamos se o email existe ou não, apenas avisamos sucesso ou erro generalista
      if (error.message.includes("rate limit")) {
        toast.error("Muitas tentativas. Aguarde 1 minuto e tente novamente.");
      } else {
        setSent(true); // Engana o usuário para evitar enumeração de emails
      }
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle className="text-2xl">Recuperar Acesso</CardTitle>
          <CardDescription>
            {sent 
              ? "Instruções enviadas para o email informado."
              : "Digite o email cadastrado para redefinir sua senha."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-primary/5 rounded-xl border border-primary/20 text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                <Mail className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium">Se o e-mail <strong>{email}</strong> estiver cadastrado, você receberá um link seguro de recuperação em instantes.</p>
              <p className="text-xs text-muted-foreground mt-4">Verifique também sua pasta de spam ou lixo eletrônico.</p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de acesso</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : "Enviar link de recuperação"}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter>
          <Button variant="ghost" className="w-full text-muted-foreground" asChild disabled={loading}>
            <Link to="/login">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Login
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
