import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ShieldAlert, Key, Download, CheckCircle2, Smartphone, Loader2, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function SecurityConfig() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  
  // Enrollment State
  const [factorId, setFactorId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  
  // Backup Codes
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupModal, setShowBackupModal] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;
      
      const totpFactor = factorsData.totp.find((factor) => factor.status === "verified");
      setMfaEnabled(!!totpFactor);
    } catch (e: any) {
      console.error("MFA Error:", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startEnrollment = async () => {
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (error: any) {
      toast.error("Erro ao iniciar configuração do Autenticador: " + error.message);
      setIsEnrolling(false);
    }
  };

  const cancelEnrollment = async () => {
    if (factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setIsEnrolling(false);
    setQrCode("");
    setFactorId("");
    setVerifyCode("");
  };

  const generateRawBackupCodes = () => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
       const group1 = Math.random().toString(36).substring(2, 6).toUpperCase();
       const group2 = Math.random().toString(36).substring(2, 6).toUpperCase();
       codes.push(`${group1}-${group2}`);
    }
    return codes;
  };

  const generateAndStoreBackupCodes = async () => {
    const rawCodes = generateRawBackupCodes();
    
    // Armazenando cru no user_meta_data. Em ambiente real com API própria faríamos hash.
    // Aqui usamos o JWT meta_data.
    const { error } = await supabase.auth.updateUser({
       data: { 
         backup_codes: rawCodes,
         mfa_active: true
       }
    });

    if (error) {
       toast.error("Erro ao gerar códigos de backup.");
       return [];
    }
    return rawCodes;
  };

  const verifyAndEnable = async () => {
    if (verifyCode.length < 6) return toast.error("Código incompleto");
    setIsLoading(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;
      
      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode
      });
      
      if (verify.error) throw verify.error;
      
      // MFA habilitado, gerar backup codes cru pela primeira vez
      const newBackupCodes = await generateAndStoreBackupCodes();
      
      setMfaEnabled(true);
      setIsEnrolling(false);
      setBackupCodes(newBackupCodes);
      setShowBackupModal(true);
      toast.success("Autenticação em 2 Etapas Ativada!");
      
    } catch (error: any) {
      toast.error("Erro ao verificar código: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disableMfa = async () => {
    setIsLoading(true);
    try {
       const { data: factors } = await supabase.auth.mfa.listFactors();
       if (factors && factors.totp.length > 0) {
          for (const factor of factors.totp) {
             await supabase.auth.mfa.unenroll({ factorId: factor.id });
          }
       }
       
       // Remover as tags do meta_data
       await supabase.auth.updateUser({
         data: { 
           backup_codes: null,
           mfa_active: false
         }
       });

       toast.success("Autenticação de 2 Etapas desativada.");
       setMfaEnabled(false);
    } catch (e: any) {
       toast.error(e.message);
    } finally {
       setIsLoading(false);
    }
  };

  const copyBackupCodes = () => {
     navigator.clipboard.writeText(backupCodes.join("\n"));
     toast.success("Códigos copiados para a área de transferência!");
  };

  if (isLoading && !isEnrolling) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  // Tela Pós-Ativação (Mostrar Backup Codes recém-gerados)
  if (showBackupModal) {
     return (
       <Card className="border-primary/50 shadow-md">
         <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="h-10 w-10 bg-primary/10 rounded-full flex justify-center items-center">
                 <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>MFA Ativado. Salve seus Códigos!</CardTitle>
                <CardDescription>
                  Se você perder o acesso ao seu celular, ESTES CÓDIGOS são a ÚNICA forma de recuperar o acesso sem o App.
                </CardDescription>
              </div>
            </div>
         </CardHeader>
         <CardContent>
            <Alert className="mb-4 bg-destructive/10 text-destructive border-none">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription className="font-semibold text-xs ml-2">
                 Salve num lugar seguro. Eles não poderão ser vistos novamente! Cada código só funciona UMA única vez.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-3 bg-muted/40 p-4 rounded-xl border border-dashed border-border/60">
              {backupCodes.map((code, idx) => (
                 <div key={idx} className="font-mono text-sm tracking-wider font-bold p-2 bg-background border rounded-md text-center">
                    {code}
                 </div>
              ))}
            </div>
         </CardContent>
         <CardFooter className="flex flex-col sm:flex-row gap-3">
            <Button onClick={copyBackupCodes} variant="outline" className="w-full sm:w-auto">
               <Copy className="h-4 w-4 mr-2" /> Copiar Todos
            </Button>
            <Button onClick={() => setShowBackupModal(false)} className="w-full sm:flex-1">
               <CheckCircle2 className="h-4 w-4 mr-2" /> Entendi e Salvei os Códigos
            </Button>
         </CardFooter>
       </Card>
     );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
             <div>
               <CardTitle>Autenticação de Dois Fatores (MFA)</CardTitle>
               <CardDescription>
                 Adicione uma camada extra de segurança vinculando sua conta ao Google Authenticator ou Authy.
               </CardDescription>
             </div>
             {mfaEnabled ? (
                <Badge className="bg-green-600 hover:bg-green-600">Ativado</Badge>
             ) : (
                <Badge variant="outline" className="text-muted-foreground">Desativado</Badge>
             )}
          </div>
        </CardHeader>
        <CardContent>
          {!mfaEnabled && !isEnrolling && (
             <div className="space-y-4">
                <Alert>
                  <Smartphone className="h-4 w-4" />
                  <AlertDescription>
                     Recomendado fortemente para contas com carga de Administrador. Evite invasões bloqueando conexões externas.
                  </AlertDescription>
                </Alert>
                <Button onClick={startEnrollment} className="w-full sm:w-auto">
                  Configurar Google Authenticator
                </Button>
             </div>
          )}

          {mfaEnabled && !isEnrolling && (
             <div className="space-y-4">
                <p className="text-sm">
                   Sua conta está protegida. Será necessário inserir um código do seu aplicativo no momento do login.
                </p>
                <div className="pt-2">
                   <Button variant="destructive" onClick={disableMfa}>
                     Desvincular Dispositivo (Desativar 2FA)
                   </Button>
                </div>
             </div>
          )}

          {isEnrolling && (
             <div className="space-y-6 pt-2 border-t p-4 bg-muted/20 mt-4 rounded-xl">
               <div className="flex gap-2 items-center">
                 <Badge className="w-6 h-6 rounded-full flex justify-center p-0 items-center">1</Badge>
                 <span className="font-semibold text-sm">Escaneie o QR Code</span>
               </div>
               <p className="text-sm text-muted-foreground pl-8">Abra o Google Authenticator ou Authy, e aponte a câmera para o QR Code abaixo:</p>
               
               <div className="flex justify-center p-4 bg-white rounded-xl mx-8 shadow-sm">
                 {qrCode ? (
                    <QRCodeSVG value={qrCode} size={150} level="M" />
                 ) : (
                    <div className="h-[150px] w-[150px] bg-muted animate-pulse rounded-md"></div>
                 )}
               </div>
               
               <p className="text-xs text-center text-muted-foreground w-full break-all px-8 pb-4 border-b">
                 Chave manual: <strong className="font-mono uppercase tracking-widest text-foreground">{secret}</strong>
               </p>

               <div className="flex gap-2 items-center pt-2">
                 <Badge className="w-6 h-6 rounded-full flex justify-center p-0 items-center">2</Badge>
                 <span className="font-semibold text-sm">Verifique o Código</span>
               </div>
               <div className="pl-8 space-y-3">
                 <Label>Insira os 6 dígitos gerados no app:</Label>
                 <Input 
                   placeholder="123456" 
                   value={verifyCode}
                   onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                   maxLength={6}
                   className="text-xl tracking-[0.5em] font-mono w-40 text-center"
                 />
                 <div className="flex gap-2 pt-4">
                   <Button onClick={verifyAndEnable} disabled={verifyCode.length !== 6 || isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar e Ativar"}
                   </Button>
                   <Button variant="outline" onClick={cancelEnrollment} disabled={isLoading}>
                      Cancelar
                   </Button>
                 </div>
               </div>
             </div>
          )}
        </CardContent>
      </Card>
      
      {mfaEnabled && (
         <Card>
           <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <Key className="h-4 w-4" /> Códigos de Backup
              </CardTitle>
              <CardDescription>
                Seus códigos de backup estão ativos na conta e protegem você contra a perda de acesso.
              </CardDescription>
           </CardHeader>
           <CardContent>
              <Button variant="outline" onClick={async () => {
                 setBackupCodes(await generateAndStoreBackupCodes());
                 setShowBackupModal(true);
              }}>
                <Download className="h-4 w-4 mr-2" /> Gerar Novos Códigos de Backup
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                 Nota: Gerar novos códigos inviabilizará os códigos anteriores gerados.
              </p>
           </CardContent>
         </Card>
      )}
    </div>
  );
}
