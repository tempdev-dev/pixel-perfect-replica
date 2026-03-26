import { useNavigate } from "react-router-dom";
import { useHotelData } from "@/data/useHotelData";
import type { Supplier } from "@/types/hotel";

const getFlagColor = (progress: number) => {
  if (progress >= 100) return "text-match";
  if (progress >= 70) return "text-primary";
  return "text-foreground";
};

function SupplierCard({ supplier }: { supplier: Supplier }) {
  const navigate = useNavigate();
  const isDone = supplier.pending === 0;

  return (
    <div
      className={`rounded-lg border p-4 transition-all ${
        isDone
          ? "border-border bg-surface cursor-default opacity-70"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm cursor-pointer"
      }`}
      onClick={() => !isDone && navigate(`/review/${supplier.code}`)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-base font-semibold text-foreground">{supplier.code}</span>
        <span className="text-xs text-muted-foreground">{supplier.name}</span>
      </div>

      <div className="mb-3">
        <span className={`text-2xl font-bold tabular-nums ${getFlagColor(supplier.progress)}`}>
          {supplier.pending}
        </span>
        <span className="text-xs text-muted-foreground ml-1.5">pending</span>
      </div>

      <div className="mb-3">
        <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${supplier.progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-2xs text-muted-foreground tabular-nums">{supplier.progress}%</span>
          <span className="text-2xs text-muted-foreground">
            {supplier.mapped}M · {supplier.rejected}R · {supplier.new}N
          </span>
        </div>
      </div>

      {isDone ? (
        <div className="text-xs text-match font-medium flex items-center gap-1">
          <span>✓</span> Complete
        </div>
      ) : (
        <button className="w-full text-xs font-medium text-primary hover:text-primary/80 py-1.5 rounded-md border border-primary/20 hover:bg-primary/5 transition-colors">
          Review →
        </button>
      )}
    </div>
  );
}

export default function SupplierSelector() {
  const { suppliers } = useHotelData();
  const totalPending = suppliers.reduce((s, sup) => s + sup.pending, 0);

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-card border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground">Manual Mapping Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{totalPending} hotels pending review</p>
        </div>
        <button className="text-xs text-muted-foreground border border-border rounded-md px-3 py-1.5 hover:bg-surface transition-colors">
          Export All
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <p className="text-sm text-muted-foreground mb-4">
          Select a supplier to review pending hotel mappings
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {suppliers.map((s) => (
            <SupplierCard key={s.code} supplier={s} />
          ))}
        </div>
      </main>
    </div>
  );
}
