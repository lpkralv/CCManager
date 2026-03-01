# REQ-040: Image Attachments for Task Dispatch

## Summary

Add the ability to attach images to task prompts via the dashboard. Images can be added by drag-and-drop, paste from clipboard, or by browsing/searching files on the server. This must work both from a local Mac browser (shared filesystem) AND from a remote browser such as an iPad (no shared filesystem).

## Problem

Currently the task dispatch pane only accepts a text prompt. Users often need to include screenshots, mockups, diagrams, or reference images when dispatching tasks to Claude Code. This is especially important for UI work, bug reports with visual artifacts, and design implementation tasks.

Two key constraints must be addressed:
1. **Remote browsers (iPad)**: The browser doesn't share a filesystem with the server. Dropped/pasted images must be uploaded over HTTP to the server, where they become local files that Claude Code can read.
2. **File discovery**: Users need a way to browse or search for existing image files on the server's filesystem (e.g., screenshots already saved, design assets in project directories), not just drag-and-drop.

## Architecture

### Why This Works Everywhere

All image attachment methods go through the same flow:
1. Image data arrives in the browser (drag-drop, paste, or file picker)
2. Browser uploads the image to the server via `POST /api/uploads`
3. Server saves the file to `data/uploads/<uuid>-<filename>` on disk
4. Server returns metadata including the **absolute file path** on the server
5. When the task is dispatched, the image paths are included in the request
6. The process spawner appends image path references to the prompt
7. Claude Code uses its `Read` tool to view the images during execution

This works identically whether the browser is on the same Mac mini or on a remote iPad — the uploaded file always ends up on the server's local filesystem where Claude Code can access it.

### For server-side file browsing:
1. `GET /api/files/browse` returns directory listings with image thumbnails
2. `GET /api/files/search` searches for image files by name pattern
3. `GET /api/files/thumbnail` serves image file content to the browser for preview
4. User selects an image from the browser → its server-side path is used directly (no re-upload needed)

---

## Implementation Plan

### Phase 1: Backend — Upload Endpoint

**File: `src/server/routes/uploads.ts` (new)**

Create a new route module for file uploads:

```
POST /api/uploads
- Accept: multipart/form-data
- Field name: "image" (single file) or "images" (multiple)
- Validate: file type (png, jpg, jpeg, gif, webp, svg), file size (max 10MB per file)
- Save to: data/uploads/<uuid>-<original-filename>
- Response: { id, filename, originalName, path (absolute), size, mimeType, createdAt }
- Use `multer` package for multipart parsing

GET /api/uploads/:id
- Serve the uploaded file (for preview in browser)

DELETE /api/uploads/:id
- Remove an uploaded file (cleanup)
```

**File: `src/server/routes/files.ts` (new)**

Create a route module for server-side file browsing:

```
GET /api/files/browse
- Query params: path (directory to list), projectId (optional, to start from project root)
- Returns: { directories: [...], files: [...] } with name, path, size, mimeType for images
- Security: restrict browsing to PROJECTS_ROOT and data/ directories
- Filter: only show image files (png, jpg, jpeg, gif, webp, svg, bmp, tiff)

GET /api/files/search
- Query params: q (search pattern), scope (optional: "project:<id>" or "all")
- Searches for image files matching the pattern (glob-style)
- Returns: array of { name, path, size, mimeType, projectName? }
- Use fast-glob or similar for efficient searching

GET /api/files/serve
- Query params: path (absolute path to image file)
- Security: validate path is within allowed directories
- Streams the file content with correct Content-Type
- Used for thumbnails/previews in the browser UI
```

**File: `src/server/routes/index.ts`** — register new route modules.

**Package additions**: `multer` (for multipart upload parsing), `fast-glob` (for file searching).

### Phase 2: Backend — Task Dispatch with Images

**File: `src/server/routes/tasks.ts`**

Update `CreateTaskSchema` to accept optional image paths:
```typescript
const CreateTaskSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(1),
  maxBudget: z.number().positive().optional().default(1.0),
  images: z.array(z.string()).optional(), // absolute file paths on server
});
```

Pass images through to `CreateTaskInput`.

**File: `src/models/task.ts`**

Add `images?: string[]` to `CreateTaskInput` and `Task` schemas.

**File: `src/services/process-spawner.ts`**

When images are provided, append to the prompt:
```
\n\n---
IMAGE ATTACHMENTS: The following image files have been attached to this task.
Use the Read tool to view each image before starting work.
<image_path>/absolute/path/to/image1.png</image_path>
<image_path>/absolute/path/to/image2.jpg</image_path>
```

This leverages Claude Code's built-in ability to read and understand images via its Read tool.

### Phase 3: Frontend — Drag & Drop + Paste + File Picker

**File: `public/index.html`**

Replace the simple textarea form with an enhanced dispatch area:

```html
<section class="card" x-show="hasSelection()">
  <h2>Dispatch Task</h2>
  <form @submit.prevent="dispatchTask()">
    <div class="form-group">
      <label>Project<span x-show="selectedProjects.length > 1">s</span></label>
      <input type="text" :value="getSelectedProjectNames()" disabled>
    </div>
    <div class="form-group">
      <label for="prompt">Prompt</label>
      <!-- Drop zone wraps textarea and image preview area -->
      <div class="prompt-drop-zone"
           :class="{ 'drag-over': isDraggingOver }"
           @dragover.prevent="isDraggingOver = true"
           @dragleave.prevent="isDraggingOver = false"
           @drop.prevent="handleImageDrop($event)">
        <textarea
          id="prompt"
          x-model="taskPrompt"
          rows="4"
          placeholder="Enter task prompt... (drop or paste images here)"
          @paste="handleImagePaste($event)"
          required
        ></textarea>
        <!-- Attached images preview -->
        <div class="attached-images" x-show="attachedImages.length > 0">
          <template x-for="(img, index) in attachedImages" :key="img.id">
            <div class="image-chip">
              <img :src="'/api/uploads/' + img.id" :alt="img.originalName" class="image-thumb">
              <span class="image-name" x-text="img.originalName"></span>
              <button type="button" class="btn-remove" @click="removeImage(index)">&times;</button>
            </div>
          </template>
        </div>
        <div class="drop-overlay" x-show="isDraggingOver">
          Drop images here
        </div>
      </div>
    </div>
    <div class="form-actions">
      <div class="image-actions">
        <!-- Standard file picker (works on iPad, Mac, any browser) -->
        <input type="file" id="imageFileInput" accept="image/*" multiple
               @change="handleFileSelect($event)" style="display:none">
        <button type="button" class="btn btn-small"
                @click="$refs.imageFileInput.click()">
          Attach Image
        </button>
        <!-- Browse server files button -->
        <button type="button" class="btn btn-small"
                @click="showImageBrowser = true">
          Browse Server Files
        </button>
      </div>
      <button type="submit" class="btn btn-primary" :disabled="!taskPrompt || dispatching">
        <span x-show="!dispatching">Dispatch Task</span>
        <span x-show="dispatching">Dispatching...</span>
      </button>
    </div>
  </form>
</section>
```

### Phase 4: Frontend — Image Browser Modal

**File: `public/index.html`** (add modal)

A modal dialog for browsing and searching image files on the server:

```html
<!-- Image Browser Modal -->
<div class="modal-overlay" x-show="showImageBrowser" @click.self="showImageBrowser = false">
  <div class="modal image-browser-modal">
    <div class="modal-header">
      <h3>Browse Images</h3>
      <button @click="showImageBrowser = false">&times;</button>
    </div>
    <div class="modal-body">
      <!-- Search bar -->
      <div class="image-search">
        <input type="text" x-model="imageSearchQuery"
               placeholder="Search for image files..."
               @input.debounce.300ms="searchImages()">
      </div>
      <!-- Breadcrumb path navigation -->
      <div class="image-breadcrumb" x-show="!imageSearchQuery">
        <template x-for="(part, i) in browsePath" :key="i">
          <span>
            <a href="#" @click.prevent="navigateToBrowsePath(i)" x-text="part"></a>
            <span x-show="i < browsePath.length - 1"> / </span>
          </span>
        </template>
      </div>
      <!-- Directory listing -->
      <div class="image-browser-grid" x-show="!imageSearchQuery">
        <!-- Subdirectories -->
        <template x-for="dir in browseDirectories" :key="dir.path">
          <div class="browser-item folder" @click="browseDirectory(dir.path)">
            <div class="folder-icon">📁</div>
            <div class="item-name" x-text="dir.name"></div>
          </div>
        </template>
        <!-- Image files -->
        <template x-for="file in browseFiles" :key="file.path">
          <div class="browser-item image" @click="selectBrowsedImage(file)">
            <img :src="'/api/files/serve?path=' + encodeURIComponent(file.path)"
                 class="browser-thumb" loading="lazy">
            <div class="item-name" x-text="file.name"></div>
          </div>
        </template>
      </div>
      <!-- Search results -->
      <div class="image-browser-grid" x-show="imageSearchQuery">
        <template x-for="file in imageSearchResults" :key="file.path">
          <div class="browser-item image" @click="selectBrowsedImage(file)">
            <img :src="'/api/files/serve?path=' + encodeURIComponent(file.path)"
                 class="browser-thumb" loading="lazy">
            <div class="item-name" x-text="file.name"></div>
            <div class="item-project" x-text="file.projectName || ''" x-show="file.projectName"></div>
          </div>
        </template>
        <div x-show="imageSearchResults.length === 0 && imageSearchQuery">
          No images found matching "<span x-text="imageSearchQuery"></span>"
        </div>
      </div>
    </div>
  </div>
</div>
```

### Phase 5: Frontend JavaScript — Image Handling Logic

**File: `public/js/app.js`**

Add to Alpine.js app state:
```javascript
// Image attachments
attachedImages: [],       // Array of { id, filename, originalName, path, size, mimeType }
isDraggingOver: false,
showImageBrowser: false,
imageSearchQuery: '',
imageSearchResults: [],
browseCurrentPath: '',
browseDirectories: [],
browseFiles: [],
browsePath: [],
```

Add methods:
```javascript
// Upload image file to server, returns metadata
async uploadImage(file) { ... }

// Handle drag-and-drop of images onto the prompt area
handleImageDrop(event) { ... }

// Handle paste (Ctrl/Cmd+V) of images into textarea
handleImagePaste(event) { ... }

// Handle file input <input type="file"> selection (iPad + Mac)
handleFileSelect(event) { ... }

// Remove an attached image
removeImage(index) { ... }

// Browse server directory for images
async browseDirectory(path) { ... }

// Search for images on server
async searchImages() { ... }

// Select an image from the file browser (uses server path directly, no re-upload)
selectBrowsedImage(file) { ... }

// Navigate breadcrumb
navigateToBrowsePath(index) { ... }
```

Update `dispatchTask()` to include image paths in the request body:
```javascript
body: JSON.stringify({
  projectId: project.id,
  prompt: this.taskPrompt,
  images: this.attachedImages.map(img => img.path),
})
```

Clear `attachedImages` on successful dispatch.

### Phase 6: CSS Styling

**File: `public/css/styles.css`**

Add styles for:
- `.prompt-drop-zone` — subtle dashed border, changes color on drag-over
- `.drag-over` — highlighted border to indicate drop target
- `.drop-overlay` — semi-transparent overlay with "Drop images here" text
- `.attached-images` — horizontal scroll area below textarea
- `.image-chip` — small thumbnail + filename + remove button
- `.image-thumb` — 40x40 thumbnail preview
- `.image-browser-modal` — larger modal for file browsing
- `.image-browser-grid` — CSS grid of folders and image thumbnails
- `.browser-thumb` — 100x100 thumbnail in browser
- `.image-breadcrumb` — path navigation
- All styles should match the existing dark theme

### Phase 7: Cleanup

- Add scheduled cleanup of `data/uploads/` files older than 24 hours (since they're only needed during task dispatch, and Claude Code copies/reads them immediately)
- Add `.gitignore` entry for `data/uploads/`

---

## Input Methods Summary

| Method | Mac (local) | iPad (remote) | How it works |
|--------|:-----------:|:-------------:|--------------|
| Drag & drop from desktop | ✅ | ❌ (no desktop) | Browser File API → upload to server |
| Drag & drop from another app | ✅ | ✅ (from Photos, Files) | Browser File API → upload to server |
| Paste from clipboard | ✅ | ✅ | Clipboard API → upload to server |
| "Attach Image" file picker | ✅ | ✅ | Native `<input type="file">` → upload to server |
| Browse server files | ✅ | ✅ | Server API → select path (no upload needed) |
| Search server files | ✅ | ✅ | Server API → select path (no upload needed) |

**iPad-specific notes:**
- The `<input type="file" accept="image/*">` on iPad/iOS Safari presents a picker with options: Photo Library, Take Photo, Browse Files. This is the primary way iPad users will add images.
- Drag-and-drop works on iPadOS in Split View / Slide Over (dragging from Photos or Files app).
- Paste works from any app that copies images to the clipboard.
- The server file browser lets iPad users find images already on the Mac mini (screenshots, assets, etc.) without needing to upload them.

## Dependencies to Add

- `multer` — multipart form data parsing for file uploads
- `fast-glob` — efficient file pattern searching for the file browser

## Files Changed

| File | Change |
|------|--------|
| `src/server/routes/uploads.ts` | New — upload endpoint |
| `src/server/routes/files.ts` | New — file browse/search endpoints |
| `src/server/routes/index.ts` | Modified — register new routes |
| `src/server/routes/tasks.ts` | Modified — accept images array |
| `src/models/task.ts` | Modified — add images field |
| `src/services/process-spawner.ts` | Modified — append image paths to prompt |
| `public/index.html` | Modified — drop zone, file picker, browse modal |
| `public/js/app.js` | Modified — image upload/browse/attach logic |
| `public/css/styles.css` | Modified — image attachment & browser styles |
| `.gitignore` | Modified — add data/uploads/ |
| `package.json` | Modified — add multer, fast-glob |

## Security Considerations

- File type validation (both MIME type and extension)
- File size limits (10MB per file)
- Path traversal prevention in browse/serve endpoints (resolve + startsWith check)
- Restrict browsing to PROJECTS_ROOT and data/ directories
- Sanitize uploaded filenames
- Rate limiting on upload endpoint (optional)
