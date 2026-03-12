import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, FileText } from "lucide-react";

export default function Documentacao() {
  const fileUrl = "/DOCS.md";

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
          <Button size="lg" className="w-full gap-2" asChild>
            <a href={fileUrl} download="PDVFacil_Documentacao_Tecnica.md" target="_blank" rel="noopener noreferrer">
              <FileDown className="h-5 w-5" />
              Baixar Documentação (.md)
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
