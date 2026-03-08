import { useState, useMemo } from "react";
import { Search, BookOpen, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";
import type { Unit } from "@/lib/units-store";
import type { UserSubject } from "@/lib/subjects-store";

interface DashboardSearchProps {
  subjects: UserSubject[];
  allUnits: Record<string, Unit[]>;
}

type SearchResult = {
  type: "topic" | "unit";
  label: string;
  subLabel: string;
  subjectId: string;
};

export default function DashboardSearch({ subjects, allUnits }: DashboardSearchProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const disabled = subjects.length === 0;

  const results = useMemo(() => {
    if (disabled || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const out: SearchResult[] = [];

    for (const subj of subjects) {
      const units = allUnits[subj.id] || [];
      for (const unit of units) {
        if (unit.name.toLowerCase().includes(q)) {
          out.push({ type: "unit", label: unit.name, subLabel: subj.name, subjectId: subj.id });
        }
        for (const topic of unit.topics || []) {
          if (topic.name.toLowerCase().includes(q)) {
            out.push({ type: "topic", label: topic.name, subLabel: `${subj.name} › ${unit.name}`, subjectId: subj.id });
          }
        }
      }
    }
    return out.slice(0, 8);
  }, [query, subjects, allUnits, disabled]);

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${disabled ? "text-muted-foreground/40" : "text-muted-foreground"}`} />
            <Input
              value={query}
              onChange={(e) => !disabled && setQuery(e.target.value)}
              placeholder={disabled ? "Add subjects first to enable search" : "Search topics & units across all subjects..."}
              className={`pl-9 bg-secondary/50 border-border/50 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={disabled}
            />
          </div>
        </TooltipTrigger>
        {disabled && (
          <TooltipContent>
            <p>Add subjects first to enable search</p>
          </TooltipContent>
        )}
      </Tooltip>
      {results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => { navigate(`/subject/${r.subjectId}`); setQuery(""); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0"
            >
              {r.type === "topic" ? <FileText className="w-4 h-4 text-primary flex-shrink-0" /> : <BookOpen className="w-4 h-4 text-accent flex-shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{r.subLabel}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
