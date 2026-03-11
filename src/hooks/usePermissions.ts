import { useAuth } from "@/contexts/AuthContext";
import type { AppRole, Permission } from "@/types/auth";

export function usePermissions() {
  const { roles, permissions, hasRole, hasPermission, isAdmin, isGerente, isVendedor } = useAuth();

  const canCreateVenda = hasPermission("criar_venda") || isAdmin || isGerente;
  const canEditProduto = hasPermission("editar_produto") || isAdmin;
  const canViewRelatorios = hasPermission("ver_relatorios") || isAdmin || isGerente;
  const canRegisterPagamento = hasPermission("registrar_pagamento") || isAdmin || isGerente;
  const canManageVendedores = hasPermission("gerenciar_vendedores") || isAdmin;

  return {
    roles,
    permissions,
    hasRole,
    hasPermission,
    isAdmin,
    isGerente,
    isVendedor,
    canCreateVenda,
    canEditProduto,
    canViewRelatorios,
    canRegisterPagamento,
    canManageVendedores,
  };
}
