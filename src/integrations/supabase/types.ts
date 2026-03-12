export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          acao: string
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          empresa_id: string
          id: string
          ip: string | null
          registro_id: string | null
          tabela: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id: string
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabela: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          empresa_id?: string
          id?: string
          ip?: string | null
          registro_id?: string | null
          tabela?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_config: {
        Row: {
          banner_url: string | null
          beneficios: Json
          cor_botoes: string
          cor_fundo: string
          cor_primaria: string
          cor_secundaria: string
          created_at: string
          cta_botao_link: string
          cta_botao_texto: string
          cta_descricao: string
          cta_titulo: string
          descricao: string
          empresa_id: string
          estilo_cards: string
          id: string
          secao_beneficios: boolean
          secao_categorias: boolean
          secao_cta: boolean
          secao_destaque: boolean
          secao_testemunhos: boolean
          seo_descricao: string
          seo_titulo: string
          subtitulo: string
          tipografia: string
          titulo: string
          updated_at: string
          whatsapp_numero: string
        }
        Insert: {
          banner_url?: string | null
          beneficios?: Json
          cor_botoes?: string
          cor_fundo?: string
          cor_primaria?: string
          cor_secundaria?: string
          created_at?: string
          cta_botao_link?: string
          cta_botao_texto?: string
          cta_descricao?: string
          cta_titulo?: string
          descricao?: string
          empresa_id: string
          estilo_cards?: string
          id?: string
          secao_beneficios?: boolean
          secao_categorias?: boolean
          secao_cta?: boolean
          secao_destaque?: boolean
          secao_testemunhos?: boolean
          seo_descricao?: string
          seo_titulo?: string
          subtitulo?: string
          tipografia?: string
          titulo?: string
          updated_at?: string
          whatsapp_numero?: string
        }
        Update: {
          banner_url?: string | null
          beneficios?: Json
          cor_botoes?: string
          cor_fundo?: string
          cor_primaria?: string
          cor_secundaria?: string
          created_at?: string
          cta_botao_link?: string
          cta_botao_texto?: string
          cta_descricao?: string
          cta_titulo?: string
          descricao?: string
          empresa_id?: string
          estilo_cards?: string
          id?: string
          secao_beneficios?: boolean
          secao_categorias?: boolean
          secao_cta?: boolean
          secao_destaque?: boolean
          secao_testemunhos?: boolean
          seo_descricao?: string
          seo_titulo?: string
          subtitulo?: string
          tipografia?: string
          titulo?: string
          updated_at?: string
          whatsapp_numero?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalogo_config_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          ativa: boolean
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          descricao?: string
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      cidades_atendidas: {
        Row: {
          ativa: boolean
          cidade: string
          created_at: string
          empresa_id: string
          estado: string
          id: string
        }
        Insert: {
          ativa?: boolean
          cidade: string
          created_at?: string
          empresa_id: string
          estado?: string
          id?: string
        }
        Update: {
          ativa?: boolean
          cidade?: string
          created_at?: string
          empresa_id?: string
          estado?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cidades_atendidas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean
          cep: string
          cidade: string
          cliente_indicador_id: string | null
          cpf_cnpj: string
          created_at: string
          email: string
          empresa_id: string
          estado: string
          id: string
          latitude: number | null
          longitude: number | null
          nome: string
          observacoes: string
          pontos_indicacao: number
          rua: string
          telefone: string
          tipo: string
          total_compras: number
          total_indicacoes: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string
          cidade?: string
          cliente_indicador_id?: string | null
          cpf_cnpj?: string
          created_at?: string
          email?: string
          empresa_id: string
          estado?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome: string
          observacoes?: string
          pontos_indicacao?: number
          rua?: string
          telefone?: string
          tipo?: string
          total_compras?: number
          total_indicacoes?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string
          cidade?: string
          cliente_indicador_id?: string | null
          cpf_cnpj?: string
          created_at?: string
          email?: string
          empresa_id?: string
          estado?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          nome?: string
          observacoes?: string
          pontos_indicacao?: number
          rua?: string
          telefone?: string
          tipo?: string
          total_compras?: number
          total_indicacoes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_cliente_indicador_id_fkey"
            columns: ["cliente_indicador_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes: {
        Row: {
          alerta_cliente_inativo: boolean
          alerta_estoque_baixo: boolean
          alerta_meta_vendedor: boolean
          alerta_parcelas_vencidas: boolean
          bloquear_venda_sem_estoque_vendedor: boolean
          catalogo_publico_ativo: boolean
          comissao_padrao: number
          created_at: string
          dias_cliente_inativo: number
          empresa_id: string
          estoque_minimo_alerta: number
          id: string
          intervalo_parcelas: number
          juros_parcelas: number
          login_max_tentativas: number
          meta_mensal_padrao: number
          mostrar_preco_custo: boolean
          parcelas_max: number
          permitir_alterar_preco: boolean
          permitir_brinde: boolean
          permitir_desconto: boolean
          permitir_venda_sem_estoque: boolean
          pontos_por_indicacao: number
          sessao_expiracao_horas: number
          updated_at: string
          valor_minimo_indicacao: number
        }
        Insert: {
          alerta_cliente_inativo?: boolean
          alerta_estoque_baixo?: boolean
          alerta_meta_vendedor?: boolean
          alerta_parcelas_vencidas?: boolean
          bloquear_venda_sem_estoque_vendedor?: boolean
          catalogo_publico_ativo?: boolean
          comissao_padrao?: number
          created_at?: string
          dias_cliente_inativo?: number
          empresa_id: string
          estoque_minimo_alerta?: number
          id?: string
          intervalo_parcelas?: number
          juros_parcelas?: number
          login_max_tentativas?: number
          meta_mensal_padrao?: number
          mostrar_preco_custo?: boolean
          parcelas_max?: number
          permitir_alterar_preco?: boolean
          permitir_brinde?: boolean
          permitir_desconto?: boolean
          permitir_venda_sem_estoque?: boolean
          pontos_por_indicacao?: number
          sessao_expiracao_horas?: number
          updated_at?: string
          valor_minimo_indicacao?: number
        }
        Update: {
          alerta_cliente_inativo?: boolean
          alerta_estoque_baixo?: boolean
          alerta_meta_vendedor?: boolean
          alerta_parcelas_vencidas?: boolean
          bloquear_venda_sem_estoque_vendedor?: boolean
          catalogo_publico_ativo?: boolean
          comissao_padrao?: number
          created_at?: string
          dias_cliente_inativo?: number
          empresa_id?: string
          estoque_minimo_alerta?: number
          id?: string
          intervalo_parcelas?: number
          juros_parcelas?: number
          login_max_tentativas?: number
          meta_mensal_padrao?: number
          mostrar_preco_custo?: boolean
          parcelas_max?: number
          permitir_alterar_preco?: boolean
          permitir_brinde?: boolean
          permitir_desconto?: boolean
          permitir_venda_sem_estoque?: boolean
          pontos_por_indicacao?: number
          sessao_expiracao_horas?: number
          updated_at?: string
          valor_minimo_indicacao?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_id: string
          empresa_id: string
          id: string
          nome: string
          ultimo_sync: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          empresa_id: string
          id?: string
          nome?: string
          ultimo_sync?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          empresa_id?: string
          id?: string
          nome?: string
          ultimo_sync?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativa: boolean
          cnpj: string
          created_at: string
          email: string
          endereco: string
          id: string
          logo_url: string | null
          nome: string
          razao_social: string
          telefone: string
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          cnpj: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          logo_url?: string | null
          nome: string
          razao_social?: string
          telefone?: string
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          cnpj?: string
          created_at?: string
          email?: string
          endereco?: string
          id?: string
          logo_url?: string | null
          nome?: string
          razao_social?: string
          telefone?: string
          updated_at?: string
        }
        Relationships: []
      }
      enderecos: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          cliente_id: string
          complemento: string
          created_at: string
          empresa_id: string
          estado: string
          id: string
          latitude: number | null
          longitude: number | null
          numero: string
          principal: boolean
          rua: string
          tipo: string
        }
        Insert: {
          bairro?: string
          cep?: string
          cidade?: string
          cliente_id: string
          complemento?: string
          created_at?: string
          empresa_id: string
          estado?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          numero?: string
          principal?: boolean
          rua?: string
          tipo?: string
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          cliente_id?: string
          complemento?: string
          created_at?: string
          empresa_id?: string
          estado?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          numero?: string
          principal?: boolean
          rua?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enderecos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque: {
        Row: {
          empresa_id: string
          id: string
          produto_id: string
          quantidade: number
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          empresa_id: string
          id?: string
          produto_id: string
          quantidade?: number
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          empresa_id?: string
          id?: string
          produto_id?: string
          quantidade?: number
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      formas_pagamento: {
        Row: {
          ativa: boolean
          created_at: string
          empresa_id: string
          id: string
          nome: string
        }
        Insert: {
          ativa?: boolean
          created_at?: string
          empresa_id: string
          id?: string
          nome: string
        }
        Update: {
          ativa?: boolean
          created_at?: string
          empresa_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "formas_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_compras: {
        Row: {
          cliente_id: string
          created_at: string
          data_compra: string
          descricao: string
          empresa_id: string
          id: string
          observacoes: string
          produtos: Json
          usuario_id: string
          valor: number
        }
        Insert: {
          cliente_id: string
          created_at?: string
          data_compra?: string
          descricao?: string
          empresa_id: string
          id?: string
          observacoes?: string
          produtos?: Json
          usuario_id: string
          valor?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string
          data_compra?: string
          descricao?: string
          empresa_id?: string
          id?: string
          observacoes?: string
          produtos?: Json
          usuario_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "historico_compras_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      indicacoes_clientes: {
        Row: {
          cliente_indicado_id: string
          cliente_indicador_id: string
          created_at: string
          data_indicacao: string
          empresa_id: string
          id: string
          pontos_gerados: number
          venda_id: string | null
        }
        Insert: {
          cliente_indicado_id: string
          cliente_indicador_id: string
          created_at?: string
          data_indicacao?: string
          empresa_id: string
          id?: string
          pontos_gerados?: number
          venda_id?: string | null
        }
        Update: {
          cliente_indicado_id?: string
          cliente_indicador_id?: string
          created_at?: string
          data_indicacao?: string
          empresa_id?: string
          id?: string
          pontos_gerados?: number
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "indicacoes_clientes_cliente_indicado_id_fkey"
            columns: ["cliente_indicado_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicacoes_clientes_cliente_indicador_id_fkey"
            columns: ["cliente_indicador_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicacoes_clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "indicacoes_clientes_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_venda: {
        Row: {
          bonus: boolean
          created_at: string
          desconto: number
          id: string
          nome_produto: string
          preco_original: number
          preco_vendido: number
          produto_id: string
          quantidade: number
          subtotal: number
          venda_id: string
        }
        Insert: {
          bonus?: boolean
          created_at?: string
          desconto?: number
          id?: string
          nome_produto: string
          preco_original?: number
          preco_vendido?: number
          produto_id: string
          quantidade?: number
          subtotal?: number
          venda_id: string
        }
        Update: {
          bonus?: boolean
          created_at?: string
          desconto?: number
          id?: string
          nome_produto?: string
          preco_original?: number
          preco_vendido?: number
          produto_id?: string
          quantidade?: number
          subtotal?: number
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_catalogo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      kit_itens: {
        Row: {
          created_at: string
          id: string
          kit_id: string
          produto_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          id?: string
          kit_id: string
          produto_id: string
          quantidade?: number
        }
        Update: {
          created_at?: string
          id?: string
          kit_id?: string
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "kit_itens_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kit_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          imagem_url: string | null
          nome: string
          preco: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          empresa_id: string
          id?: string
          imagem_url?: string | null
          nome: string
          preco?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          preco?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kits_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          bloqueado_ate: string | null
          created_at: string
          email: string
          id: string
          ip: string
          tentativas: number
          updated_at: string
        }
        Insert: {
          bloqueado_ate?: string | null
          created_at?: string
          email: string
          id?: string
          ip?: string
          tentativas?: number
          updated_at?: string
        }
        Update: {
          bloqueado_ate?: string | null
          created_at?: string
          email?: string
          id?: string
          ip?: string
          tentativas?: number
          updated_at?: string
        }
        Relationships: []
      }
      metas_vendedor: {
        Row: {
          ano: number
          created_at: string
          empresa_id: string
          id: string
          mes: number
          meta_valor: number
          percentual_comissao: number
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          ano: number
          created_at?: string
          empresa_id: string
          id?: string
          mes: number
          meta_valor?: number
          percentual_comissao?: number
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          ano?: number
          created_at?: string
          empresa_id?: string
          id?: string
          mes?: number
          meta_valor?: number
          percentual_comissao?: number
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metas_vendedor_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentos_estoque: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          observacoes: string
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          empresa_id: string
          id?: string
          observacoes?: string
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["tipo_movimento"]
          vendedor_id: string
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          observacoes?: string
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["tipo_movimento"]
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentos_estoque_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentos_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentos_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      niveis_recompensa: {
        Row: {
          ativo: boolean
          beneficios: string
          cor: string
          created_at: string
          empresa_id: string
          icone: string
          id: string
          nome: string
          pontos_minimos: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          beneficios?: string
          cor?: string
          created_at?: string
          empresa_id: string
          icone?: string
          id?: string
          nome: string
          pontos_minimos?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          beneficios?: string
          cor?: string
          created_at?: string
          empresa_id?: string
          icone?: string
          id?: string
          nome?: string
          pontos_minimos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "niveis_recompensa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          lida: boolean
          mensagem: string
          tipo: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          lida?: boolean
          mensagem?: string
          tipo?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos: {
        Row: {
          created_at: string
          data_pagamento: string
          empresa_id: string
          forma_pagamento: string
          id: string
          observacoes: string
          parcela_id: string
          usuario_id: string
          valor_pago: number
        }
        Insert: {
          created_at?: string
          data_pagamento?: string
          empresa_id: string
          forma_pagamento?: string
          id?: string
          observacoes?: string
          parcela_id: string
          usuario_id: string
          valor_pago: number
        }
        Update: {
          created_at?: string
          data_pagamento?: string
          empresa_id?: string
          forma_pagamento?: string
          id?: string
          observacoes?: string
          parcela_id?: string
          usuario_id?: string
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagamentos_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_pagamento: string | null
          empresa_id: string
          forma_pagamento: string
          id: string
          numero: number
          observacoes: string
          saldo: number | null
          status: Database["public"]["Enums"]["status_parcela"]
          updated_at: string
          valor_pago: number
          valor_total: number
          vencimento: string
          venda_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          empresa_id: string
          forma_pagamento?: string
          id?: string
          numero?: number
          observacoes?: string
          saldo?: number | null
          status?: Database["public"]["Enums"]["status_parcela"]
          updated_at?: string
          valor_pago?: number
          valor_total?: number
          vencimento: string
          venda_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          empresa_id?: string
          forma_pagamento?: string
          id?: string
          numero?: number
          observacoes?: string
          saldo?: number | null
          status?: Database["public"]["Enums"]["status_parcela"]
          updated_at?: string
          valor_pago?: number
          valor_total?: number
          vencimento?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes: {
        Row: {
          created_at: string
          descricao: string
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          descricao?: string
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      produto_imagens: {
        Row: {
          alt: string
          created_at: string
          empresa_id: string
          id: string
          ordem: number
          principal: boolean
          produto_id: string
          url: string
        }
        Insert: {
          alt?: string
          created_at?: string
          empresa_id: string
          id?: string
          ordem?: number
          principal?: boolean
          produto_id: string
          url: string
        }
        Update: {
          alt?: string
          created_at?: string
          empresa_id?: string
          id?: string
          ordem?: number
          principal?: boolean
          produto_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_imagens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          beneficios: Json
          categoria_id: string | null
          codigo: string
          created_at: string
          custo: number
          descricao: string
          destaque: boolean
          empresa_id: string
          id: string
          imagem_url: string | null
          lancamento: boolean
          mais_vendido: boolean
          nome: string
          preco: number
          promocao: boolean
          seo_descricao: string
          seo_titulo: string
          slug: string
          unidade: string
          updated_at: string
          whatsapp_texto: string
        }
        Insert: {
          ativo?: boolean
          beneficios?: Json
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          custo?: number
          descricao?: string
          destaque?: boolean
          empresa_id: string
          id?: string
          imagem_url?: string | null
          lancamento?: boolean
          mais_vendido?: boolean
          nome: string
          preco?: number
          promocao?: boolean
          seo_descricao?: string
          seo_titulo?: string
          slug?: string
          unidade?: string
          updated_at?: string
          whatsapp_texto?: string
        }
        Update: {
          ativo?: boolean
          beneficios?: Json
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          custo?: number
          descricao?: string
          destaque?: boolean
          empresa_id?: string
          id?: string
          imagem_url?: string | null
          lancamento?: boolean
          mais_vendido?: boolean
          nome?: string
          preco?: number
          promocao?: boolean
          seo_descricao?: string
          seo_titulo?: string
          slug?: string
          unidade?: string
          updated_at?: string
          whatsapp_texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo: string
          created_at: string
          email: string
          empresa_id: string
          id: string
          nome: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string
          created_at?: string
          email: string
          empresa_id: string
          id?: string
          nome: string
          telefone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string
          created_at?: string
          email?: string
          empresa_id?: string
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissoes: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          permissao_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          permissao_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          permissao_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissoes_permissao_id_fkey"
            columns: ["permissao_id"]
            isOneToOne: false
            referencedRelation: "permissoes"
            referencedColumns: ["id"]
          },
        ]
      }
      romaneio_vendas: {
        Row: {
          created_at: string
          id: string
          romaneio_id: string
          venda_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          romaneio_id: string
          venda_id: string
        }
        Update: {
          created_at?: string
          id?: string
          romaneio_id?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "romaneio_vendas_romaneio_id_fkey"
            columns: ["romaneio_id"]
            isOneToOne: false
            referencedRelation: "romaneios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "romaneio_vendas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      romaneios: {
        Row: {
          created_at: string
          data: string
          empresa_id: string
          id: string
          observacoes: string
          status: string
          updated_at: string
          valor_total: number
          vendedor_id: string
        }
        Insert: {
          created_at?: string
          data?: string
          empresa_id: string
          id?: string
          observacoes?: string
          status?: string
          updated_at?: string
          valor_total?: number
          vendedor_id: string
        }
        Update: {
          created_at?: string
          data?: string
          empresa_id?: string
          id?: string
          observacoes?: string
          status?: string
          updated_at?: string
          valor_total?: number
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "romaneios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      security_logs: {
        Row: {
          created_at: string
          detalhes: Json | null
          empresa_id: string | null
          evento: string
          id: string
          ip: string | null
          user_agent: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          empresa_id?: string | null
          evento: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          empresa_id?: string | null
          evento?: string
          id?: string
          ip?: string | null
          user_agent?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_logs_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_queue: {
        Row: {
          created_at: string
          device_id: string
          empresa_id: string
          erro: string | null
          id: string
          operacao: string
          payload: Json
          status: string
          synced_at: string | null
          tabela: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          empresa_id: string
          erro?: string | null
          id?: string
          operacao: string
          payload?: Json
          status?: string
          synced_at?: string | null
          tabela: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          empresa_id?: string
          erro?: string | null
          id?: string
          operacao?: string
          payload?: Json
          status?: string
          synced_at?: string | null
          tabela?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_queue_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      testemunhos: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          created_at: string
          empresa_id: string
          id: string
          nome_cliente: string
          nota: number
          produto_id: string | null
          texto: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          nome_cliente: string
          nota?: number
          produto_id?: string | null
          texto: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          nome_cliente?: string
          nota?: number
          produto_id?: string | null
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "testemunhos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testemunhos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "testemunhos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos_catalogo"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      uso_pontos: {
        Row: {
          cliente_id: string
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          pontos_usados: number
          tipo: string
          venda_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          descricao?: string
          empresa_id: string
          id?: string
          pontos_usados: number
          tipo?: string
          venda_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          pontos_usados?: number
          tipo?: string
          venda_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uso_pontos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uso_pontos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uso_pontos_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          cliente_id: string | null
          created_at: string
          data_venda: string
          desconto_total: number
          empresa_id: string
          id: string
          observacoes: string
          pagamentos: Json
          status: Database["public"]["Enums"]["status_venda"]
          subtotal: number
          total: number
          updated_at: string
          vendedor_id: string
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string
          data_venda?: string
          desconto_total?: number
          empresa_id: string
          id?: string
          observacoes?: string
          pagamentos?: Json
          status?: Database["public"]["Enums"]["status_venda"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendedor_id: string
        }
        Update: {
          cliente_id?: string | null
          created_at?: string
          data_venda?: string
          desconto_total?: number
          empresa_id?: string
          id?: string
          observacoes?: string
          pagamentos?: Json
          status?: Database["public"]["Enums"]["status_venda"]
          subtotal?: number
          total?: number
          updated_at?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      produtos_catalogo: {
        Row: {
          ativo: boolean | null
          beneficios: Json | null
          categoria_id: string | null
          codigo: string | null
          created_at: string | null
          descricao: string | null
          destaque: boolean | null
          empresa_id: string | null
          id: string | null
          imagem_url: string | null
          lancamento: boolean | null
          mais_vendido: boolean | null
          nome: string | null
          preco: number | null
          promocao: boolean | null
          seo_descricao: string | null
          seo_titulo: string | null
          slug: string | null
          unidade: string | null
          updated_at: string | null
          whatsapp_texto: string | null
        }
        Insert: {
          ativo?: boolean | null
          beneficios?: Json | null
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          empresa_id?: string | null
          id?: string | null
          imagem_url?: string | null
          lancamento?: boolean | null
          mais_vendido?: boolean | null
          nome?: string | null
          preco?: number | null
          promocao?: boolean | null
          seo_descricao?: string | null
          seo_titulo?: string | null
          slug?: string | null
          unidade?: string | null
          updated_at?: string | null
          whatsapp_texto?: string | null
        }
        Update: {
          ativo?: boolean | null
          beneficios?: Json | null
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          destaque?: boolean | null
          empresa_id?: string | null
          id?: string | null
          imagem_url?: string | null
          lancamento?: boolean | null
          mais_vendido?: boolean | null
          nome?: string | null
          preco?: number | null
          promocao?: boolean | null
          seo_descricao?: string | null
          seo_titulo?: string | null
          slug?: string | null
          unidade?: string | null
          updated_at?: string | null
          whatsapp_texto?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_itens_orfaos: {
        Args: never
        Returns: {
          qtd: number
        }[]
      }
      check_login_attempt: {
        Args: {
          _block_minutes?: number
          _email: string
          _ip: string
          _max_attempts?: number
          _window_minutes?: number
        }
        Returns: Json
      }
      check_parcelas_pagamentos: {
        Args: never
        Returns: {
          empresa_id: string
          id: string
          numero: number
          soma_pagamentos: number
          valor_pago: number
        }[]
      }
      check_parcelas_vencidas: {
        Args: never
        Returns: {
          empresa_id: string
          id: string
          numero: number
          vencimento: string
        }[]
      }
      check_resumo_financeiro: {
        Args: never
        Returns: {
          total_parcelas_valor: number
          total_recebido: number
          total_vendas: number
        }[]
      }
      check_saldo_negativo: {
        Args: never
        Returns: {
          empresa_id: string
          id: string
          numero: number
          saldo: number
        }[]
      }
      check_vendas_total: {
        Args: never
        Returns: {
          empresa_id: string
          id: string
          soma_itens: number
          total: number
        }[]
      }
      get_my_empresa_id: { Args: never; Returns: string }
      has_permission: { Args: { _permission_name: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_gerente: { Args: never; Returns: boolean }
      reset_login_attempts: { Args: { _email: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "gerente" | "vendedor"
      forma_pagamento:
        | "dinheiro"
        | "pix"
        | "cartao_credito"
        | "cartao_debito"
        | "boleto"
        | "transferencia"
        | "outro"
      status_parcela: "pendente" | "paga" | "vencida"
      status_venda: "rascunho" | "pendente" | "finalizada" | "cancelada"
      tipo_movimento: "venda" | "reposicao" | "dano" | "ajuste"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "gerente", "vendedor"],
      forma_pagamento: [
        "dinheiro",
        "pix",
        "cartao_credito",
        "cartao_debito",
        "boleto",
        "transferencia",
        "outro",
      ],
      status_parcela: ["pendente", "paga", "vencida"],
      status_venda: ["rascunho", "pendente", "finalizada", "cancelada"],
      tipo_movimento: ["venda", "reposicao", "dano", "ajuste"],
    },
  },
} as const
