import { useState, useEffect } from "react";
import * as React from "react";
const { useEffect, useState } = React;
import * as React from "react";
const { useEffect, useState } = React;
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";

interface ErrorNotesProps {
  systemName: string;
  errorCode: string;
  userId: string | undefined;
}

interface Note {
  id: string;
  note: string;
  created_at: string;
}

export function ErrorNotes({ systemName, errorCode, userId }: ErrorNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchNotes();
    }
  }, [systemName, errorCode, userId]);

  const fetchNotes = async () => {
    const { data, error } = await (supabase as any)
      .from("error_notes" as any)
      .select("*")
      .eq("system_name", systemName)
      .eq("error_code", errorCode)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
    } else {
      setNotes(data || []);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !userId) return;

    setLoading(true);
    const { error } = await (supabase as any).from("error_notes" as any).insert({
      system_name: systemName,
      error_code: errorCode,
      note: newNote.trim(),
      user_id: userId,
    });

    if (error) {
      toast.error("Failed to add note");
      console.error(error);
    } else {
      toast.success("Note added");
      setNewNote("");
      fetchNotes();
    }
    setLoading(false);
  };

  const deleteNote = async (noteId: string) => {
    const { error } = await (supabase as any)
      .from("error_notes" as any)
      .delete()
      .eq("id", noteId)
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to delete note");
    } else {
      toast.success("Note deleted");
      fetchNotes();
    }
  };

  if (!userId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Service Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Textarea
            placeholder="Add a service note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
          />
          <Button onClick={addNote} disabled={loading || !newNote.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Note
          </Button>
        </div>

        <div className="space-y-2">
          {notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNote(note.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
