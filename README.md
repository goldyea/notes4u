# ⚡ NoteDex: Your Lightning-Fast, Markdown-Powered Notebook

## 📝 Project Overview

NoteDex is a modern, full-stack note-taking application built for speed, security, and developer efficiency. It leverages Markdown for content creation, offering a clean separation between raw editing and professional viewing. It features robust **Public/Private access control** powered by **Supabase Row-Level Security (RLS)**, giving users full control over who can view their notes.

## 🛠️ Technology Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | **Next.js (App Router)** | High-performance React framework with Server Components for security. |
| **Backend/DB** | **Supabase** | Backend-as-a-Service (BaaS) providing PostgreSQL, Auth, and RLS. |
| **Styling** | **Tailwind CSS** | Utility-first CSS framework for rapid and responsive UI development. |
| **Content** | **Markdown** | Used for creating and storing all note body content. |

## ✨ Key Features Implemented

The following core features are driven by this stack and are fully operational:

### 1. Robust Note Access Control (Supabase RLS)

Security is managed at the database level to prevent bruteforcing and unauthorized access:

* **Private Notes:** Secured via **Supabase Row-Level Security (RLS)**. Only the note's author can view them at the `/notes/{id}` route. Unauthorized access is denied at the database query layer.
* **Public Notes:** The RLS policy allows anyone to read the note. This status is set by the author via a simple toggle in Edit Mode.
* **Editing Security:** All write and update operations are strictly limited to the `author_id` via RLS policies and server-side checks.

### 2. Dedicated Single Note View (`/notes/{id}`)

A focused workspace optimized for the user experience.

* **Mode Toggling:** Easy switching between **Edit Mode** (raw Markdown input, shows Public/Private toggle) and **Preview Mode** (professionally rendered HTML).
* **Routing:** The application uses Next.js's dynamic routing (`/app/notes/[id]/page.tsx`) for a seamless page transition.

### 3. Markdown Creation & Editing

All content is captured using Markdown, which is then rendered on the client-side for immediate visual feedback.
