import { useState, useEffect, useRef } from "react";
import "katex/dist/katex.min.css";
import { BlockMath, InlineMath } from "react-katex";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, Printer, FileText, Plus, Trash2, BookOpen } from "lucide-react";

type Formula = {
  id?: string;
  name: string;
  latex?: string;
  plainText?: string;
  formula?: string; // legacy
  variables: string;
  example?: string;
  custom?: boolean;
};
type Section = { unitName: string; formulas: Formula[] };

const UNIT_COLORS = [
  "from-indigo-500/20 to-purple-500/10 border-indigo-500/30",
  "from-emerald-500/20 to-teal-500/10 border-emerald-500/30",
  "from-pink-500/20 to-rose-500/10 border-pink-500/30",
  "from-amber-500/20 to-orange-500/10 border-amber-500/30",
  "from-sky-500/20 to-cyan-500/10 border-sky-500/30",
  "from-violet-500/20 to-fuchsia-500/10 border-violet-500/30",
];

// Detect if a string contains LaTeX markup
const isLatex = (s?: string) => !!s && /[\\^_{}]/.test(s);

function MathBlock({ latex, plainText }: { latex?: string; plainText?: string }) {
  const src = (latex || "").trim();
  if (src && isLatex(src)) {
    try {
      return (
        <div className="text-center py-2 overflow-x-auto">
          <BlockMath math={src} />
        </div>
      );
    } catch {
      return <p className="font-mono text-sm text-primary text-center py-2">{plainText || src}</p>;
    }
  }
  return <p className="font-mono text-sm text-primary text-center py-2">{plainText || src || "—"}</p>;
}

function LivePreview({ latex }: { latex: string }) {
  const src = latex.trim();
  if (!src) return <p className="text-xs text-muted-foreground italic">Preview will appear here…</p>;
  try {
    return isLatex(src) ? <BlockMath math={src} /> : <span className="font-mono text-sm">{src}</span>;
  } catch (e: any) {
    return <span className="text-xs text-destructive">Invalid LaTeX: {e?.message || "syntax error"}</span>;
  }
}

export default function AIFormulaSheet() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [savedSheets, setSavedSheets] = useState<any[]>([]);
  const [customFormulas, setCustomFormulas] = useState<Formula[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", latex: "", plainText: "", variables: "", example: "", unitName: "Custom" });
  const printRef = useRef<HTMLDivElement>(null);

  const subjectName = subjects.find((s) => s.id === selectedSubject)?.name || "";

  useEffect(() => {
    if (!user) return;
    supabase.from("subjects").select("id, name, code").eq("user_id", user.id).then(({ data }) => {
      if (data) setSubjects(data);
    });
    supabase.from("formula_sheets").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setSavedSheets(data);
    });
  }, [user]);

  useEffect(() => {
    if (!selectedSubject) return;
    supabase.from("units").select("id, name, unit_number").eq("subject_id", selectedSubject).order("unit_number").then(({ data }) => {
      if (data) setUnits(data);
      setSelectedUnits([]);
    });
  }, [selectedSubject]);

  // Load custom formulas for selected subject
  useEffect(() => {
    if (!user || !subjectName) { setCustomFormulas([]); return; }
    (supabase as any).from("user_formulas").select("*").eq("user_id", user.id).eq("subject", subjectName).order("created_at", { ascending: false }).then(({ data }: any) => {
      if (data) {
        setCustomFormulas(data.map((d: any) => ({
          id: d.id, name: d.name, latex: d.latex, plainText: d.plain_text,
          variables: d.variables, example: d.example, custom: true,
        })));
      }
    });
  }, [user, subjectName]);

  const generate = async () => {
    setLoading(true);
    setSections([]);
    try {
      const unitNames = selectedUnits.length > 0
        ? units.filter((u) => selectedUnits.includes(u.id)).map((u) => u.name)
        : units.map((u) => u.name);
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: "formulasheet", subject: subjectName, units: unitNames }),
      });
      if (!resp.ok) throw new Error("Failed to generate");
      const data = await resp.json();
      const result: Section[] = (data.sections || []).map((sec: any) => ({
        unitName: sec.unitName,
        formulas: (sec.formulas || []).map((f: any) => ({
          name: f.name,
          latex: f.latex || f.formula || "",
          plainText: f.plainText || f.formula || "",
          variables: f.variables || "",
          example: f.example || "",
        })),
      }));
      setSections(result);

      if (user) {
        await supabase.from("formula_sheets").insert({
          user_id: user.id, subject: subjectName, units: unitNames, content: result as any,
        });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleUnit = (id: string) => setSelectedUnits((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const saveCustomFormula = async () => {
    if (!user || !subjectName) { toast({ title: "Select a subject first", variant: "destructive" }); return; }
    if (!addForm.name.trim() || (!addForm.latex.trim() && !addForm.plainText.trim())) {
      toast({ title: "Name and a formula (LaTeX or plain) required", variant: "destructive" });
      return;
    }
    try {
      const { data, error } = await (supabase as any).from("user_formulas").insert({
        user_id: user.id,
        subject: subjectName,
        unit_name: addForm.unitName || "Custom",
        name: addForm.name.trim(),
        latex: addForm.latex.trim(),
        plain_text: addForm.plainText.trim(),
        variables: addForm.variables.trim(),
        example: addForm.example.trim(),
      }).select().single();
      if (error) throw error;
      setCustomFormulas((prev) => [{
        id: data.id, name: data.name, latex: data.latex, plainText: data.plain_text,
        variables: data.variables, example: data.example, custom: true,
      }, ...prev]);
      setShowAdd(false);
      setAddForm({ name: "", latex: "", plainText: "", variables: "", example: "", unitName: "Custom" });
      toast({ title: "Formula saved" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const deleteCustomFormula = async (id?: string) => {
    if (!id) return;
    try {
      await (supabase as any).from("user_formulas").delete().eq("id", id);
      setCustomFormulas((prev) => prev.filter((f) => f.id !== id));
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setPdfLoading(true);
    try {
      const node = printRef.current;
      const canvas = await html2canvas(node, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 10;

      pdf.setFontSize(16);
      pdf.text(`${subjectName || "Formula"} — Formula Sheet`, 10, 8);
      pdf.addImage(imgData, "PNG", 10, position + 5, imgWidth, imgHeight);
      heightLeft -= pageHeight - position - 5;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${(subjectName || "subject").replace(/\s+/g, "_")}_Formula_Sheet.pdf`);
      toast({ title: "PDF downloaded" });
    } catch (e: any) {
      toast({ title: "PDF failed", description: e.message, variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  };

  // Compose displayed sections: AI sections + a single "My Formulas" group from custom
  const displaySections: Section[] = [
    ...sections,
    ...(customFormulas.length > 0 ? [{ unitName: "My Custom Formulas", formulas: customFormulas }] : []),
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="no-print flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground">AI Formula Sheet Generator</h1>
            <p className="text-muted-foreground">Generate printable formula sheets with rendered math</p>
          </div>
        </div>

        <Card className="no-print">
          <CardContent className="pt-6 space-y-4">
            <div>
              <Label>Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {units.length > 0 && (
              <div>
                <Label className="mb-2 block">Units (select specific or leave empty for all)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {units.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={selectedUnits.includes(u.id)} onCheckedChange={() => toggleUnit(u.id)} />
                      {u.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button className="flex-1 min-w-[200px]" onClick={generate} disabled={loading || !selectedSubject}>
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</> : <><FileText className="w-4 h-4 mr-2" /> Generate Formula Sheet</>}
              </Button>
              <Button variant="outline" onClick={() => setShowAdd(true)} disabled={!selectedSubject}>
                <Plus className="w-4 h-4 mr-1" /> Add Formula
              </Button>
            </div>
          </CardContent>
        </Card>

        {displaySections.length > 0 && (
          <>
            <div className="no-print flex gap-2 justify-end flex-wrap">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Print
              </Button>
              <Button size="sm" onClick={handleDownloadPdf} disabled={pdfLoading}>
                {pdfLoading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Generating PDF…</> : <><Download className="w-4 h-4 mr-1" /> Download PDF</>}
              </Button>
            </div>
            <div ref={printRef} id="formula-sheet-printable" className="space-y-6 bg-background p-4 rounded-lg">
              <div className="hidden print:block text-center mb-4">
                <h1 className="text-3xl font-bold">{subjectName} — Formula Sheet</h1>
              </div>
              {displaySections.map((sec, i) => (
                <Card key={i} className={`bg-gradient-to-br ${UNIT_COLORS[i % UNIT_COLORS.length]} border`}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5" /> {sec.unitName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {sec.formulas.map((f, j) => (
                        <div key={f.id || j} className="rounded-lg border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-2 relative group">
                          {f.custom && (
                            <button
                              onClick={() => deleteCustomFormula(f.id)}
                              className="no-print absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-destructive"
                              aria-label="Delete formula"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <h4 className="font-semibold text-sm text-foreground pr-6">{f.name}</h4>
                          <div className="bg-background/60 rounded p-3 min-h-[60px] flex items-center justify-center">
                            <MathBlock latex={f.latex || f.formula} plainText={f.plainText || f.formula} />
                          </div>
                          {f.variables && (
                            <div className="text-[11px] text-muted-foreground">
                              <span className="font-semibold">Variables:</span> {f.variables}
                            </div>
                          )}
                          {f.example && (
                            <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                              <span className="font-semibold">Example:</span> {f.example}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {savedSheets.length > 0 && sections.length === 0 && (
          <Card className="no-print">
            <CardHeader><CardTitle className="text-lg">Saved Formula Sheets</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {savedSheets.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{s.subject}</p>
                    <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()} • {(s.units as string[])?.length || 0} units</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
                    const loaded: Section[] = ((s.content as any[]) || []).map((sec) => ({
                      unitName: sec.unitName,
                      formulas: (sec.formulas || []).map((f: any) => ({
                        name: f.name,
                        latex: f.latex || f.formula || "",
                        plainText: f.plainText || f.formula || "",
                        variables: f.variables || "",
                        example: f.example || "",
                      })),
                    }));
                    setSections(loaded);
                  }}><FileText className="w-4 h-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Formula modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Formula</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Formula Name</Label>
              <Input value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Quadratic Formula" />
            </div>
            <div>
              <Label>Unit / Chapter</Label>
              <Input value={addForm.unitName} onChange={(e) => setAddForm((f) => ({ ...f, unitName: e.target.value }))} placeholder="e.g. Algebra" />
            </div>
            <div>
              <Label>LaTeX (KaTeX-compatible)</Label>
              <Textarea
                value={addForm.latex}
                onChange={(e) => setAddForm((f) => ({ ...f, latex: e.target.value }))}
                placeholder={"x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"}
                rows={2}
                className="font-mono text-sm"
              />
              <div className="mt-2 p-3 rounded bg-secondary/50 min-h-[50px] flex items-center justify-center">
                <LivePreview latex={addForm.latex} />
              </div>
            </div>
            <div>
              <Label>Plain-text Fallback</Label>
              <Input value={addForm.plainText} onChange={(e) => setAddForm((f) => ({ ...f, plainText: e.target.value }))} placeholder="x = (-b ± √(b²-4ac)) / 2a" />
            </div>
            <div>
              <Label>Variables</Label>
              <Input value={addForm.variables} onChange={(e) => setAddForm((f) => ({ ...f, variables: e.target.value }))} placeholder="a, b, c = coefficients; x = root" />
            </div>
            <div>
              <Label>Example</Label>
              <Input value={addForm.example} onChange={(e) => setAddForm((f) => ({ ...f, example: e.target.value }))} placeholder="For x²-5x+6=0, x = 2 or 3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={saveCustomFormula}>Save Formula</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
