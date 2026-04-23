import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normaliza uma string para busca tolerante a acentos e maiúsculas.
 *
 * - Converte para minúsculas
 * - Remove diacríticos (acentos) via NFD decomposition
 *
 * Exemplos:
 *   normalizeSearch("Flávia") === normalizeSearch("flavia") // true
 *   normalizeSearch("José")   === normalizeSearch("jose")   // true
 *   normalizeSearch("SABÃO")  === normalizeSearch("sabao")  // true
 */
export function normalizeSearch(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
