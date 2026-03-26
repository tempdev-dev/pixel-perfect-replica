import { useState, useMemo, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useHotelData } from "@/data/useHotelData";
import type { Hotel, ReviewedHotel, Decision } from "@/types/hotel";
import ComparisonPopup from "@/components/ComparisonPopup";
import { toast } from "sonner";

type SortKey = "score" | "name" | "city" | "candidates";
type Tab = "pending" | "reviewed";

function FlagBadge({ flag }: { flag: string }) {
  const colors: Record<string, string> = {
    STRONG_NAME_LOCATION: "bg-differ",
    MULTI_SUPPLIER_VALIDATED: "bg-primary",
    MODERATE_NAME_LOCATION: "bg-differ",
    MULTI_SUPPLIER_REVIEW: "bg-primary",
    FALLBACK_NAME_NORMALIZED_MATCH: "bg-mismatch",
    REVIEW_2_SUPPLIERS: "bg-primary",
    REVIEW_1_SUPPLIERS: "bg-missing",
  };

  const label = flag.replace(/_/g, " ").replace(/\b\w/g, c => c).slice(0, 6).toUpperCase();

  return (
    <span className="inline-flex items-center gap-1 text-2xs text-muted-foreground bg-surface border border-border rounded-full px-1.5 py-0.5">
      <span className={`w-1.5 h-1.5 rounded-full ${colors[flag] || "bg-missing"}`} />
      {label}
    </span>
  );
}

function ReviewStatusIcon({ status }: { status: string }) {
  if (status === "MAPPED") return <span className="text-match">✓</span>;
  if (status === "REJECTED") return <span className="text-mismatch">✗</span>;
  return <span className="text-primary">★</span>;
}

export default function ReviewWorkspace() {
  const { supplierCode } = useParams<{ supplierCode: string }>();
  const navigate = useNavigate();
  const { suppliers, pendingQueue, reviewed, decide } = useHotelData();

  const supplier = suppliers.find(s => s.code === supplierCode);

  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("All");
  const [scoreMin, setScoreMin] = useState(0);
  const [scoreMax, setScoreMax] = useState(1);
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [reviewedFilter, setReviewedFilter] = useState("All");
  const [highlightedRow, setHighlightedRow] = useState(0);

  const countries = useMemo(() => {
    const set = new Set(pendingQueue.map(h => h.country_code));
    return ["All", ...Array.from(set).sort()];
  }, [pendingQueue]);

  const filtered = useMemo(() => {
    let items = [...pendingQueue];
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(h =>
        h.hotel_name.toLowerCase().includes(s) ||
        h.city.toLowerCase().includes(s)
      );
    }
    if (countryFilter !== "All") items = items.filter(h => h.country_code === countryFilter);
    items = items.filter(h => h.final_score >= scoreMin && h.final_score <= scoreMax);

    items.sort((a, b) => {
      if (sortBy === "score") return b.final_score - a.final_score;
      if (sortBy === "name") return a.hotel_name.localeCompare(b.hotel_name);
      if (sortBy === "city") return a.city.localeCompare(b.city);
      return b.candidate_count - a.candidate_count;
    });
    return items;
  }, [pendingQueue, search, countryFilter, scoreMin, scoreMax, sortBy]);

  const filteredReviewed = useMemo(() => {
    if (reviewedFilter === "All") return reviewed;
    return reviewed.filter(r => r.status === reviewedFilter);
  }, [reviewed, reviewedFilter]);

  const handleDecide = useCallback((hotelId: string, decision: Decision, candidateSuppliers: string[]) => {
    decide(hotelId, decision, candidateSuppliers);
    setSelectedHotel(null);
    const hotel = pendingQueue.find(h => h.id === hotelId);
    if (decision === "MAPPED") {
      toast.success(`✓ ${hotel?.hotel_name} → MAPPED to ${candidateSuppliers.join(", ")}`);
    } else if (decision === "REJECTED") {
      toast.error(`✗ ${hotel?.hotel_name} → REJECTED`);
    } else {
      toast.info(`★ ${hotel?.hotel_name} → Marked as New`);
    }
  }, [decide, pendingQueue]);

  // Keyboard navigation
  useEffect(() => {
    if (selectedHotel) return;
    const handler = (e: KeyboardEvent) => {
      if (tab !== "pending") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedRow(prev => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedRow(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[highlightedRow]) {
        e.preventDefault();
        setSelectedHotel(filtered[highlightedRow]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedHotel, tab, filtered, highlightedRow]);

  if (!supplier) return <div className="p-4">Supplier not found</div>;

  const mappedCount = reviewed.filter(r => r.status === "MAPPED").length;
  const rejectedCount = reviewed.filter(r => r.status === "REJECTED").length;
  const newCount = reviewed.filter(r => r.status === "NEW").length;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top bar */}
      <header className="bg-card border-b px-4 py-2.5 flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate("/review")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Suppliers
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="text-base font-semibold">{supplierCode} Review</span>
        <div className="flex items-center gap-2 ml-2">
          <div className="h-1.5 w-24 rounded-full bg-border overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${supplier.progress}%` }} />
          </div>
          <span className="text-2xs text-muted-foreground tabular-nums">{supplier.progress}%</span>
        </div>
        <div className="ml-auto flex items-center gap-3 text-2xs text-muted-foreground tabular-nums">
          <span>Mapped:{mappedCount}</span>
          <span>Rej:{rejectedCount}</span>
          <span>New:{newCount}</span>
          <span>Pending:{filtered.length}</span>
          <button className="border border-border rounded px-2 py-1 hover:bg-surface transition-colors">Export</button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-card border-b px-4 py-2 flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search hotel or city..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm border border-border rounded-md px-2.5 py-1.5 w-48 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <select
          value={countryFilter}
          onChange={e => setCountryFilter(e.target.value)}
          className="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        >
          {countries.map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-1 text-2xs text-muted-foreground">
          Score:
          <input
            type="number" min="0" max="1" step="0.05"
            value={scoreMin}
            onChange={e => setScoreMin(parseFloat(e.target.value) || 0)}
            className="w-14 border border-border rounded px-1.5 py-1 text-sm bg-background tabular-nums"
          />
          –
          <input
            type="number" min="0" max="1" step="0.05"
            value={scoreMax}
            onChange={e => setScoreMax(parseFloat(e.target.value) || 1)}
            className="w-14 border border-border rounded px-1.5 py-1 text-sm bg-background tabular-nums"
          />
        </div>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="text-sm border border-border rounded-md px-2 py-1.5 bg-background"
        >
          <option value="score">Sort: Score ↓</option>
          <option value="name">Sort: Name</option>
          <option value="city">Sort: City</option>
          <option value="candidates">Sort: Candidates</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b px-4 flex">
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "pending"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("pending")}
        >
          Pending Queue ({filtered.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === "reviewed"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("reviewed")}
        >
          Reviewed ({reviewed.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === "pending" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface text-xs text-muted-foreground">
                  <th className="text-left px-3 py-2 font-medium w-16">Score</th>
                  <th className="text-left px-3 py-2 font-medium">Hotel Name</th>
                  <th className="text-left px-3 py-2 font-medium w-24">City</th>
                  <th className="text-left px-3 py-2 font-medium w-10">CC</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Flags</th>
                  <th className="text-left px-3 py-2 font-medium">Best Match</th>
                  <th className="text-center px-3 py-2 font-medium w-8">#</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((hotel, idx) => (
                  <tr
                    key={hotel.id}
                    className={`border-b cursor-pointer transition-colors ${
                      idx === highlightedRow ? "bg-primary/5" : "hover:bg-surface"
                    }`}
                    onClick={() => setSelectedHotel(hotel)}
                  >
                    <td className="px-3 py-2.5 tabular-nums font-medium">{hotel.final_score.toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-medium">{hotel.hotel_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{hotel.city}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{hotel.country_code}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {hotel.decision_flags.slice(0, 1).map(f => (
                          <FlagBadge key={f} flag={f} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground text-sm truncate max-w-[200px]">
                      {hotel.best_match}
                    </td>
                    <td className="px-3 py-2.5 text-center tabular-nums text-muted-foreground">
                      {hotel.candidate_count}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No pending hotels match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div>
            <div className="px-4 py-2 border-b bg-card">
              <select
                value={reviewedFilter}
                onChange={e => setReviewedFilter(e.target.value)}
                className="text-sm border border-border rounded-md px-2 py-1 bg-background"
              >
                <option value="All">All</option>
                <option value="MAPPED">Mapped</option>
                <option value="REJECTED">Rejected</option>
                <option value="NEW">New</option>
              </select>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-surface text-xs text-muted-foreground">
                  <th className="text-center px-3 py-2 font-medium w-10">St</th>
                  <th className="text-left px-3 py-2 font-medium">Hotel Name</th>
                  <th className="text-left px-3 py-2 font-medium w-24">City</th>
                  <th className="text-left px-3 py-2 font-medium w-10">CC</th>
                  <th className="text-left px-3 py-2 font-medium w-24">Decision</th>
                  <th className="text-left px-3 py-2 font-medium">Mapped To</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviewed.map(r => (
                  <tr key={r.id} className="border-b hover:bg-surface transition-colors">
                    <td className="text-center px-3 py-2.5"><ReviewStatusIcon status={r.status} /></td>
                    <td className="px-3 py-2.5 font-medium">{r.hotel_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.city}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{r.country_code}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs font-medium ${
                        r.status === "MAPPED" ? "text-match" : r.status === "REJECTED" ? "text-mismatch" : "text-primary"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">
                      {r.mapped_to.length ? r.mapped_to.join(", ") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Comparison Popup */}
      {selectedHotel && (
        <ComparisonPopup
          hotel={selectedHotel}
          onClose={() => setSelectedHotel(null)}
          onDecide={handleDecide}
        />
      )}
    </div>
  );
}
