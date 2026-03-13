import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Sparkles, Languages, History, Copy, Check, BookOpen,
  HelpCircle, Calculator, FunctionSquare, FileText, Loader2, X, Trash2, ChevronDown, ChevronUp,
  Camera, Upload, Image as ImageIcon,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import AppLayout from "../components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { streamChat } from "@/lib/ai-stream";
import { saveDoubt, getDoubts, deleteDoubt, type DoubtEntry } from "@/lib/doubt-store";
import { getSubjects, type UserSubject } from "@/lib/subjects-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUESTION_TYPES = [
  { value: "concept", label: "Concept Doubt", icon: HelpCircle },
  { value: "numerical", label: "Numerical Problem", icon: Calculator },
  { value: "formula", label: "Formula Help", icon: FunctionSquare },
  { value: "definition", label: "Definition", icon: FileText },
];

const LANGUAGES = [
  { value: "english", label: "EN" },
  { value: "marathi", label: "मरा" },
  { value: "hindi", label: "हिं" },
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/* ─── Copy Button ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy Answer"}
    </Button>
  );
}

/* ─── Response Card ─── */
function ResponseCard({ content, imageUrl }: { content: string; imageUrl?: string | null }) {
  const sections = content.split(/(?=^##\s)/m).filter(Boolean);

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        {imageUrl && (
          <div className="mb-3">
            <img src={imageUrl} alt="Question image" className="max-h-48 rounded-lg border border-border object-contain" />
          </div>
        )}
        {sections.length > 1 ? (
          sections.map((sec, i) => (
            <div key={i}>
              {i > 0 && <Separator className="my-3" />}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{sec}</ReactMarkdown>
              </div>
            </div>
          ))
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
        <div className="flex justify-end pt-2">
          <CopyButton text={content} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Image Upload Hook ─── */
function useImageUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFile = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are supported");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be under 2MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setUploadProgress(0);
  }, []);

  const uploadImage = useCallback(async (): Promise<string | null> => {
    if (!imageFile) return null;
    setUploading(true);
    setUploadProgress(10);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      setUploadProgress(30);

      const { error } = await supabase.storage
        .from("doubt-images")
        .upload(path, imageFile, { contentType: imageFile.type, upsert: false });

      if (error) throw error;
      setUploadProgress(80);

      const { data: urlData } = supabase.storage.from("doubt-images").getPublicUrl(path);
      setUploadProgress(100);
      return urlData.publicUrl;
    } catch (err: any) {
      toast.error(err.message || "Image upload failed");
      return null;
    } finally {
      setUploading(false);
    }
  }, [imageFile]);

  return { imageFile, imagePreview, uploading, uploadProgress, handleFile, clearImage, uploadImage };
}

/* ─── Main Component ─── */
function AISolverChat() {
  const [subjects, setSubjects] = useState<UserSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [topicInput, setTopicInput] = useState("");
  const [questionType, setQuestionType] = useState("concept");
  const [doubtText, setDoubtText] = useState("");
  const [language, setLanguage] = useState("english");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [streamingDone, setStreamingDone] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  // History state
  const [doubts, setDoubts] = useState<DoubtEntry[]>([]);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedDoubt, setExpandedDoubt] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const responseRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { imageFile, imagePreview, uploading, uploadProgress, handleFile, clearImage, uploadImage } = useImageUpload();

  useEffect(() => { getSubjects().then(setSubjects).catch(() => {}); }, []);
  useEffect(() => { loadHistory(); }, [historyFilter]);

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getDoubts(historyFilter);
      setDoubts(data);
    } catch { /* silent */ }
    setHistoryLoading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const send = async () => {
    const text = doubtText.trim();
    if (!text && !imageFile) { toast.error("Please enter your doubt or upload an image"); return; }

    setIsLoading(true);
    setResponse("");
    setStreamingDone(false);
    setCurrentImageUrl(null);

    // Upload image first if present
    let uploadedUrl: string | null = null;
    if (imageFile) {
      uploadedUrl = await uploadImage();
      if (!uploadedUrl && !text) {
        setIsLoading(false);
        return;
      }
      setCurrentImageUrl(uploadedUrl);
    }

    const subjectName = subjects.find(s => s.id === selectedSubject)?.name || "General";
    let fullQuestion = topicInput
      ? `[Subject: ${subjectName}] [Topic: ${topicInput}]\n\n${text || "Please analyze this image and help me understand the problem."}`
      : `[Subject: ${subjectName}]\n\n${text || "Please analyze this image and help me understand the problem."}`;

    if (uploadedUrl) {
      fullQuestion += `\n\n[Image attached: ${uploadedUrl}]`;
    }

    let assistantSoFar = "";
    const messages = [{ role: "user" as const, content: fullQuestion }];

    try {
      await streamChat({
        messages,
        language,
        questionType,
        subject: subjectName,
        onDelta: (chunk) => {
          assistantSoFar += chunk;
          setResponse(assistantSoFar);
        },
        onDone: async () => {
          setIsLoading(false);
          setStreamingDone(true);
          if (assistantSoFar) {
            const subId = selectedSubject && selectedSubject !== "general" ? selectedSubject : null;
            await saveDoubt(text || "Image question", assistantSoFar, uploadedUrl || undefined, subId);
            loadHistory();
          }
          clearImage();
          setTimeout(() => responseRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        },
        onError: (err) => { toast.error(err); setIsLoading(false); },
      });
    } catch {
      toast.error("Failed to connect to AI service");
      setIsLoading(false);
    }
  };

  const handleDeleteDoubt = async (id: string) => {
    try {
      await deleteDoubt(id);
      setDoubts(d => d.filter(x => x.id !== id));
      toast.success("Doubt deleted");
    } catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            AI Doubt Solver
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Powered by AI · Ask any doubt in any subject</p>
        </div>
        <div className="flex items-center gap-1">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLanguage(lang.value)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                language === lang.value
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-muted"
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Row 1: Subject + Topic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-9 text-sm">
                  <BookOpen className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Topic (optional)</label>
              <Input
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                placeholder="e.g. Star-Delta Transformation"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Row 2: Question Type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Question Type</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {QUESTION_TYPES.map(qt => {
                const Icon = qt.icon;
                const active = questionType === qt.value;
                return (
                  <button
                    key={qt.value}
                    onClick={() => setQuestionType(qt.value)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg text-xs font-medium transition-all border ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {qt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Doubt text */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative rounded-lg transition-all ${isDragging ? "ring-2 ring-primary ring-offset-2" : ""}`}
          >
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Your Doubt</label>
            <Textarea
              value={doubtText}
              onChange={e => setDoubtText(e.target.value)}
              placeholder="Type your doubt here... or drag & drop an image"
              className="min-h-[120px] text-sm"
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }}
            />
            {isDragging && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg border-2 border-dashed border-primary">
                <div className="text-center">
                  <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium text-primary">Drop image here</p>
                </div>
              </div>
            )}
          </div>

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Upload preview" className="max-h-32 rounded-lg border border-border object-contain" />
              <button
                onClick={clearImage}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
              >
                <X className="w-3 h-3" />
              </button>
              {uploading && (
                <div className="absolute bottom-0 left-0 right-0 p-1">
                  <Progress value={uploadProgress} className="h-1.5" />
                </div>
              )}
            </div>
          )}

          {/* Send button row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Camera className="w-4 h-4" />
                Upload Image
              </Button>
              <p className="text-[10px] text-muted-foreground">Ctrl+Enter to send</p>
            </div>
            <Button onClick={send} disabled={isLoading || (!doubtText.trim() && !imageFile)} className="gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isLoading ? "Thinking..." : "Ask Gemini"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Streaming Response */}
      {(response || isLoading) && (
        <div ref={responseRef}>
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Response
            {isLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          </h3>
          {response ? (
            <ResponseCard content={response} imageUrl={currentImageUrl} />
          ) : (
            <Card>
              <CardContent className="p-6 flex items-center justify-center">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Doubt History */}
      <div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors w-full"
        >
          <History className="w-4 h-4" />
          Doubt History ({doubts.length})
          {showHistory ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
        </button>

        {showHistory && (
          <div className="mt-3 space-y-3">
            <Select value={historyFilter} onValueChange={setHistoryFilter}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {historyLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : doubts.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No doubts found</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2 pr-2">
                  {doubts.map((d) => {
                    const isExpanded = expandedDoubt === d.id;
                    const subjectMatch = subjects.find(s => s.id === d.subject_id);
                    return (
                      <Card key={d.id} className="overflow-hidden">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              onClick={() => setExpandedDoubt(isExpanded ? null : d.id)}
                              className="flex-1 text-left"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {subjectMatch && (
                                  <Badge variant="secondary" className="text-[10px] h-5">{subjectMatch.name}</Badge>
                                )}
                                {d.image_url && <ImageIcon className="w-3 h-3 text-muted-foreground" />}
                                <span className="text-[10px] text-muted-foreground">
                                  {new Date(d.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-foreground line-clamp-2">{d.question}</p>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); handleDeleteDoubt(d.id); }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <ResponseCard content={d.answer} imageUrl={d.image_url} />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AISolver() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto pb-8">
        <AISolverChat />
      </div>
    </AppLayout>
  );
}
