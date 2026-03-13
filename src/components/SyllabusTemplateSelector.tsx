import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Check, ChevronDown, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  SYLLABUS_TEMPLATES,
  countTemplateTopics,
  type SubjectTemplate,
  type TemplateCategory,
} from "@/lib/syllabus-templates";
import { addSubject } from "@/lib/subjects-store";
import { addTopic } from "@/lib/units-store";
import { addSubtopic } from "@/lib/subtopics-store";
import { getUnitsWithTopics } from "@/lib/units-store";
import { toast } from "sonner";

type Props = {
  educationType: string | null;
  examName?: string | null;
  existingSubjectCodes: string[];
  onSubjectsAdded: () => void;
};

export default function SyllabusTemplateSelector({ educationType, examName, existingSubjectCodes, onSubjectsAdded }: Props) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [addingSubject, setAddingSubject] = useState<string | null>(null);
  const [addedSubjects, setAddedSubjects] = useState<Set<string>>(new Set());

  if (!educationType) return null;

  // Filter templates based on education type and exam name
  let categories = SYLLABUS_TEMPLATES[educationType] || [];

  // For competitive exams, filter by exam name
  if (educationType === "competitive_exam" && examName) {
    const examMap: Record<string, string[]> = {
      JEE: ["JEE"],
      NEET: ["NEET"],
      UPSC: ["UPSC"],
      CAT: ["CAT"],
      GATE: ["GATE"],
      SSC: ["SSC"],
      Banking: ["SSC"],
    };
    const matchLabels = examMap[examName] || [];
    if (matchLabels.length > 0) {
      categories = categories.filter(c => matchLabels.some(m => c.label.includes(m)));
    }
  }

  if (categories.length === 0) return null;

  const handleAddSubject = async (template: SubjectTemplate) => {
    const key = `${template.code}-${template.name}`;
    if (addingSubject || addedSubjects.has(key)) return;

    setAddingSubject(key);
    try {
      // Create the subject (trigger auto-creates units by count)
      const subject = await addSubject(template.name, template.code, template.units.length);

      // Wait a moment for the trigger to create units
      await new Promise(r => setTimeout(r, 500));

      // Fetch the created units
      const units = await getUnitsWithTopics(subject.id);

      // Map template units to created units by index and add topics
      for (let i = 0; i < Math.min(template.units.length, units.length); i++) {
        const tplUnit = template.units[i];
        const dbUnit = units[i];

        // Rename unit if template has a name
        if (tplUnit.name !== `Unit ${i + 1}`) {
          const { supabase } = await import("@/integrations/supabase/client");
          await supabase.from("units").update({ name: tplUnit.name }).eq("id", dbUnit.id);
        }

        // Add topics
        for (const tplTopic of tplUnit.topics) {
          const topic = await addTopic(dbUnit.id, tplTopic.name, tplTopic.priority);

          // Add subtopics if any
          if (tplTopic.subtopics) {
            for (const sub of tplTopic.subtopics) {
              await addSubtopic(topic.id, sub.name, sub.difficulty);
            }
          }
        }
      }

      setAddedSubjects(prev => new Set(prev).add(key));
      toast.success(`${template.name} added with full syllabus!`);
      onSubjectsAdded();
    } catch (err: any) {
      toast.error(err.message || "Failed to add subject");
    } finally {
      setAddingSubject(null);
    }
  };

  const handleAddAll = async (category: TemplateCategory) => {
    for (const subj of category.subjects) {
      const key = `${subj.code}-${subj.name}`;
      if (addedSubjects.has(key) || existingSubjectCodes.includes(subj.code)) continue;
      await handleAddSubject(subj);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Quick-Add Syllabus Templates</h3>
      </div>

      {categories.map((cat) => {
        const isExpanded = expandedCategory === cat.label;
        const allAdded = cat.subjects.every(
          s => addedSubjects.has(`${s.code}-${s.name}`) || existingSubjectCodes.includes(s.code)
        );

        return (
          <div key={cat.label} className="glass-card overflow-hidden">
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : cat.label)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 transition-colors"
            >
              <div>
                <h4 className="font-semibold text-foreground text-sm">{cat.label}</h4>
                <p className="text-xs text-muted-foreground">{cat.description} · {cat.subjects.length} subjects</p>
              </div>
              <div className="flex items-center gap-2">
                {allAdded && <Badge variant="secondary" className="text-xs">Added</Badge>}
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-2">
                    {!allAdded && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mb-2 text-xs"
                        onClick={() => handleAddAll(cat)}
                        disabled={!!addingSubject}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add All {cat.subjects.length} Subjects
                      </Button>
                    )}

                    {cat.subjects.map((subj) => {
                      const key = `${subj.code}-${subj.name}`;
                      const isAdded = addedSubjects.has(key) || existingSubjectCodes.includes(subj.code);
                      const isAdding = addingSubject === key;
                      const topicCount = countTemplateTopics(subj);

                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{subj.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {subj.units.length} units · {topicCount} topics
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant={isAdded ? "secondary" : "default"}
                            disabled={isAdded || isAdding}
                            onClick={() => handleAddSubject(subj)}
                            className="text-xs gap-1"
                          >
                            {isAdding ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Adding...</>
                            ) : isAdded ? (
                              <><Check className="w-3 h-3" /> Added</>
                            ) : (
                              <><Plus className="w-3 h-3" /> Add</>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
}
