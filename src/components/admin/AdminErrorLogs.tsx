import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function AdminErrorLogs() {
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadErrors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("error_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setErrors(data || []);
    setLoading(false);
  };

  useEffect(() => { loadErrors(); }, []);

  const errorCounts = {
    crash: errors.filter(e => e.error_type === "crash").length,
    runtime: errors.filter(e => e.error_type === "runtime").length,
    unhandled: errors.filter(e => e.error_type === "unhandled" || e.error_type === "unhandled_promise").length,
    suspicious: errors.filter(e => e.error_type === "suspicious").length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Crashes", count: errorCounts.crash, color: "text-destructive" },
          { label: "Runtime", count: errorCounts.runtime, color: "text-orange-500" },
          { label: "Unhandled", count: errorCounts.unhandled, color: "text-yellow-500" },
          { label: "Suspicious", count: errorCounts.suspicious, color: "text-red-500" },
        ].map(s => (
          <div key={s.label} className="glass-card p-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> Recent Errors ({errors.length})
        </h3>
        <Button size="sm" variant="outline" onClick={loadErrors} disabled={loading}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {errors.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No errors logged — all good! 🎉</p>
          </div>
        ) : errors.map(err => (
          <div key={err.id} className="p-3 rounded-lg bg-muted/30 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant={err.error_type === "crash" ? "destructive" : "secondary"} className="text-xs">
                {err.error_type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(err.created_at), "dd MMM HH:mm")}
              </span>
            </div>
            <p className="text-foreground font-mono text-xs break-all">{err.error_message}</p>
            {err.page_url && <p className="text-xs text-muted-foreground">Page: {err.page_url}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
