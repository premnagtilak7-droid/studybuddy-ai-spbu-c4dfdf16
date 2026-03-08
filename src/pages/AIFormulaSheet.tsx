import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Printer, FileText, Trash2 } from "lucide-react";

type Formula = { name: string; formula: string; variables: string; example?: string };
type Section = { unitName: string; formulas: Formula[] };

export default function AIFormulaSheet() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [savedSheets, setSavedSheets] = useState<any[]>([]);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      supabase.from("subjects").select("id, name, code").eq("user_id", user.id).then(({ data }) => {
        if (data) setSubjects(data);
      });
      supabase.from("formula_sheets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
        if (data) setSavedSheets(data);
      });
    }
  }, [user]);

  useEffect(() => {
    if (selectedSubject) {
      supabase.from("units").select("id, name, unit_number").eq("subject_id", selectedSubject).order("unit_number").then(({ data }) => {
        if (data) setUnits(data);
        setSelectedUnits([]);
      });
    }
  }, [selectedSubject]);

  const generate = async () => {
    setLoading(true);
    setSections([]);
    try {
      const subName = subjects.find(s => s.id === selectedSubject)?.name || "";
      const unitNames = selectedUnits.length > 0 ? units.filter(u => selectedUnits.includes(u.id)).map(u => u.name) : units.map(u => u.name);
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: "formulasheet", subject: subName, units: unitNames }),
      });
      if (!resp.ok) throw new Error("Failed to generate");
      const data = await resp.json();
      setSections(data.sections || []);

      if (user) {
        await supabase.from("formula_sheets").insert({
          user_id: user.id,
          subject: subName,
          units: unitNames,
          content: data.sections as any,
        });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const w = window.open("", "_blank");
      if (w) {
        w.document.write(`<html><head><title>Formula Sheet</title><style>body{font-family:system-ui;padding:20px}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}th{background:#f0f0f0}h2{margin-top:24px}</style></head><body>${printRef.current.innerHTML}</body></html>`);
        w.document.close();
        w.print();
      }
    }
  };

  const toggleUnit = (id: string) => setSelectedUnits(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Formula Sheet Generator</h1>
          <p className="text-muted-foreground">Generate printable formula sheets for any subject</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {units.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Units (select specific or leave empty for all)</label>
                <div className="grid grid-cols-2 gap-2">
                  {units.map(u => (
                    <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedUnits.includes(u.id)} onCheckedChange={() => toggleUnit(u.id)} />
                      {u.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <Button className="w-full" onClick={generate} disabled={loading || !selectedSubject}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><FileText className="w-4 h-4 mr-2" /> Generate Formula Sheet</>}
            </Button>
          </CardContent>
        </Card>

        {sections.length > 0 && (
          <>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" /> Print</Button>
            </div>
            <div ref={printRef} className="space-y-6">
              {sections.map((sec, i) => (
                <Card key={i}>
                  <CardHeader><CardTitle className="text-lg">{sec.unitName}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2 font-medium text-foreground">Name</th>
                            <th className="text-left p-2 font-medium text-foreground">Formula</th>
                            <th className="text-left p-2 font-medium text-foreground">Variables</th>
                            <th className="text-left p-2 font-medium text-foreground">Example</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sec.formulas.map((f, j) => (
                            <tr key={j} className="border-b last:border-0">
                              <td className="p-2 text-foreground font-medium">{f.name}</td>
                              <td className="p-2 font-mono text-primary">{f.formula}</td>
                              <td className="p-2 text-muted-foreground">{f.variables}</td>
                              <td className="p-2 text-muted-foreground">{f.example || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {savedSheets.length > 0 && sections.length === 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Saved Formula Sheets</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {savedSheets.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{s.subject}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()} • {(s.units as string[])?.length || 0} units</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSections((s.content as any) || [])}><FileText className="w-4 h-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
