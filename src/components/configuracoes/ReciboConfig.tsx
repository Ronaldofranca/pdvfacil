import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { RotateCcw, Eye } from "lucide-react";
import { DEFAULT_RECEIPT_CONFIG, getReceiptConfig, type ReceiptConfig } from "@/lib/receiptConfig";
import { ReceiptVendaContent } from "@/components/receipts/ReceiptVendaContent";
import { fmtR } from "@/lib/reportExport";

interface Props {
  config: any;
  empresa: any;
  onSave: (partial: Record<string, any>) => void;
}

export function ReciboConfig({ config, empresa, onSave }: Props) {
  const rc: ReceiptConfig = useMemo(() => {
    return getReceiptConfig(config);
  }, [config]);

  const [local, setLocal] = useState<ReceiptConfig>(rc);

  const DB_KEYS = new Set([
    "recibo_cor_cabecalho", "recibo_cor_fonte_cabecalho", "recibo_subtitulo",
    "recibo_exibir_logo", "recibo_cor_principal", "recibo_cor_titulos",
    "recibo_cor_texto", "recibo_cor_total", "recibo_cor_bordas",
    "recibo_exibir_telefone", "recibo_exibir_endereco", "recibo_exibir_cpf_cnpj",
    "recibo_exibir_cliente", "recibo_exibir_vendedor", "recibo_exibir_forma_pagamento",
    "recibo_exibir_parcelas", "recibo_exibir_observacoes", "recibo_exibir_imagem_produto",
    "recibo_mensagem_final", "recibo_rodape", "recibo_logo_largura"
  ]);

  const update = (key: keyof ReceiptConfig, value: any) => {
    setLocal((prev) => {
      const next = { ...prev, [key]: value };
      
      // Determine what to send to onSave (database)
      let payload: Record<string, any> = {};

      if (DB_KEYS.has(key)) {
        payload[key] = value;
        // If we are updating the message itself, we must PRESERVE the existing extra JSON if it exists in the OLD state
        if (key === "recibo_mensagem_final") {
           const extra = extractExtra(next);
           if (Object.keys(extra).length > 0) {
              payload[key] = `${value} <!--RECIBO_EXTRA_JSON:${JSON.stringify(extra)}-->`;
           }
        }
      } else {
        // It's an EXTRA key. We must bundle ALL extra keys into recibo_mensagem_final
        const extra = extractExtra(next);
        const cleanMsg = next.recibo_mensagem_final;
        payload["recibo_mensagem_final"] = `${cleanMsg} <!--RECIBO_EXTRA_JSON:${JSON.stringify(extra)}-->`;
      }

      onSave(payload);
      return next;
    });
  };

  const extractExtra = (state: ReceiptConfig) => {
    const extra: Record<string, any> = {};
    for (const [k, v] of Object.entries(state)) {
      if (!DB_KEYS.has(k)) {
        extra[k] = v;
      }
    }
    return extra;
  };

  const handleRestoreDefaults = () => {
    setLocal({ ...DEFAULT_RECEIPT_CONFIG });
    // When restoring defaults, we save the clean message (no JSON block)
    onSave({ ...DEFAULT_RECEIPT_CONFIG });
  };

  const ColorField = ({ label, field, desc }: { label: string; field: keyof ReceiptConfig; desc?: string }) => {
    const value = local[field] as string;
    
    const handleHexChange = (hex: string) => {
      // Basic hex validation
      if (/^#?([0-9A-F]{3}){1,2}$/i.test(hex)) {
        const validatedHex = hex.startsWith('#') ? hex : `#${hex}`;
        update(field, validatedHex);
      } else {
        // Just update local state for typing, but don't save yet if invalid?
        // Actually, better to just let them type and only trigger onSave if valid.
        setLocal(prev => ({ ...prev, [field]: hex }));
      }
    };

    return (
      <div className="flex flex-col gap-1.5 py-1">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{label}</Label>
          <div className="flex items-center gap-2">
            <Input
              className="h-8 w-24 text-[10px] font-mono"
              value={value}
              onChange={(e) => handleHexChange(e.target.value)}
              placeholder="#000000"
            />
            <input
              type="color"
              className="h-8 w-8 rounded border cursor-pointer p-0 overflow-hidden"
              value={value.startsWith('#') && (value.length === 4 || value.length === 7) ? value : "#000000"}
              onChange={(e) => update(field, e.target.value)}
            />
          </div>
        </div>
        {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
      </div>
    );
  };

  const FontSizeField = ({ label, field }: { label: string; field: keyof ReceiptConfig }) => (
    <div className="flex items-center justify-between py-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
         <Input
          type="number"
          className="h-8 w-16 text-right text-xs"
          value={local[field] as number}
          min={6}
          max={48}
          onChange={(e) => update(field, parseInt(e.target.value) || 10)}
        />
        <span className="text-[10px] text-muted-foreground w-4">px</span>
      </div>
    </div>
  );

  const ToggleField = ({ label, desc, field }: { label: string; desc?: string; field: keyof ReceiptConfig }) => (
    <div className="flex items-center justify-between py-1.5">
      <div className="space-y-0.5">
        <Label className="text-xs font-medium">{label}</Label>
        {desc && <p className="text-[10px] text-muted-foreground">{desc}</p>}
      </div>
      <Switch
        className="scale-75 origin-right"
        checked={local[field] as boolean}
        onCheckedChange={(v) => update(field, v)}
      />
    </div>
  );

  // Preview data
  const previewDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
          <Card className="border-primary/20 bg-primary/5 shadow-none pb-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <RotateCcw className="h-4 w-4" /> Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={handleRestoreDefaults}>
                Restaurar Configurações Originais
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Identidade Visual</CardTitle>
              <CardDescription>Cores principais e logo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cabeçalho</Label>
                  <ColorField label="Cor do Fundo" field="recibo_cor_cabecalho" />
                  <div className="pt-2">
                    <Label className="text-xs">Título Principal</Label>
                    <Input
                      className="h-8 mt-1 text-xs"
                      value={local.recibo_titulo_venda}
                      placeholder="Ex: Recibo de Venda"
                      onChange={(e) => update("recibo_titulo_venda", e.target.value)}
                    />
                  </div>
                  <ColorField label="Cor do Título Principal" field="recibo_cor_titulo_venda" />
                  
                  <div className="pt-2">
                    <Label className="text-xs">Subtítulo do Cabeçalho</Label>
                    <Input
                      className="h-8 mt-1 text-xs"
                      value={local.recibo_subtitulo}
                      placeholder="Ex: Distribuidora de Cosméticos"
                      onChange={(e) => update("recibo_subtitulo", e.target.value)}
                    />
                  </div>
                  <ToggleField label="Exibir Logotipo" field="recibo_exibir_logo" />
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Tamanho da Logo</Label>
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{local.recibo_logo_largura}px</span>
                  </div>
                  <Slider
                    value={[local.recibo_logo_largura as number]}
                    min={40}
                    max={300}
                    step={5}
                    onValueChange={([v]) => update("recibo_logo_largura", v)}
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    Ajuste a largura da logomarca no cabeçalho do recibo.
                  </p>
                </div>

                <Separator />

                <div className="space-y-1">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cores Gerais</Label>
                  <ColorField label="Cor de Destaque (Accent)" field="recibo_cor_principal" desc="Usado em ícones e separadores" />
                  <ColorField label="Cor dos Títulos" field="recibo_cor_titulos" />
                  <ColorField label="Cor do Texto" field="recibo_cor_texto" />
                  <ColorField label="Cor do Valor Total" field="recibo_cor_total" />
                  <ColorField label="Cor das Bordas" field="recibo_cor_bordas" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Tipografia (Tamanhos)</CardTitle>
              <CardDescription>Ajuste o tamanho da fonte (em px) de cada seção</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 pt-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
                <FontSizeField label="Nome da Empresa" field="recibo_tamanho_fonte_empresa" />
                <FontSizeField label="Subtítulo/Título" field="recibo_tamanho_fonte_titulo" />
                <FontSizeField label="Nº da Venda (ID)" field="recibo_tamanho_fonte_venda_id" />
                <FontSizeField label="Data de Emissão" field="recibo_tamanho_fonte_data" />
                <FontSizeField label="Labels do Cliente/Dados" field="recibo_tamanho_fonte_labels" />
                <FontSizeField label="Valores dos Dados" field="recibo_tamanho_fonte_valores" />
                <FontSizeField label="Nome do Produto" field="recibo_tamanho_fonte_item_nome" />
                <FontSizeField label="Subtítulo do Item (Qty x Valor)" field="recibo_tamanho_fonte_item_subtitulo" />
                <FontSizeField label="Subtotal da Venda" field="recibo_tamanho_fonte_subtotal" />
                <FontSizeField label="Destaque do TOTAL" field="recibo_tamanho_fonte_total" />
                <FontSizeField label="Formas de Pagamento" field="recibo_tamanho_fonte_pagamento" />
                <FontSizeField label="Tabela de Parcelas" field="recibo_tamanho_fonte_parcelas" />
                <FontSizeField label="Mensagem Final/Rodapé" field="recibo_tamanho_fonte_rodape" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Bordas & Estrutura</CardTitle>
              <CardDescription>Controle de contornos e espaçamentos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Toggles de Borda</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                  <ToggleField label="Borda no Cabeçalho" field="recibo_borda_cabecalho" />
                  <ToggleField label="Borda Dados da Venda" field="recibo_borda_dados_venda" />
                  <ToggleField label="Borda Bloco de Itens" field="recibo_borda_itens" />
                  <ToggleField label="Borda Entre Itens" field="recibo_borda_item_linha" />
                  <ToggleField label="Borda Bloco Pagamento" field="recibo_borda_pagamento" />
                  <ToggleField label="Borda Bloco Parcelas" field="recibo_borda_parcelas" />
                  <ToggleField label="Borda no Rodapé" field="recibo_borda_rodape" />
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Altura do Cabeçalho</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8 w-20 text-right text-xs"
                      value={local.recibo_altura_cabecalho}
                      onChange={(e) => update("recibo_altura_cabecalho", parseInt(e.target.value) || 20)}
                    />
                    <span className="text-[10px] text-muted-foreground">px</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">Aumenta o preenchimento vertical (padding) da área superior.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Visibilidade de Conteúdo</CardTitle>
              <CardDescription>Escolha quais informações ocultar ou exibir</CardDescription>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
                <ToggleField label="Telefone da Empresa" field="recibo_exibir_telefone" />
                <ToggleField label="Endereço Completo" field="recibo_exibir_endereco" />
                <ToggleField label="CPF/CNPJ da Empresa" field="recibo_exibir_cpf_cnpj" />
                <ToggleField label="Dados do Cliente" field="recibo_exibir_cliente" />
                <ToggleField label="Identificação do Vendedor" field="recibo_exibir_vendedor" />
                <ToggleField label="Forma de Pagamento" field="recibo_exibir_forma_pagamento" />
                <ToggleField label="Tabela de Parcelas" field="recibo_exibir_parcelas" />
                <ToggleField label="Observações de Venda" field="recibo_exibir_observacoes" />
                <ToggleField label="Imagens dos Produtos" field="recibo_exibir_imagem_produto" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Mensagens do Rodapé</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Mensagem Final (Destaque)</Label>
                <Input
                  className="h-9 text-xs"
                  value={local.recibo_mensagem_final}
                  placeholder="Obrigado pela preferência!"
                  onChange={(e) => update("recibo_mensagem_final", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Texto Legal / Rodapé</Label>
                <Textarea
                  className="text-xs min-h-[80px]"
                  value={local.recibo_rodape}
                  placeholder="Este recibo não tem valor fiscal..."
                  onChange={(e) => update("recibo_rodape", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Eye className="h-4 w-4" /> Pré-visualização do Recibo
          </div>
          <Card className="overflow-hidden shadow-lg bg-white">
            <div className="bg-white">
              <ReceiptVendaContent
                config={local}
                empresa={empresa}
                venda={{
                  id: "abc123de",
                  data_venda: new Date().toISOString(),
                  status: "finalizada",
                  subtotal: 124.3,
                  desconto_total: 4.3,
                  total: 120.0,
                  pagamentos: [{ forma: "pix", valor: 120.0 }],
                  observacoes: "Venda de teste para o preview."
                }}
                itens={[
                  { id: "1", nome_produto: "Creme Hidratante 200ml", quantidade: 2, preco_vendido: 45.9, subtotal: 91.8, produtos: { imagem_url: "" } },
                  { id: "2", nome_produto: "Shampoo Nutrição 300ml", quantidade: 1, preco_vendido: 32.5, subtotal: 32.5, produtos: { imagem_url: "" } },
                ]}
                parcelas={[]}
              />
            </div>
          </Card>
          <p className="text-xs text-muted-foreground text-center">
            Este preview reflete o layout real do PDF e da impressão.
          </p>
        </div>
      </div>
    </div>
  );
}
