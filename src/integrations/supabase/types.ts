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
      clientes: {
        Row: {
          ativo: boolean
          cep: string
          cidade: string
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
          rua: string
          telefone: string
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string
          cidade?: string
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
          rua?: string
          telefone?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string
          cidade?: string
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
          rua?: string
          telefone?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_empresa_id_fkey"
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
      produtos: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          codigo: string
          created_at: string
          custo: number
          descricao: string
          empresa_id: string
          id: string
          imagem_url: string | null
          nome: string
          preco: number
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          custo?: number
          descricao?: string
          empresa_id: string
          id?: string
          imagem_url?: string | null
          nome: string
          preco?: number
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          codigo?: string
          created_at?: string
          custo?: number
          descricao?: string
          empresa_id?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          preco?: number
          unidade?: string
          updated_at?: string
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
          id: string
          permissao_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permissao_id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permissao_id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissoes_permissao_id_fkey"
            columns: ["permissao_id"]
            isOneToOne: false
            referencedRelation: "permissoes"
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
      [_ in never]: never
    }
    Functions: {
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
