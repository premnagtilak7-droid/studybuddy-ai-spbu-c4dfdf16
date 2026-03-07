import { MessageSquare, Upload, Sparkles } from "lucide-react";
import AppLayout from "../components/AppLayout";

export default function AISolver() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Doubt Solver</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload photos or ask questions — SPPU Expert mode</p>
        </div>

        <div className="glass-card p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl gradient-primary mx-auto flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-bold text-foreground">Coming Soon</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Enable Lovable Cloud to power the AI Doubt Solver with Gemini. Upload circuit diagrams,
            handwritten notes, and get step-by-step solutions in English, Marathi, or Hindi.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
              <Upload className="w-4 h-4" /> Photo Upload
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-secondary px-3 py-2 rounded-lg">
              <MessageSquare className="w-4 h-4" /> Chat Interface
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
