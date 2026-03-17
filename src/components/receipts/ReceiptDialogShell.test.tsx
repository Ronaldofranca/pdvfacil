import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReceiptDialogShell } from "./ReceiptDialogShell";

describe("ReceiptDialogShell", () => {
  it("aplica layout mobile com scroll interno e ações acessíveis", () => {
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

    const dialogContent = document.querySelector('[role="dialog"]');
    expect(dialogContent).toHaveClass("overflow-hidden");
    expect(dialogContent).toHaveClass("w-[calc(100vw-0.75rem)]");
    expect(dialogContent).toHaveClass("h-[min(100dvh-0.75rem,52rem)]");
  });
});
