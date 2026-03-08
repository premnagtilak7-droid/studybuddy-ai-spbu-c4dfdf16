import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, RotateCcw, Check, X, BookOpen, Layers } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type Deck = { id: string; name: string; subject: string; topic: string | null; created_at: string };
type Flashcard = { id: string; deck_id: string; front: string; back: string; status: string; next_review_at: string; review_count: number };

export default function FlashcardMaker() {
  const { user } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [studyMode, setStudyMode] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [createDeckOpen, setCreateDeckOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [newDeck, setNewDeck] = useState({ name: "", subject: "", topic: "" });
  const [newCard, setNewCard] = useState({ front: "", back: "" });

  useEffect(() => { loadDecks(); }, []);
  useEffect(() => { if (selectedDeck) loadCards(); }, [selectedDeck]);

  async function loadDecks() {
    const { data } = await supabase.from("flashcard_decks").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setDecks((data || []) as Deck[]);
  }

  async function loadCards() {
    const { data } = await supabase.from("flashcards").select("*").eq("deck_id", selectedDeck!.id).order("created_at");
    setCards((data || []) as Flashcard[]);
  }

  async function createDeck() {
    if (!newDeck.name || !newDeck.subject) return;
    await supabase.from("flashcard_decks").insert({ user_id: user!.id, name: newDeck.name, subject: newDeck.subject, topic: newDeck.topic || null });
    toast.success("Deck created!"); setCreateDeckOpen(false); setNewDeck({ name: "", subject: "", topic: "" }); loadDecks();
  }

  async function addCard() {
    if (!newCard.front || !newCard.back || !selectedDeck) return;
    await supabase.from("flashcards").insert({ deck_id: selectedDeck.id, front: newCard.front, back: newCard.back });
    toast.success("Card added!"); setAddCardOpen(false); setNewCard({ front: "", back: "" }); loadCards();
  }

  async function markCard(status: "known" | "review") {
    const card = studyCards[currentIndex];
    if (!card) return;
    const interval = status === "known" ? (card.review_count + 1) * 2 : 0.5; // days
    const nextReview = new Date(); nextReview.setHours(nextReview.getHours() + interval * 24);
    await supabase.from("flashcards").update({ status, next_review_at: nextReview.toISOString(), review_count: card.review_count + 1 }).eq("id", card.id);
    setFlipped(false);
    if (currentIndex < studyCards.length - 1) { setCurrentIndex(currentIndex + 1); }
    else { toast.success("Session complete!"); setStudyMode(false); setCurrentIndex(0); loadCards(); }
  }

  // Study cards: due for review
  const studyCards = cards.filter(c => c.status !== "known" || new Date(c.next_review_at) <= new Date());
  const knownCount = cards.filter(c => c.status === "known").length;
  const masteryPercent = cards.length > 0 ? Math.round((knownCount / cards.length) * 100) : 0;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-foreground">Flashcard Maker</h1><p className="text-muted-foreground text-sm">Create and study flashcard decks</p></div>
          <Dialog open={createDeckOpen} onOpenChange={setCreateDeckOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Deck</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Deck</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Deck Name</Label><Input value={newDeck.name} onChange={e => setNewDeck({ ...newDeck, name: e.target.value })} placeholder="e.g. DSA Concepts" /></div>
                <div><Label>Subject</Label><Input value={newDeck.subject} onChange={e => setNewDeck({ ...newDeck, subject: e.target.value })} placeholder="e.g. Data Structures" /></div>
                <div><Label>Topic (optional)</Label><Input value={newDeck.topic} onChange={e => setNewDeck({ ...newDeck, topic: e.target.value })} /></div>
                <Button onClick={createDeck} className="w-full">Create Deck</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {studyMode && studyCards.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Card {currentIndex + 1} of {studyCards.length}</p>
              <Button variant="ghost" size="sm" onClick={() => { setStudyMode(false); setCurrentIndex(0); setFlipped(false); }}>Exit Study</Button>
            </div>
            <div className="flex justify-center" onClick={() => setFlipped(!flipped)}>
              <AnimatePresence mode="wait">
                <motion.div key={flipped ? "back" : "front"} initial={{ rotateY: 90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} exit={{ rotateY: -90, opacity: 0 }} transition={{ duration: 0.3 }}
                  className="w-full max-w-lg min-h-[250px] rounded-2xl border-2 border-border bg-card p-8 flex flex-col items-center justify-center cursor-pointer shadow-lg">
                  <p className="text-xs text-muted-foreground mb-3">{flipped ? "ANSWER" : "QUESTION"}</p>
                  <p className="text-lg font-medium text-foreground text-center">{flipped ? studyCards[currentIndex]?.back : studyCards[currentIndex]?.front}</p>
                  {!flipped && <p className="text-xs text-muted-foreground mt-4">Tap to flip</p>}
                </motion.div>
              </AnimatePresence>
            </div>
            {flipped && (
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => markCard("review")} className="border-destructive text-destructive hover:bg-destructive/10"><RotateCcw className="w-4 h-4 mr-1" />Review Again</Button>
                <Button onClick={() => markCard("known")} className="bg-success text-success-foreground hover:bg-success/90"><Check className="w-4 h-4 mr-1" />Known</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Decks List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">My Decks</h3>
              {decks.length === 0 && <p className="text-xs text-muted-foreground">No decks yet. Create one!</p>}
              {decks.map(d => (
                <button key={d.id} onClick={() => setSelectedDeck(d)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedDeck?.id === d.id ? "bg-primary/10 border-primary" : "border-border hover:bg-muted"}`}>
                  <p className="font-medium text-sm text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.subject}{d.topic ? ` · ${d.topic}` : ""}</p>
                </button>
              ))}
            </div>

            {/* Deck Content */}
            <div className="lg:col-span-2">
              {!selectedDeck ? (
                <Card className="h-64 flex items-center justify-center"><p className="text-muted-foreground">Select a deck</p></Card>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{selectedDeck.name}</h3>
                      <p className="text-xs text-muted-foreground">{cards.length} cards · {masteryPercent}% mastered</p>
                    </div>
                    <div className="flex gap-2">
                      {studyCards.length > 0 && <Button size="sm" onClick={() => { setStudyMode(true); setCurrentIndex(0); setFlipped(false); }}><BookOpen className="w-4 h-4 mr-1" />Study ({studyCards.length})</Button>}
                      <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
                        <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add Card</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Add Flashcard</DialogTitle></DialogHeader>
                          <div className="space-y-3">
                            <div><Label>Front (Question/Term)</Label><Textarea value={newCard.front} onChange={e => setNewCard({ ...newCard, front: e.target.value })} rows={3} /></div>
                            <div><Label>Back (Answer/Definition)</Label><Textarea value={newCard.back} onChange={e => setNewCard({ ...newCard, back: e.target.value })} rows={3} /></div>
                            <Button onClick={addCard} className="w-full">Add Card</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <Progress value={masteryPercent} className="h-2" />
                  <div className="space-y-2">
                    {cards.map(c => (
                      <div key={c.id} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{c.front}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.back}</p>
                        </div>
                        <Badge variant={c.status === "known" ? "default" : c.status === "review" ? "destructive" : "secondary"} className="text-[10px] ml-2">
                          {c.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
