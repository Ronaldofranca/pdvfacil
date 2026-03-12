import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Documentacao() {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await fetch("/DOCS.md", { cache: "no-store" });
      if (!res.ok) throw new Error("Falha ao buscar arquivo");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "PDVFacil_Documentacao_Tecnica.md";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado!");
    } catch {
      toast.error("Erro ao baixar documentação. Tente novamente.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <FileText className="mx-auto h-12 w-12 text-primary mb-2" />
          <CardTitle>Documentação Técnica</CardTitle>
          <CardDescription>
            PDV Fácil — Documentação completa do sistema incluindo arquitetura, banco de dados, API, segurança, offline e mais.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button size="lg" className="w-full gap-2" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
            {downloading ? "Baixando..." : "Baixar Documentação (.md)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
