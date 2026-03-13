import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { addExamDate } from "@/lib/exam-store";
import { useToast } from "@/hooks/use-toast";

interface QuickExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExamAdded: () => void;
}

export default function QuickExamModal({ open, onOpenChange, onExamAdded }: QuickExamModalProps) {
  const [date, setDate] = useState<Date>();
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!date || !label.trim()) {
      toast({ title: "Please fill in both fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await addExamDate(format(date, "yyyy-MM-dd"), label.trim());
      toast({ title: "Exam date added!" });
      setDate(undefined);
      setLabel("");
      onExamAdded();
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to add exam date", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Set Exam Date</DialogTitle>
          <DialogDescription>Add an upcoming exam to your schedule.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Exam Label</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. End Semester Exam"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Saving..." : "Add Exam Date"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
