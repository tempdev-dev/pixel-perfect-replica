import { useState, useEffect, useCallback } from "react";
import type { Hotel, Candidate, Decision } from "@/types/hotel";

function FieldDiff({
  label,
  sourceVal,
  candidateVal,
  score,
}: {
  label: string;
  sourceVal: string | null;
  candidateVal: string | null;
  score?: number;
}) {
  const match = sourceVal === candidateVal;
  const missing = !candidateVal;
  const isMismatch = score !== undefined && score < 0.5;
  const isDiffer = score !== undefined && score >= 0.5 && score < 0.8;

  let rowClass = "";
  let indicator = "✓";
  let indicatorClass = "text-match";

  if (missing) {
    indicator = "—";
    indicatorClass = "text-missing";
  } else if (!match) {
    if (isMismatch) {
      rowClass = "bg-mismatch-strong-bg border-l-[3px] border-l-mismatch";
      indicator = "✗";
      indicatorClass = "text-mismatch";
    } else if (isDiffer) {
      rowClass = "bg-differ-strong-bg border-l-[3px] border-l-differ";
      indicator = `⚠ ${score?.toFixed(2) || ""}`;
      indicatorClass = "text-differ";
    } else if (!match) {
      rowClass = "bg-differ-strong-bg border-l-[3px] border-l-differ";
      indicator = "⚠";
      indicatorClass = "text-differ";
    }
  }

  return (
    <tr className={rowClass}>
      <td className="px-3 py-1.5 text-xs text-muted-foreground font-medium w-20">{label}</td>
      <td className="px-3 py-1.5 text-sm">{sourceVal || <span className="text-missing">—</span>}</td>
      <td className={`px-3 py-1.5 text-sm ${!match && !missing ? "font-semibold" : ""}`}>
        {candidateVal || <span className="text-missing">—</span>}
      </td>
      <td className={`px-3 py-1.5 text-xs ${indicatorClass} w-20 text-center`}>{indicator}</td>
    </tr>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return <span className="text-differ">{"★".repeat(Math.round(rating))}{"☆".repeat(5 - Math.round(rating))}</span>;
}

function CandidateRow({
  candidate,
  hotel,
  isChecked,
  isExpanded,
  onToggleCheck,
  onToggleExpand,
  index,
}: {
  candidate: Candidate;
  hotel: Hotel;
  isChecked: boolean;
  isExpanded: boolean;
  onToggleCheck: () => void;
  onToggleExpand: () => void;
  index: number;
}) {
  const geoOk = candidate.distance <= 100;
  const nameOk = candidate.name_score >= 0.8;
  const nameWarn = candidate.name_score >= 0.5 && candidate.name_score < 0.8;
  const starsOk = candidate.star_rating === hotel.star_rating;
  const chainOk = candidate.chain_code === hotel.chain_code;
  const chainMissing = !candidate.chain_code;

  // Row border color
  let borderClass = "";
  if (candidate.name_score < 0.5 || !starsOk || candidate.distance > 500) {
    borderClass = "border-l-[3px] border-l-mismatch bg-mismatch-strong-bg";
  } else if (nameWarn || chainMissing) {
    borderClass = "border-l-[3px] border-l-differ bg-differ-strong-bg";
  }

  return (
    <div className={`border-b ${isChecked ? "bg-selected-bg border-l-[3px] border-l-match" : borderClass}`}>
      {/* Compact row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-surface/50 transition-colors"
        onClick={onToggleExpand}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={e => { e.stopPropagation(); onToggleCheck(); }}
          onClick={e => e.stopPropagation()}
          className="w-3.5 h-3.5 rounded accent-primary"
        />
        <span className="text-xs text-muted-foreground font-mono w-8">{candidate.supplier}</span>
        <span className="text-sm font-medium flex-1 truncate">{candidate.hotel_name}</span>
        <span className={`text-2xs tabular-nums ${geoOk ? "text-match" : "text-mismatch"}`}>
          {candidate.distance}m{geoOk ? "✓" : "⚠"}
        </span>
        <span className={`text-2xs tabular-nums ${nameOk ? "text-match" : nameWarn ? "text-differ" : "text-mismatch"}`}>
          Name{nameOk ? "✓" : "⚠"}{candidate.name_score.toFixed(2)}
        </span>
        <span className={`text-2xs ${starsOk ? "text-match" : "text-mismatch"}`}>
          ★{starsOk ? "✓" : "⚠"}
        </span>
        <span className={`text-2xs ${chainOk ? "text-match" : chainMissing ? "text-missing" : "text-mismatch"}`}>
          Chain{chainOk ? "✓" : chainMissing ? "—" : "⚠"}
        </span>
        <span className="text-sm tabular-nums font-medium w-10 text-right">{candidate.score.toFixed(2)}</span>
        <span className="text-xs text-muted-foreground w-4">{isExpanded ? "▲" : "▼"}</span>
      </div>

      {/* Expanded diff */}
      {isExpanded && (
        <div className="px-4 pb-3 animate-slide-up">
          <div className="text-xs font-medium text-muted-foreground mb-2 mt-1">
            FIELD-BY-FIELD DIFF: Source vs {candidate.supplier}
          </div>
          <table className="w-full text-sm border border-border rounded overflow-hidden">
            <thead>
              <tr className="bg-surface text-xs text-muted-foreground">
                <th className="text-left px-3 py-1.5 font-medium w-20">Field</th>
                <th className="text-left px-3 py-1.5 font-medium">Source</th>
                <th className="text-left px-3 py-1.5 font-medium">{candidate.supplier}</th>
                <th className="text-center px-3 py-1.5 font-medium w-20">Diff</th>
              </tr>
            </thead>
            <tbody>
              <FieldDiff label="Name" sourceVal={hotel.hotel_name} candidateVal={candidate.hotel_name} score={candidate.name_score} />
              <FieldDiff label="Address" sourceVal={hotel.address} candidateVal={undefined as unknown as string} score={candidate.address_score} />
              <FieldDiff label="City" sourceVal={`${hotel.city}, ${hotel.country_code}`} candidateVal={`${hotel.city}, ${hotel.country_code}`} />
              <FieldDiff label="Stars" sourceVal={`★${hotel.star_rating}`} candidateVal={`★${candidate.star_rating}`} score={candidate.star_rating === hotel.star_rating ? 1 : 0.3} />
              <FieldDiff label="Chain" sourceVal={hotel.chain_code} candidateVal={candidate.chain_code} score={candidate.chain_code === hotel.chain_code ? 1 : candidate.chain_code ? 0.3 : undefined} />
              <FieldDiff label="Phone" sourceVal={hotel.phone} candidateVal={candidate.phone} />
              <FieldDiff
                label="Location"
                sourceVal={`${hotel.latitude}, ${hotel.longitude}`}
                candidateVal={`📍 ${candidate.distance}m away`}
                score={candidate.geo_score}
              />
            </tbody>
          </table>

          {/* Images comparison */}
          {(hotel.images.length > 0 || candidate.images.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Source Images</div>
                <div className="flex gap-1.5 flex-wrap">
                  {hotel.images.slice(0, 3).map((img, i) => (
                    <img key={i} src={img} alt="" className="w-16 h-12 object-cover rounded border border-border" />
                  ))}
                  {hotel.images.length > 3 && (
                    <span className="w-16 h-12 flex items-center justify-center bg-surface border border-border rounded text-2xs text-muted-foreground">
                      +{hotel.images.length - 3}
                    </span>
                  )}
                  {hotel.images.length === 0 && <span className="text-2xs text-missing">No images</span>}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{candidate.supplier} Images</div>
                <div className="flex gap-1.5 flex-wrap">
                  {candidate.images.slice(0, 3).map((img, i) => (
                    <img key={i} src={img} alt="" className="w-16 h-12 object-cover rounded border border-border" />
                  ))}
                  {candidate.images.length > 3 && (
                    <span className="w-16 h-12 flex items-center justify-center bg-surface border border-border rounded text-2xs text-muted-foreground">
                      +{candidate.images.length - 3}
                    </span>
                  )}
                  {candidate.images.length === 0 && <span className="text-2xs text-missing">No images</span>}
                </div>
              </div>
            </div>
          )}

          {/* Description comparison */}
          {(hotel.description || candidate.description) && (
            <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
              <div>
                <div className="text-muted-foreground mb-0.5">Source Description</div>
                <p className="text-foreground">{hotel.description || <span className="text-missing">—</span>}</p>
              </div>
              <div>
                <div className="text-muted-foreground mb-0.5">{candidate.supplier} Description</div>
                <p className="text-foreground">{candidate.description || <span className="text-missing">—</span>}</p>
              </div>
            </div>
          )}

          {/* Differences summary */}
          <div className="mt-3 p-2 bg-surface rounded border border-border text-xs">
            {(() => {
              const diffs: string[] = [];
              if (candidate.name_score < 0.95) diffs.push(`Name: "${hotel.hotel_name}" vs "${candidate.hotel_name}" (${candidate.name_score.toFixed(2)})`);
              if (candidate.star_rating !== hotel.star_rating) diffs.push(`Stars: ${hotel.star_rating} vs ${candidate.star_rating}`);
              if (!candidate.chain_code && hotel.chain_code) diffs.push(`Chain: missing in candidate`);
              if (candidate.distance > 100) diffs.push(`Distance: ${candidate.distance}m apart`);

              return diffs.length > 0 ? (
                <div>
                  <span className="text-differ font-medium">⚠ DIFFERENCES:</span>
                  {diffs.map((d, i) => <div key={i} className="ml-3 text-foreground">• {d}</div>)}
                </div>
              ) : (
                <span className="text-match font-medium">✓ All fields match</span>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparisonPopup({
  hotel,
  onClose,
  onDecide,
}: {
  hotel: Hotel;
  onClose: () => void;
  onDecide: (hotelId: string, decision: Decision, candidateSuppliers: string[]) => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    // Auto-check candidates with score >= 0.8
    const auto = new Set<string>();
    hotel.candidates.forEach(c => {
      if (c.score >= 0.8) auto.add(c.supplier);
    });
    return auto;
  });
  const [expanded, setExpanded] = useState<string | null>(hotel.candidates[0]?.supplier || null);
  const [notes, setNotes] = useState("");

  const toggleCheck = (supplier: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(supplier)) next.delete(supplier);
      else next.add(supplier);
      return next;
    });
  };

  const toggleAll = () => {
    if (checked.size === hotel.candidates.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(hotel.candidates.map(c => c.supplier)));
    }
  };

  // Keyboard shortcuts inside popup
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "m" || e.key === "M") {
        if (checked.size > 0) onDecide(hotel.id, "MAPPED", Array.from(checked));
        return;
      }
      if (e.key === "r" || e.key === "R") { onDecide(hotel.id, "REJECTED", []); return; }
      if (e.key === "n" || e.key === "N") { onDecide(hotel.id, "MARK_NEW", []); return; }
      if (e.key === "a" || e.key === "A") { toggleAll(); return; }
      if (e.key >= "1" && e.key <= "9") {
        const idx = parseInt(e.key) - 1;
        if (hotel.candidates[idx]) toggleCheck(hotel.candidates[idx].supplier);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [checked, hotel, onClose, onDecide]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-[95vw] max-w-6xl max-h-[92vh] sm:max-h-[90vh] md:max-h-[88vh] lg:max-h-[85vh] flex flex-col animate-slide-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10 text-lg"
        >
          ✕
        </button>

        {/* Source hotel strip */}
        <div className="border-b bg-surface px-4 py-3 rounded-t-lg shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">📌</span>
            <span className="text-base font-semibold">{hotel.hotel_name}</span>
            <span className="text-xs text-muted-foreground">│</span>
            <span className="text-xs text-muted-foreground">{hotel.city}, {hotel.country_code}</span>
            <span className="text-xs text-muted-foreground">│</span>
            <StarDisplay rating={hotel.star_rating} />
            {hotel.chain_code && (
              <>
                <span className="text-xs text-muted-foreground">│</span>
                <span className="text-xs font-mono text-foreground">{hotel.chain_code}</span>
              </>
            )}
            <span className="text-xs text-muted-foreground">│</span>
            <span className="text-sm tabular-nums font-semibold">{hotel.final_score.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{hotel.address}</span>
            {hotel.phone && (
              <>
                <span className="text-xs text-muted-foreground">│</span>
                <span className="text-xs text-muted-foreground">{hotel.phone}</span>
              </>
            )}
            <span className="text-xs text-muted-foreground">│</span>
            <div className="flex gap-1">
              {hotel.decision_flags.map(f => (
                <span key={f} className="inline-flex items-center gap-1 text-2xs text-muted-foreground bg-card border border-border rounded-full px-1.5 py-0.5">
                  {f.replace(/_/g, " ").slice(0, 20)}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Candidates */}
        <div className="flex-1 overflow-auto">
          <div className="px-4 py-2 text-xs text-muted-foreground border-b">
            CANDIDATES — check all that match ({hotel.candidates.length} found)
          </div>
          {hotel.candidates.map((c, idx) => (
            <CandidateRow
              key={c.supplier}
              candidate={c}
              hotel={hotel}
              isChecked={checked.has(c.supplier)}
              isExpanded={expanded === c.supplier}
              onToggleCheck={() => toggleCheck(c.supplier)}
              onToggleExpand={() => setExpanded(expanded === c.supplier ? null : c.supplier)}
              index={idx}
            />
          ))}
        </div>

        {/* Action bar */}
        <div className="border-t bg-surface px-4 py-3 rounded-b-lg flex items-center gap-3 shrink-0 flex-wrap">
          <input
            type="text"
            placeholder="Notes (optional)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="text-sm border border-border rounded-md px-2.5 py-1.5 flex-1 min-w-[120px] bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={() => checked.size > 0 && onDecide(hotel.id, "MAPPED", Array.from(checked))}
            disabled={checked.size === 0}
            className="text-sm font-medium bg-match text-primary-foreground px-4 py-1.5 rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
          >
            ✓ Map Selected ({checked.size})
          </button>
          <button
            onClick={() => onDecide(hotel.id, "REJECTED", [])}
            className="text-sm font-medium bg-mismatch text-primary-foreground px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity"
          >
            ✗ Reject All
          </button>
          <button
            onClick={() => onDecide(hotel.id, "MARK_NEW", [])}
            className="text-sm font-medium bg-primary text-primary-foreground px-4 py-1.5 rounded-md hover:opacity-90 transition-opacity"
          >
            ★ Mark as New
          </button>
          <span className="text-2xs text-muted-foreground hidden sm:block">
            M Map · R Reject · N New · Esc Close
          </span>
        </div>
      </div>
    </div>
  );
}
