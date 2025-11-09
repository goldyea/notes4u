import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface NoteFormProps {
  onSubmit: (data: { title: string; content: string; id?: string; is_public?: boolean; tags?: string[] }) => void;
  initialData: { title: string; content: string; id?: string; is_public?: boolean; tags?: string[] };
  onCancel?: () => void;
  type: 'create' | 'edit';
}

export default function NoteForm({ onSubmit, initialData, onCancel, type }: NoteFormProps) {
  const [note, setNote] = useState({ 
    title: '', 
    content: '',
    is_public: false,
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isContentFocused, setIsContentFocused] = useState(false);
  
  useEffect(() => {
    setNote({
      title: initialData.title || '',
      content: initialData.content || '',
      is_public: initialData.is_public || false,
      tags: initialData.tags || [],
    });
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (note.title.trim() && note.content.trim()) {
      onSubmit({
        ...note,
        id: initialData.id,
      });
    }
  };

  function handleAddTag() {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !note.tags.includes(trimmedTag)) {
      setNote({ ...note, tags: [...note.tags, trimmedTag] });
      setTagInput('');
    }
  }

  function handleRemoveTag(tagToRemove: string) {
    setNote({ ...note, tags: note.tags.filter(tag => tag !== tagToRemove) });
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="mb-8"
    >
      <form onSubmit={handleSubmit} className="bg-background rounded-2xl overflow-hidden border border-border shadow-lg">
        <div className="p-8 border-b border-border">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6">
            {type === 'create' ? 'Create New Note' : 'Edit Note'}
          </h3>
          
          {/* Title Input */}
          <div className="relative mb-4">
            <input
              type="text"
              value={note.title}
              placeholder="Note title"
              onChange={(e) => setNote({ ...note, title: e.target.value })}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={() => setIsTitleFocused(false)}
              className="w-full text-4xl font-bold bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600"
              required
            />
          </div>

          {/* Public/Private Toggle */}
          <div className="flex items-center space-x-3 mb-4">
            <button
              type="button"
              onClick={() => setNote({ ...note, is_public: !note.is_public })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                note.is_public ? "bg-purple-600" : "bg-gray-300 dark:bg-gray-700"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  note.is_public ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {note.is_public ? "Public" : "Private"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {note.is_public
                ? "Anyone can view this note"
                : "Only you can view this note"}
            </span>
          </div>

          {/* Tags Input */}
          <div className="mb-4">
            <div className="flex flex-wrap gap-2 mb-2">
              {note.tags.map((tag) => (
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
        </div>

        {/* Content section */}
        <div className="p-8">
          <div className="relative">
            <textarea
              value={note.content}
              placeholder="Write your note in Markdown format..."
              onChange={(e) => setNote({ ...note, content: e.target.value })}
              onFocus={() => setIsContentFocused(true)}
              onBlur={() => setIsContentFocused(false)}
              className="w-full min-h-[400px] bg-transparent border-none outline-none focus:ring-0 placeholder-gray-400 dark:placeholder-gray-600 resize-y font-mono text-sm"
              required
            />
          </div>
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            💡 Tip: Use Markdown syntax for formatting (e.g., **bold**, *italic*, # heading)
          </div>
        </div>
        
        <div className="px-8 py-4 bg-background border-t border-border flex justify-end space-x-3">
          {onCancel && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onCancel}
              className="px-6 py-2 rounded-lg border border-border text-gray-700 dark:text-gray-300 font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </motion.button>
          )}
          
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all duration-200"
          >
            {type === 'create' ? 'Create Note' : 'Save Changes'}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}