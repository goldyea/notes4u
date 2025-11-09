"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import rehypeRaw from "rehype-raw";

type Note = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  is_public: boolean;
  tags: string[];
};

type Profile = {
  full_name: string | null;
  avatar_url: string | null;
};

export default function SingleNotePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [editedIsPublic, setEditedIsPublic] = useState(false);
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isNewNote = params.id === "new";

  // Step 1: Check authentication first
  useEffect(() => {
    async function getUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
      }
      
      setIsAuthChecked(true);
      
      // If creating new note and not authenticated, redirect
      if (!session && isNewNote) {
        router.push("/sign-in");
      }
    }
    getUser();
  }, [router, supabase.auth, isNewNote]);

  // Step 2: Fetch note ONLY after auth check is complete
  useEffect(() => {
    async function fetchNote() {
      // Wait for auth check to complete
      if (!isAuthChecked) return;
      
      if (isNewNote) {
        if (!user) {
          router.push("/sign-in");
          return;
        }
        setMode("edit");
        setEditedTitle("");
        setEditedContent("");
        setEditedIsPublic(false);
        setEditedTags([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch note - RLS policies will handle access control
        // Authors can ALWAYS see their notes, others can only see public notes
        const { data: noteData, error: noteError } = await supabase
          .from("notes")
          .select("*")
          .eq("id", params.id)
          .single();

        // If error, note doesn't exist or user doesn't have permission
        if (noteError) {
          console.error("Note error:", noteError);
          
          // Check if it's a permissions issue vs not found
          if (noteError.code === 'PGRST116') {
            throw new Error("Note not found");
          } else {
            throw new Error("This note is private");
          }
        }

        if (!noteData) {
          throw new Error("Note not found");
        }

        setNote(noteData);
        setEditedTitle(noteData.title);
        setEditedContent(noteData.content);
        setEditedIsPublic(noteData.is_public || false);
        setEditedTags(noteData.tags || []);

        // Fetch profile separately
        const { data: profileData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", noteData.user_id)
          .single();

        if (profileData) {
          setProfile(profileData);
        }
      } catch (error: any) {
        console.error("Error fetching note:", error);
        setError(error.message || "Failed to load note");
      } finally {
        setIsLoading(false);
      }
    }

    fetchNote();
  }, [isAuthChecked, user, params.id, isNewNote, supabase, router]);

  const isAuthor = user && note && user.id === note.user_id;

  function handleAddTag() {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !editedTags.includes(trimmedTag)) {
      setEditedTags([...editedTags, trimmedTag]);
      setTagInput("");
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setEditedTags(editedTags.filter(tag => tag !== tagToRemove));
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  }

  async function handleSave() {
    if (!user) {
      setError("You must be logged in to save notes");
      return;
    }
    
    if (!editedTitle.trim() || !editedContent.trim()) {
      setError("Title and content are required");
      return;
    }

    // Additional security check: ensure user is the author
    if (!isNewNote && !isAuthor) {
      setError("You don't have permission to edit this note");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (isNewNote) {
        const { data, error } = await supabase
          .from("notes")
          .insert([
            {
              title: editedTitle,
              content: editedContent,
              user_id: user.id,
              is_public: editedIsPublic,
              tags: editedTags,
            },
          ])
          .select()
          .single();

        if (error) {
          console.error("Insert error:", error);
          throw new Error("Failed to create note");
        }

        router.push(`/notes/${data.id}`);
      } else {
        // RLS policy will ensure only the author can update
        const { error } = await supabase
          .from("notes")
          .update({
            title: editedTitle,
            content: editedContent,
            updated_at: new Date().toISOString(),
            is_public: editedIsPublic,
            tags: editedTags,
          })
          .eq("id", params.id)
          .eq("user_id", user.id); // Extra security: ensure user is author

        if (error) {
          console.error("Update error:", error);
          throw new Error("Failed to save note");
        }

        setNote((prev) =>
          prev ? { 
            ...prev, 
            title: editedTitle, 
            content: editedContent,
            is_public: editedIsPublic,
            tags: editedTags,
          } : null
        );
        setMode("preview");
      }
    } catch (error: any) {
      console.error("Error saving note:", error);
      setError(error.message || "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!note || !user) return;

    // Security check: ensure user is the author
    if (!isAuthor) {
      setError("You don't have permission to delete this note");
      return;
    }

    const confirmed = confirm("Are you sure you want to delete this note?");
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      // RLS policy will ensure only the author can delete
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", note.id)
        .eq("user_id", user.id); // Extra security: ensure user is author

      if (error) {
        console.error("Delete error:", error);
        throw new Error("Failed to delete note");
      }

      router.push("/notes");
    } catch (error: any) {
      console.error("Error deleting note:", error);
      setError(error.message || "Failed to delete note");
      setIsDeleting(false);
    }
  }

  async function handleCopyContent() {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note.content);
      alert("Content copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
      alert("Failed to copy content");
    }
  }

  function handleShareLink() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-4"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-8"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-5/6 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !isNewNote) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 p-4 rounded"
          >
            <p className="text-red-700 dark:text-red-400">{error}</p>
            <button
              onClick={() => router.push("/notes")}
              className="mt-4 text-red-600 dark:text-red-400 underline"
            >
              Back to notes
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with actions */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center mb-8"
        >
          <button
            onClick={() => router.push("/notes")}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to notes
          </button>

          <div className="flex items-center space-x-3">
            {/* Edit/Preview toggle - Only for authors */}
            {isAuthor && !isNewNote && (
              <div className="flex items-center border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setMode("edit")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    mode === "edit"
                      ? "bg-purple-600 text-white"
                      : "bg-background text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  Edit
                </button>
                <button
                  onClick={() => setMode("preview")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    mode === "preview"
                      ? "bg-purple-600 text-white"
                      : "bg-background text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  Preview
                </button>
              </div>
            )}

            {/* Save button - Only in edit mode for authors */}
            {(mode === "edit" || isNewNote) && isAuthor && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : isNewNote ? "Create" : "Save"}
              </motion.button>
            )}

            {/* Delete button - Only for authors */}
            {!isNewNote && isAuthor && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </motion.button>
            )}

            {/* Hamburger menu - Only in preview mode */}
            {mode === "preview" && !isNewNote && (
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-700 dark:text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </motion.button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-background border border-border rounded-lg shadow-lg z-10"
                    >
                      <button
                        onClick={() => {
                          handleCopyContent();
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Copy Main Content
                      </button>
                      <button
                        onClick={() => {
                          handleShareLink();
                          setShowMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                        Share Link
                      </button>
                      <button
                        disabled
                        className="w-full text-left px-4 py-2 text-gray-400 dark:text-gray-600 cursor-not-allowed flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        Duplicate
                        <span className="ml-auto text-xs">🔒</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
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

        {/* Note content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-background border border-border rounded-2xl overflow-hidden shadow-lg"
        >
          {/* Title and Author section */}
          <div className="p-8 border-b border-border">
            {/* Only show edit controls if user is the author */}
            {(mode === "edit" && isAuthor) || isNewNote ? (
              <>
                <input
                  type="text"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  placeholder="Note title"
                  className="w-full text-4xl font-bold bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600 mb-4"
                />

                {/* Public/Private Toggle - Only for authors */}
                <div className="flex items-center space-x-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setEditedIsPublic(!editedIsPublic)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editedIsPublic ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        editedIsPublic ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {editedIsPublic ? "Public" : "Private"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {editedIsPublic
                      ? "Anyone can view this note"
                      : "Only you can view this note"}
                  </span>
                </div>

                {/* Tags Input - Only for authors */}
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-2 hover:text-red-600 dark:hover:text-red-400"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="Add tags (press Enter)"
                      className="flex-1 px-3 py-2 bg-transparent border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTag}
                      className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold text-foreground mb-4">
                  {note?.title}
                </h1>

                {/* Tags Display */}
                {note?.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}

            {!isNewNote && profile && (
              <div className="flex items-center mt-4 text-gray-600 dark:text-gray-400">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || "User"}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-purple-600 dark:text-purple-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">
                    {profile.full_name || "Anonymous"}
                  </p>
                  <p className="text-sm">
                    {note && new Date(note.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Content section */}
          <div className="p-8">
            <AnimatePresence mode="wait">
              {/* Only show edit mode if user is the author */}
              {((mode === "edit" && isAuthor) || isNewNote) ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder="Write your note in Markdown format..."
                    className="w-full min-h-[400px] bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600 resize-y font-mono text-sm"
                  />
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    💡 Tip: Use Markdown syntax for formatting (e.g., **bold**,
                    *italic*, # heading)
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="prose prose-lg dark:prose-invert max-w-none"
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSanitize, rehypeRaw]}
                  >
                    {note?.content || ""}
                  </ReactMarkdown>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}