import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Eye } from "lucide-react";
import { DEFAULT_RECEIPT_CONFIG, type ReceiptConfig } from "@/lib/receiptConfig";
import { fmtR } from "@/lib/reportExport";

interface Props {
  config: any;
  empresa: any;
  onSave: (partial: Record<string, any>) => void;
}

export function ReciboConfig({ config, empresa, onSave }: Props) {
  const rc: ReceiptConfig = useMemo(() => {
    const result: any = {};
    for (const [key, def] of Object.entries(DEFAULT_RECEIPT_CONFIG)) {
      result[key] = (config as any)?.[key] ?? def;
    }
    return result as ReceiptConfig;
  }, [config]);

  const [local, setLocal] = useState<ReceiptConfig>(rc);

  const update = (key: keyof ReceiptConfig, value: any) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    onSave({ [key]: value });
  };

  const handleRestoreDefaults = () => {
    setLocal({ ...DEFAULT_RECEIPT_CONFIG });
    onSave({ ...DEFAULT_RECEIPT_CONFIG });
  };

  const ColorField = ({ label, field }: { label: string; field: keyof ReceiptConfig }) => (
    <div className="flex items-center gap-3">
      <Label className="w-40 text-sm">{label}</Label>
      <input
        type="color"
        className="h-9 w-14 rounded border cursor-pointer"
        value={local[field] as string}
        onChange={(e) => update(field, e.target.value)}
      />
      <span className="text-xs text-muted-foreground font-mono">{local[field] as string}</span>
    </div>
  );

  const ToggleField = ({ label, desc, field }: { label: string; desc?: string; field: keyof ReceiptConfig }) => (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <Switch checked={local[field] as boolean} onCheckedChange={(v) => update(field, v)} />
    </div>
  );

  // Preview data
  const previewDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cabeçalho</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ColorField label="Cor de fundo" field="recibo_cor_cabecalho" />
              <ColorField label="Cor da fonte" field="recibo_cor_fonte_cabecalho" />
              <div className="space-y-1">
                <Label className="text-sm">Subtítulo (opcional)</Label>
                <Input
                  value={local.recibo_subtitulo}
                  placeholder="Ex: Distribuidora de Cosméticos"
                  onChange={(e) => update("recibo_subtitulo", e.target.value)}
                />
              </div>
              <ToggleField label="Exibir logo" desc="Mostrar logo da empresa no cabeçalho" field="recibo_exibir_logo" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Cores e Aparência</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ColorField label="Cor principal" field="recibo_cor_principal" />
              <ColorField label="Cor dos títulos" field="recibo_cor_titulos" />
              <ColorField label="Cor do texto" field="recibo_cor_texto" />
              <ColorField label="Cor do total" field="recibo_cor_total" />
              <ColorField label="Cor das bordas" field="recibo_cor_bordas" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conteúdo Exibido</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <ToggleField label="Telefone da empresa" field="recibo_exibir_telefone" />
              <ToggleField label="Endereço" field="recibo_exibir_endereco" />
              <ToggleField label="CPF/CNPJ da empresa" field="recibo_exibir_cpf_cnpj" />
              <ToggleField label="Nome do cliente" field="recibo_exibir_cliente" />
              <ToggleField label="Nome do vendedor" field="recibo_exibir_vendedor" />
              <ToggleField label="Forma de pagamento" field="recibo_exibir_forma_pagamento" />
              <ToggleField label="Parcelas" field="recibo_exibir_parcelas" />
              <ToggleField label="Observações" field="recibo_exibir_observacoes" />
              <ToggleField label="Imagem dos produtos" desc="Mostra miniatura do produto no recibo" field="recibo_exibir_imagem_produto" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mensagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm">Mensagem final</Label>
                <Input
                  value={local.recibo_mensagem_final}
                  onChange={(e) => update("recibo_mensagem_final", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Rodapé</Label>
                <Textarea
                  value={local.recibo_rodape}
                  onChange={(e) => update("recibo_rodape", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" className="gap-2" onClick={handleRestoreDefaults}>
            <RotateCcw className="h-4 w-4" /> Restaurar Padrão
          </Button>
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Eye className="h-4 w-4" /> Pré-visualização do Recibo
          </div>
          <Card className="overflow-hidden shadow-lg">
            <div
              style={{
                background: `linear-gradient(135deg, ${local.recibo_cor_cabecalho} 0%, ${local.recibo_cor_cabecalho}dd 100%)`,
                color: local.recibo_cor_fonte_cabecalho,
                padding: "20px 24px",
              }}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  {local.recibo_exibir_logo && empresa?.logo_url && (
                    <img src={empresa.logo_url} alt="" className="h-10 rounded bg-white p-1" />
                  )}
                  <div>
                    <p className="font-bold text-sm">{empresa?.nome || "Minha Empresa"}</p>
                    {local.recibo_subtitulo && <p className="text-xs opacity-70">{local.recibo_subtitulo}</p>}
                    {local.recibo_exibir_telefone && empresa?.telefone && <p className="text-xs opacity-70">📞 {empresa.telefone}</p>}
                    {local.recibo_exibir_endereco && empresa?.endereco && <p className="text-xs opacity-70 truncate max-w-[200px]">{empresa.endereco}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: local.recibo_cor_principal }}>Recibo de Venda</p>
                  <p className="font-bold">#abc123</p>
                  <p className="text-[10px] opacity-70">{previewDate}</p>
                </div>
              </div>
            </div>

            <CardContent className="p-4 space-y-3" style={{ color: local.recibo_cor_texto }}>
              {local.recibo_exibir_cliente && (
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: local.recibo_cor_titulos, borderBottom: `2px solid ${local.recibo_cor_bordas}`, paddingBottom: 4 }}>
                    <span className="inline-block w-[3px] h-[12px] rounded mr-1 align-middle" style={{ background: local.recibo_cor_principal }} /> Dados do Cliente
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs mt-1">
                    <div className="p-1.5 rounded" style={{ background: `${local.recibo_cor_bordas}33` }}>
                      <span className="text-muted-foreground">Nome</span> <span className="font-medium float-right">Maria Silva</span>
                    </div>
                    <div className="p-1.5 rounded" style={{ background: `${local.recibo_cor_bordas}33` }}>
                      <span className="text-muted-foreground">Código</span> <span className="font-medium float-right">a1b2c3d4</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: local.recibo_cor_titulos, borderBottom: `2px solid ${local.recibo_cor_bordas}`, paddingBottom: 4 }}>
                  <span className="inline-block w-[3px] h-[12px] rounded mr-1 align-middle" style={{ background: local.recibo_cor_principal }} /> Itens da Venda
                </p>
                <div className="space-y-1 mt-1">
                  {[
                    { nome: "Creme Hidratante 200ml", qty: 2, preco: 45.90, img: true },
                    { nome: "Shampoo Nutrição 300ml", qty: 1, preco: 32.50, img: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded" style={{ borderBottom: `1px solid ${local.recibo_cor_bordas}44` }}>
                      {local.recibo_exibir_imagem_produto && (
                        item.img
                          ? <div className="w-7 h-7 rounded bg-muted flex-shrink-0" style={{ border: `1px solid ${local.recibo_cor_bordas}` }} />
                          : <div className="w-7 h-7 rounded flex-shrink-0 flex items-center justify-center text-[7px] font-bold" style={{ background: `${local.recibo_cor_bordas}44`, color: local.recibo_cor_titulos }}>IMG</div>
                      )}
                      <span className="flex-1 font-medium truncate">{item.nome}</span>
                      <span className="text-muted-foreground">{item.qty}x</span>
                      <span className="font-semibold">{fmtR(item.preco * item.qty)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg p-3" style={{ background: `${local.recibo_cor_principal}11`, border: `1px solid ${local.recibo_cor_principal}33` }}>
                <div className="flex justify-between text-xs"><span>Subtotal</span><span>{fmtR(124.30)}</span></div>
                <div className="flex justify-between text-xs text-destructive"><span>Descontos</span><span>-{fmtR(4.30)}</span></div>
                <Separator className="my-1" style={{ background: local.recibo_cor_principal }} />
                <div className="flex justify-between font-bold text-sm" style={{ color: local.recibo_cor_total }}>
                  <span>TOTAL</span><span>{fmtR(120.00)}</span>
                </div>
              </div>

              {local.recibo_exibir_forma_pagamento && (
                <div className="text-xs p-2 rounded" style={{ background: `${local.recibo_cor_bordas}33`, border: `1px solid ${local.recibo_cor_bordas}` }}>
                  <span className="text-muted-foreground">PIX</span>
                  <span className="float-right font-semibold" style={{ color: local.recibo_cor_total }}>{fmtR(120.00)}</span>
                </div>
              )}

              <div className="text-center pt-2" style={{ borderTop: `1px solid ${local.recibo_cor_bordas}`, background: `${local.recibo_cor_bordas}22`, margin: "0 -16px -16px", padding: "12px 16px" }}>
                {local.recibo_mensagem_final && <p className="text-xs font-semibold">{local.recibo_mensagem_final}</p>}
                {local.recibo_rodape && <p className="text-[9px] text-muted-foreground mt-1">{local.recibo_rodape}</p>}
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            Este preview reflete o layout real do PDF e da impressão.
          </p>
        </div>
      </div>
    </div>
  );
}
