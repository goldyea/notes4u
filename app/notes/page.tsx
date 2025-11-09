"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import NotesList from "@/components/notes/NotesList";
import NoteForm from "@/components/notes/NoteForm";
import EmptyState from "@/components/notes/EmptyState";
import { motion, AnimatePresence } from "framer-motion";

type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  is_public?: boolean;
  tags?: string[];
};

export default function NotesPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function getUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/sign-in");
        return;
      }
      setUser(session.user);
    }
    getUser();
  }, [router, supabase.auth]);

  const fetchNotes = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
      setError("Failed to load notes. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user, fetchNotes]);

  // Set up realtime subscription for notes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notes-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setNotes((prev) => [payload.new as Note, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setNotes((prev) =>
              prev.map((note) =>
                note.id === payload.new.id ? (payload.new as Note) : note
              )
            );
          } else if (payload.eventType === "DELETE") {
            setNotes((prev) =>
              prev.filter((note) => note.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, supabase]);

  async function handleAddNote(noteData: { title: string; content: string }) {
    if (!user) return;
    setError(null);

    try {
      const { error } = await supabase
        .from("notes")
        .insert([
          {
            title: noteData.title,
            content: noteData.content,
            user_id: user.id,
          },
        ]);

      if (error) throw error;

      // Don't manually add to state - realtime subscription will handle it
      setIsFormOpen(false);
    } catch (error) {
      console.error("Error adding note:", error);
      setError("Failed to create note. Please try again.");
    }
  }

  async function handleUpdateNote(updatedNote: {
    title: string;
    content: string;
    id?: string;
    is_public?: boolean;
    tags?: string[];
  }) {
    if (!updatedNote.id || !user) return;
    setError(null);

    try {
      // RLS policy will ensure only the author can update
      // Additional client-side check for security
      const { error } = await supabase
        .from("notes")
        .update({
          title: updatedNote.title,
          content: updatedNote.content,
          is_public: updatedNote.is_public,
          tags: updatedNote.tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updatedNote.id)
        .eq("user_id", user.id); // Ensure user is the author

      if (error) {
        console.error("Update error:", error);
        throw new Error("Failed to update note. You may not have permission.");
      }

      // Don't manually update state - realtime subscription will handle it
      setEditingNote(null);
    } catch (error: any) {
      console.error("Error updating note:", error);
      setError(error.message || "Failed to update note. Please try again.");
    }
  }

  async function handleDeleteNote(id: string) {
    if (!user) return;
    setError(null);

    try {
      // RLS policy will ensure only the author can delete
      // Additional client-side check for security
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Ensure user is the author

      if (error) {
        console.error("Delete error:", error);
        throw new Error("Failed to delete note. You may not have permission.");
      }

      // Don't manually update state - realtime subscription will handle it
    } catch (error: any) {
      console.error("Error deleting note:", error);
      setError(error.message || "Failed to delete note. Please try again.");
    }
  }

  function startEditing(note: Note) {
    setEditingNote(note);
    setIsFormOpen(false);
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row justify-between mb-8 items-center"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
              Your Notes
            </h1>
            <p className="text-gray-700 dark:text-gray-300 mt-1">
              {notes.length} {notes.length === 1 ? "note" : "notes"} available
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/notes/new')}
            className="mt-4 md:mt-0 bg-purple-600 hover:shadow-lg text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            New Note
          </motion.button>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded"
          >
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {editingNote && (
            <NoteForm
              key={`edit-note-${editingNote.id}`}
              onSubmit={handleUpdateNote}
              initialData={editingNote}
              onCancel={() => setEditingNote(null)}
              type="edit"
            />
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-background border border-border rounded-xl overflow-hidden h-64 animate-pulse"
              >
                <div className="p-5">
                  <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/6"></div>
                </div>
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <EmptyState onCreateNote={() => router.push('/notes/new')} />
        ) : (
          <NotesList
            notes={notes}
            onEdit={startEditing}
            onDelete={handleDeleteNote}
          />
        )}
      </div>
    </div>
  );
}