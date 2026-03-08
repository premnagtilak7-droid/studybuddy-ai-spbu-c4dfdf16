import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Search, Bookmark, BookmarkCheck, Calculator } from "lucide-react";

type Formula = { id: string; subject: string; name: string; formula: string; variables: string | null; example: string | null; is_custom: boolean };

export default function FormulaBank() {
  const { user } = useAuth();
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [showBookmarked, setShowBookmarked] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newFormula, setNewFormula] = useState({ subject: "", name: "", formula: "", variables: "", example: "" });

  useEffect(() => { loadFormulas(); loadBookmarks(); }, []);

  async function loadFormulas() {
    const { data } = await supabase.from("formula_bank").select("*").eq("user_id", user!.id).order("subject");
    setFormulas((data || []) as Formula[]);
  }

  async function loadBookmarks() {
    const { data } = await supabase.from("formula_bookmarks").select("formula_id").eq("user_id", user!.id);
    setBookmarks(new Set((data || []).map(b => b.formula_id)));
  }

  async function addFormula() {
    if (!newFormula.subject || !newFormula.name || !newFormula.formula) return;
    await supabase.from("formula_bank").insert({
      user_id: user!.id, subject: newFormula.subject, name: newFormula.name, formula: newFormula.formula,
      variables: newFormula.variables || null, example: newFormula.example || null, is_custom: true
    });
    toast.success("Formula added!"); setAddOpen(false); setNewFormula({ subject: "", name: "", formula: "", variables: "", example: "" }); loadFormulas();
  }

  async function toggleBookmark(formulaId: string) {
    if (bookmarks.has(formulaId)) {
      await supabase.from("formula_bookmarks").delete().eq("user_id", user!.id).eq("formula_id", formulaId);
      bookmarks.delete(formulaId); setBookmarks(new Set(bookmarks));
    } else {
      await supabase.from("formula_bookmarks").insert({ user_id: user!.id, formula_id: formulaId });
      setBookmarks(new Set([...bookmarks, formulaId]));
    }
  }

  const subjects = [...new Set(formulas.map(f => f.subject))];
  let filtered = formulas;
  if (subjectFilter !== "all") filtered = filtered.filter(f => f.subject === subjectFilter);
  if (showBookmarked) filtered = filtered.filter(f => bookmarks.has(f.id));
  if (search) filtered = filtered.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || f.formula.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div><h1 className="text-2xl font-bold text-foreground">Formula Bank</h1><p className="text-muted-foreground text-sm">Your subject-wise formula library</p></div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Formula</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Formula</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Subject</Label><Input value={newFormula.subject} onChange={e => setNewFormula({ ...newFormula, subject: e.target.value })} placeholder="e.g. Engineering Maths" /></div>
                <div><Label>Formula Name</Label><Input value={newFormula.name} onChange={e => setNewFormula({ ...newFormula, name: e.target.value })} placeholder="e.g. Euler's Formula" /></div>
                <div><Label>Formula</Label><Input value={newFormula.formula} onChange={e => setNewFormula({ ...newFormula, formula: e.target.value })} placeholder="e.g. e^(iθ) = cos(θ) + i·sin(θ)" /></div>
                <div><Label>Variables Explained</Label><Textarea value={newFormula.variables} onChange={e => setNewFormula({ ...newFormula, variables: e.target.value })} placeholder="θ = angle in radians" rows={2} /></div>
                <div><Label>Example</Label><Textarea value={newFormula.example} onChange={e => setNewFormula({ ...newFormula, example: e.target.value })} placeholder="e^(iπ) = -1" rows={2} /></div>
                <Button onClick={addFormula} className="w-full">Add Formula</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search formulas..." className="pl-9" />
          </div>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={showBookmarked ? "default" : "outline"} size="sm" onClick={() => setShowBookmarked(!showBookmarked)}>
            <BookmarkCheck className="w-4 h-4 mr-1" />Bookmarked
          </Button>
        </div>

        {/* Formulas */}
        {filtered.length === 0 && <Card className="p-8 text-center"><Calculator className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">No formulas found. Add your first formula!</p></Card>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(f => (
            <Card key={f.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Badge variant="outline" className="text-[10px] mb-1">{f.subject}</Badge>
                    <p className="font-semibold text-sm text-foreground">{f.name}</p>
                  </div>
                  <button onClick={() => toggleBookmark(f.id)} className="text-muted-foreground hover:text-primary">
                    {bookmarks.has(f.id) ? <BookmarkCheck className="w-5 h-5 text-primary" /> : <Bookmark className="w-5 h-5" />}
                  </button>
                </div>
                <div className="bg-muted rounded-lg p-3 mb-2 font-mono text-sm text-foreground">{f.formula}</div>
                {f.variables && <div className="text-xs text-muted-foreground mb-1"><span className="font-medium">Variables:</span> {f.variables}</div>}
                {f.example && <div className="text-xs text-muted-foreground"><span className="font-medium">Example:</span> {f.example}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
