-- Enable RLS on notes table
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view public notes" ON notes;
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;

-- Policy 1: Anyone can view public notes (including non-authenticated users)
CREATE POLICY "Users can view public notes"
ON notes FOR SELECT
USING (is_public = true);

-- Policy 2: Users can view their own notes regardless of public/private status
CREATE POLICY "Users can view their own notes"
ON notes FOR SELECT
USING (auth.uid() = user_id);

-- Policy 3: Authenticated users can create notes
CREATE POLICY "Users can create their own notes"
ON notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can only update their own notes
CREATE POLICY "Users can update their own notes"
ON notes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 5: Users can only delete their own notes
CREATE POLICY "Users can delete their own notes"
ON notes FOR DELETE
USING (auth.uid() = user_id);
