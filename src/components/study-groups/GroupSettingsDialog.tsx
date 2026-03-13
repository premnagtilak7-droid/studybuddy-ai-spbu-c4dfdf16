import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Settings, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Group } from "./types";

interface Props {
  group: Group;
  isAdmin: boolean;
  onUpdate: () => void;
  onDelete: () => void;
}

export default function GroupSettingsDialog({ group, isAdmin, onUpdate, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description || "");
  const [privacy, setPrivacy] = useState(group.privacy || "public");
  const [maxMembers, setMaxMembers] = useState(group.max_members);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isAdmin) return null;

  async function handleSave() {
    setLoading(true);
    const { error } = await supabase.from("study_groups").update({
      name, description, privacy, max_members: maxMembers,
    } as any).eq("id", group.id);
    if (error) toast.error("Failed to update group");
    else { toast.success("Group updated"); onUpdate(); setOpen(false); }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setLoading(true);
    const { error } = await supabase.from("study_groups").delete().eq("id", group.id);
    if (error) toast.error("Failed to delete group");
    else { toast.success("Group deleted"); onDelete(); setOpen(false); }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setConfirmDelete(false); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Group Settings"><Settings className="w-4 h-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Group Settings</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Group Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this group about?" rows={2} /></div>
          <div><Label>Privacy</Label>
            <Select value={privacy} onValueChange={setPrivacy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Max Members</Label><Input type="number" value={maxMembers} onChange={e => setMaxMembers(parseInt(e.target.value) || 10)} /></div>
          <Button onClick={handleSave} disabled={loading} className="w-full">Save Changes</Button>
          <div className="border-t border-border pt-3">
            <Button variant="destructive" onClick={handleDelete} disabled={loading} className="w-full gap-2">
              <Trash2 className="w-4 h-4" />{confirmDelete ? "Confirm Delete — This cannot be undone" : "Delete Group"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
