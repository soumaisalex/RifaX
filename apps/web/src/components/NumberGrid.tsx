import { useMemo, useState } from "react";

type Status = "AVAILABLE" | "RESERVED" | "SOLD";
export type NumberItem = { number: number; status: Status };

const PAGE_SIZE = 100;

export function NumberGrid({ items, total, onSelectionChange }: { items: NumberItem[]; total: number; onSelectionChange?: (numbers: number[]) => void }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const visible = useMemo(() => items.slice(0, PAGE_SIZE), [items]);

  const toggle = (item: NumberItem) => {
    if (item.status !== "AVAILABLE") return;
    setSelected((current) => {
      const next = new Set(current);
      next.has(item.number) ? next.delete(item.number) : next.add(item.number);
      onSelectionChange?.([...next].sort((a, b) => a - b));
      return next;
    });
  };

  return <div>
    <div className="number-grid">
      {visible.map((item) => <button key={item.number} disabled={item.status !== "AVAILABLE"} aria-pressed={selected.has(item.number)} className={`number ${item.status.toLowerCase()} ${selected.has(item.number) ? "selected" : ""}`} onClick={() => toggle(item)}>{String(item.number).padStart(3, "0")}</button>)}
    </div>
    {totalPages > 1 && <nav aria-label="Paginação dos números" className="number-pagination">
      <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
      <span>Página {page} de {totalPages}</span>
      <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</button>
    </nav>}
  </div>;
}
