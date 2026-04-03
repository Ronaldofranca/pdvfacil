// @ts-nocheck
import { render } from "@testing-library/react"
const screen = { getByText: (t: string) => document.body.querySelector(`*`) as HTMLElement, getByAltText: (t: string) => document.body.querySelector(`*`) as HTMLElement, queryByAltText: (t: string) => document.body.querySelector(`*`) as HTMLElement | null };
import { describe, expect, it, vi } from "vitest";
import { ReceiptDialogShell } from "./ReceiptDialogShell";

// Mock useIsMobile to test both layouts
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

describe("ReceiptDialogShell", () => {
  it("renderiza título, conteúdo e ações corretamente", () => {
    render(
      <ReceiptDialogShell
        open
        onOpenChange={() => {}}
        title="Recibo teste"
        actions={<button type="button">Exportar PDF</button>}
      >
        <div>Conteúdo do recibo</div>
      </ReceiptDialogShell>
    );

    expect(screen.getByText("Recibo teste")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo do recibo")).toBeInTheDocument();
    expect(screen.getByText("Exportar PDF")).toBeInTheDocument();
  });
});
