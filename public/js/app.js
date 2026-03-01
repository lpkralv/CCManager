function app() {
  return {
    // App version
    appVersion: null,

    // WebSocket connection
    ws: null,
    connected: false,

    // Projects
    projects: [],
    selectedProjects: [],
    lastSelectedIndex: null,

    // Tasks
    activeTasks: [],
    taskHistory: [],
    runningCount: 0,
    pendingCount: 0,

    // Task form
    taskPrompt: '',
    dispatching: false,

    // Image attachments
    attachedImages: [],
    isDraggingOver: false,
    uploadingImage: false,

    // Image browser modal
    showImageBrowser: false,
    imageSearchQuery: '',
    imageSearchResults: [],
    browseCurrentPath: '',
    browseDirectories: [],
    browseFiles: [],
    browsePath: [],

    // Projects summary
    projectsSummary: [],
    loadingSummary: false,
    showSummary: false,

    // New project modal
    showNewProject: false,
    newProjectName: '',
    newProjectDesc: '',
    creatingProject: false,

    // Project details modal
    showProjectDetails: false,
    projectDetails: null,
    loadingDetails: false,

    // Task output modal
    showTaskOutput: false,
    selectedTaskOutput: null,

    // Settings
    showSettings: false,
    loadingSettings: false,
    savingSettings: false,
    needsSetup: false,
    settingsForm: { projectsRoot: '' },
    settingsSource: 'none',
    inferredProjectsRoot: null,

    async init() {
      await Promise.all([
        this.loadProjects(),
        this.loadTaskHistory(),
        this.loadSettings(),
        this.loadVersion(),
      ]);
      // Recalculate needsSetup after both settings and projects are loaded
      this.recalcNeedsSetup();
      this.connectWebSocket();

      // Poll for project changes every 30 seconds to reflect disk changes
      setInterval(() => this.refreshProjects(), 30000);
    },

    recalcNeedsSetup() {
      if (this.settingsSource !== 'none') {
        // Explicitly configured via settings file or env var
        this.needsSetup = false;
      } else if (this.inferredProjectsRoot || this.projects.length > 0) {
        // Not explicitly configured, but projects exist (inferred root available)
        this.needsSetup = false;
      } else {
        // Truly unconfigured: no settings, no projects
        this.needsSetup = true;
      }
    },

    async refreshProjects() {
      const promises = [this.loadProjects()];
      if (this.showSummary) {
        promises.push(this.loadProjectsSummary());
      }
      await Promise.all(promises);
    },

    async loadProjects() {
      try {
        const response = await fetch('/api/projects');
        this.projects = await response.json();
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    },

    async loadTaskHistory() {
      try {
        const response = await fetch('/api/tasks/history');
        this.taskHistory = await response.json();
        this.taskHistory.sort((a, b) =>
          new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt)
        );
      } catch (err) {
        console.error('Failed to load task history:', err);
      }
    },

    async loadProjectsSummary() {
      // Save scroll position before updating data
      const scrollContainer = document.querySelector('.summary-table-wrapper');
      const savedScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
      const savedScrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;

      // Only show loading indicator on initial load (no data yet)
      const isRefresh = this.projectsSummary.length > 0;
      if (!isRefresh) {
        this.loadingSummary = true;
      }
      try {
        const response = await fetch('/api/projects/summary');
        this.projectsSummary = await response.json();
      } catch (err) {
        console.error('Failed to load projects summary:', err);
      } finally {
        this.loadingSummary = false;

        // Restore scroll position after Alpine.js re-renders
        if (savedScrollTop || savedScrollLeft) {
          this.$nextTick(() => {
            const container = document.querySelector('.summary-table-wrapper');
            if (container) {
              container.scrollTop = savedScrollTop;
              container.scrollLeft = savedScrollLeft;
            }
          });
        }
      }
    },

    formatRelativeDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now - date;
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHr = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHr / 24);

      if (diffSec < 60) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHr < 24) return `${diffHr}h ago`;
      if (diffDay < 7) return `${diffDay}d ago`;
      if (diffDay < 30) return `${Math.floor(diffDay / 7)}w ago`;
      return date.toLocaleDateString();
    },

    connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connected = true;
        // Reload history on reconnect to catch any completions missed during disconnect
        this.loadTaskHistory();
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        // Reconnect after 3 seconds
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };
    },

    handleWebSocketMessage(data) {
      console.log('WS message:', data.type, data);

      if (data.type === 'initial') {
        const incomingTasks = data.tasks || [];
        console.log(`Initial state: ${incomingTasks.length} active tasks from server, ${this.activeTasks.length} already tracked`);

        if (this.activeTasks.length === 0) {
          // Replace the array so Alpine.js detects a full reactive update
          this.activeTasks = [...incomingTasks];
        } else {
          // Merge: keep existing, add tasks from initial that aren't already present (by ID)
          const existingIds = new Set(this.activeTasks.map(t => t.id));
          const newTasks = incomingTasks.filter(t => !existingIds.has(t.id));
          if (newTasks.length > 0) {
            console.log(`Merging ${newTasks.length} new tasks from initial state`);
            this.activeTasks = [...this.activeTasks, ...newTasks];
          }
        }
        console.log(`Active tasks after merge: ${this.activeTasks.length}`);
        this.updateCounts();
        return;
      }

      switch (data.type) {
        case 'task:created':
          console.log(`Task created: ${data.task?.id} for project ${data.task?.projectId}`);
          // Avoid duplicate if already present (e.g. from initial state)
          if (!this.activeTasks.some(t => t.id === data.task.id)) {
            this.activeTasks = [...this.activeTasks, data.task];
          }
          console.log(`Active tasks now: ${this.activeTasks.length}`);
          break;

        case 'task:started':
          this.updateTaskInPlace(data.task);
          break;

        case 'task:output': {
          // Mutate existing task in-place — avoids replacing the array on every
          // output chunk, which caused Alpine.js to lose track of other task-card
          // DOM nodes and leave them empty/invisible.
          const target = this.activeTasks.find(t => t.id === data.taskId);
          if (target) {
            target.output = (target.output || '') + data.output;
          }
          // Auto-scroll active task output to bottom
          this.$nextTick(() => {
            document.querySelectorAll('.task-output').forEach(el => {
              el.scrollTop = el.scrollHeight;
            });
          });
          break;
        }

        case 'task:retrying':
          // Task is being retried (e.g. after max turns exceeded) - update in place
          this.updateTaskInPlace(data.task);
          break;

        case 'task:completed':
        case 'task:failed':
        case 'task:cancelled':
          this.updateTaskInPlace(data.task);
          // Refresh project details if modal is open for this project
          if (this.showProjectDetails && this.projectDetails?.project?.id === data.task.projectId) {
            this.loadProjectDetails(data.task.projectId);
          }
          // Refresh projects list and summary since task completion can change git status
          if (data.type === 'task:completed' || data.type === 'task:failed') {
            this.refreshProjects();
          }
          // Move to history after a delay, then update counts again
          const taskId = data.task.id;
          setTimeout(() => {
            // Use the live activeTasks entry (has accumulated output) instead of the raw event data
            const finishedTask = this.activeTasks.find(t => t.id === taskId) || data.task;
            this.activeTasks = this.activeTasks.filter(t => t.id !== taskId);
            // Only add if not already present (e.g. added by loadTaskHistory on reconnect)
            if (!this.taskHistory.some(t => t.id === taskId)) {
              this.taskHistory = [finishedTask, ...this.taskHistory.slice(0, 99)];
            }
            this.updateCounts();
          }, 3000);
          break;
      }

      this.updateCounts();
    },

    updateTaskInPlace(updatedTask) {
      // Mutate the existing task object in-place so Alpine.js keeps its DOM
      // node stable.  This avoids replacing the whole array (which previously
      // caused only the first task to render while other slots stayed blank).
      const existing = this.activeTasks.find(t => t.id === updatedTask.id);
      if (existing) {
        // Preserve accumulated output if the update doesn't carry it
        const preservedOutput = existing.output;
        Object.assign(existing, updatedTask);
        if (!updatedTask.output && preservedOutput) {
          existing.output = preservedOutput;
        }
      }
    },

    updateCounts() {
      this.runningCount = this.activeTasks.filter(t => t.status === 'running').length;
      this.pendingCount = this.activeTasks.filter(t => t.status === 'pending').length;
    },

    handleProjectClick(project, event) {
      const currentIndex = this.projects.findIndex(p => p.id === project.id);

      if (event.shiftKey && this.lastSelectedIndex !== null) {
        // SHIFT+click: Range selection
        const start = Math.min(this.lastSelectedIndex, currentIndex);
        const end = Math.max(this.lastSelectedIndex, currentIndex);
        const rangeProjects = this.projects.slice(start, end + 1);
        for (const p of rangeProjects) {
          if (!this.selectedProjects.find(sp => sp.id === p.id)) {
            this.selectedProjects.push(p);
          }
        }
      } else if (event.metaKey || event.ctrlKey) {
        // CMD/CTRL+click: Toggle selection
        const existingIndex = this.selectedProjects.findIndex(sp => sp.id === project.id);
        if (existingIndex !== -1) {
          this.selectedProjects.splice(existingIndex, 1);
        } else {
          this.selectedProjects.push(project);
        }
        this.lastSelectedIndex = currentIndex;
      } else {
        // Plain click: Clear and select single
        this.selectedProjects = [project];
        this.lastSelectedIndex = currentIndex;
      }
    },

    isProjectSelected(project) {
      return this.selectedProjects.some(p => p.id === project.id);
    },

    getSelectedProjectNames() {
      if (this.selectedProjects.length === 0) return '';
      if (this.selectedProjects.length === 1) return this.selectedProjects[0].name;
      if (this.selectedProjects.length <= 3) {
        return this.selectedProjects.map(p => p.name).join(', ');
      }
      return `${this.selectedProjects.length} projects selected`;
    },

    hasSelection() {
      return this.selectedProjects.length > 0;
    },

    async dispatchTask() {
      if (!this.hasSelection() || !this.taskPrompt) return;

      this.dispatching = true;
      const projectCount = this.selectedProjects.length;
      console.log(`Dispatching to ${projectCount} projects:`, this.selectedProjects.map(p => p.name));

      try {
        // Dispatch to all selected projects in parallel
        const dispatchPromises = this.selectedProjects.map(project => {
          console.log(`Creating task for project: ${project.name} (${project.id})`);
          return fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              prompt: this.taskPrompt,
              images: this.attachedImages.length > 0
                ? this.attachedImages.map(img => img.path)
                : undefined
            })
          }).then(async response => {
            console.log(`Response for ${project.name}: ${response.status}`);
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to dispatch task');
            }
            const task = await response.json();
            console.log(`Task created for ${project.name}: ${task.id}`);
            return { project: project.name, success: true, taskId: task.id };
          }).catch(err => {
            console.error(`Failed to create task for ${project.name}:`, err);
            return { project: project.name, success: false, error: err.message };
          });
        });

        const results = await Promise.allSettled(dispatchPromises);
        console.log('Dispatch results:', results);

        const successes = results.filter(r => r.status === 'fulfilled' && r.value?.success);
        const failures = results
          .map(r => r.status === 'fulfilled' ? r.value : { project: 'unknown', success: false, error: r.reason?.message || 'Unknown error' })
          .filter(r => r && !r.success);

        console.log(`Dispatch complete: ${successes.length} succeeded, ${failures.length} failed`);

        if (failures.length > 0) {
          const failedProjects = failures.map(f => `${f.project}: ${f.error}`).join('\n');
          alert(`Task Dispatch Failed:\n${failedProjects}`);
        }

        // Clear form on success (even partial)
        this.taskPrompt = '';
        this.attachedImages = [];
      } catch (err) {
        console.error('Failed to dispatch tasks:', err);
        alert('Task Dispatch Failed: ' + err.message);
      } finally {
        this.dispatching = false;
      }
    },

    async cancelTask(taskId) {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to cancel task');
        }
      } catch (err) {
        console.error('Failed to cancel task:', err);
        alert('Cancel Task Failed: ' + err.message);
      }
    },

    viewTaskOutput(task) {
      this.selectedTaskOutput = task;
      this.showTaskOutput = true;
    },

    async dispatchFixTask(task) {
      const projectName = this.getProjectName(task.projectId);
      let prompt = `Fix the following failed task:\n\nProject: ${projectName}\nOriginal prompt: ${task.prompt}`;
      if (task.error) {
        prompt += `\n\nError:\n${task.error}`;
      }
      if (task.output) {
        prompt += `\n\nOutput (if any):\n${task.output}`;
      }

      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: 'claude-code-manager',
            prompt: prompt
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to dispatch fix task');
        }

        const newTask = await response.json();
        console.log(`Fix task dispatched: ${newTask.id}`);
        // Brief visual feedback
        alert(`Fix task dispatched for "${projectName}" (Task ID: ${newTask.id})`);
      } catch (err) {
        console.error('Failed to dispatch fix task:', err);
        alert('Retry Task Failed: ' + err.message);
      }
    },

    async createProject() {
      if (!this.newProjectName || !this.newProjectDesc) return;

      this.creatingProject = true;
      try {
        const response = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: this.newProjectName,
            description: this.newProjectDesc
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create project');
        }

        const { project, initWarning } = await response.json();
        this.projects.push(project);
        this.showNewProject = false;
        this.newProjectName = '';
        this.newProjectDesc = '';
        // Select the newly created project
        this.selectedProjects = [project];
        this.lastSelectedIndex = this.projects.length - 1;

        if (initWarning) {
          alert(`Project "${project.name}" created successfully.\n\nNote: /init could not run automatically:\n${initWarning}\n\nYou can run /init manually by dispatching a task to this project.`);
        } else {
          alert(`Project "${project.name}" created successfully.`);
        }
      } catch (err) {
        console.error('Failed to create project:', err);
        alert('New Project Failed: ' + err.message);
      } finally {
        this.creatingProject = false;
      }
    },

    getProjectName(projectId) {
      const project = this.projects.find(p => p.id === projectId);
      return project?.name || projectId;
    },

    formatTime(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + date.toLocaleTimeString();
    },

    formatDuration(ms) {
      if (!ms) return '';
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      return `${(ms / 60000).toFixed(1)}m`;
    },

    truncate(str, maxLength) {
      if (!str) return '';
      if (str.length <= maxLength) return str;
      return str.substring(0, maxLength) + '...';
    },

    formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },

    async loadProjectDetails(projectId) {
      this.loadingDetails = true;
      this.showProjectDetails = true;
      try {
        const response = await fetch(`/api/projects/${projectId}/details`);
        if (!response.ok) {
          throw new Error('Failed to load project details');
        }
        this.projectDetails = await response.json();
      } catch (err) {
        console.error('Failed to load project details:', err);
        alert('Load Project Details Failed: ' + err.message);
        this.showProjectDetails = false;
      } finally {
        this.loadingDetails = false;
      }
    },

    async loadVersion() {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        this.appVersion = data.version || null;
      } catch (err) {
        console.error('Failed to load version:', err);
      }
    },

    async loadSettings() {
      this.loadingSettings = true;
      try {
        const response = await fetch('/api/settings');
        const data = await response.json();
        this.inferredProjectsRoot = data.inferredProjectsRoot || null;
        this.settingsForm.projectsRoot = data.effectiveProjectsRoot || data.settings?.projectsRoot || data.inferredProjectsRoot || '';
        this.settingsSource = data.projectsRootSource || 'none';
        // Initial needsSetup based on settings alone; recalcNeedsSetup() in init() refines this
        this.needsSetup = data.projectsRootSource === 'none' && !data.inferredProjectsRoot;
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        this.loadingSettings = false;
      }
    },

    async saveSettings() {
      if (!this.settingsForm.projectsRoot) return;

      this.savingSettings = true;
      try {
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectsRoot: this.settingsForm.projectsRoot
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save settings');
        }

        const data = await response.json();
        this.settingsSource = data.projectsRootSource || 'settings';
        this.needsSetup = false;
        this.showSettings = false;

        // Reload projects since the root may have changed
        await this.refreshProjects();
      } catch (err) {
        console.error('Failed to save settings:', err);
        alert('Save Settings Failed: ' + err.message);
      } finally {
        this.savingSettings = false;
      }
    },

    // === Image Attachment Methods ===

    async uploadImage(file) {
      const formData = new FormData();
      formData.append('images', file);

      try {
        const response = await fetch('/api/uploads', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        const results = await response.json();
        return results[0]; // Single file upload returns array
      } catch (err) {
        console.error('Image upload failed:', err);
        alert('Image Upload Failed: ' + err.message);
        return null;
      }
    },

    async handleImageDrop(event) {
      this.isDraggingOver = false;
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
        if (!file.type.startsWith('image/')) continue;
        const result = await this.uploadImage(file);
        if (result) {
          this.attachedImages.push({
            ...result,
            previewUrl: '/api/uploads/' + result.filename
          });
        }
      }
    },

    async handleImagePaste(event) {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (!item.type.startsWith('image/')) continue;
        event.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        const result = await this.uploadImage(file);
        if (result) {
          this.attachedImages.push({
            ...result,
            previewUrl: '/api/uploads/' + result.filename
          });
        }
      }
    },

    async handleFileSelect(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      for (const file of files) {
        const result = await this.uploadImage(file);
        if (result) {
          this.attachedImages.push({
            ...result,
            previewUrl: '/api/uploads/' + result.filename
          });
        }
      }

      // Reset input so same file can be selected again
      event.target.value = '';
    },

    removeImage(index) {
      this.attachedImages.splice(index, 1);
    },

    // === Image Browser Methods ===

    async openImageBrowser() {
      this.showImageBrowser = true;
      this.imageSearchQuery = '';
      this.imageSearchResults = [];
      // Start browsing from projects root
      await this.browseDirectory('');
    },

    async browseDirectory(dirPath) {
      try {
        const url = dirPath
          ? `/api/files/browse?path=${encodeURIComponent(dirPath)}`
          : '/api/files/browse';
        const response = await fetch(url);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Browse failed');
        }

        const data = await response.json();
        this.browseDirectories = data.directories || [];
        this.browseFiles = data.files || [];
        this.browseCurrentPath = data.currentPath || '';

        // Build breadcrumb path
        this.buildBreadcrumb(data.currentPath);
      } catch (err) {
        console.error('Browse directory failed:', err);
      }
    },

    buildBreadcrumb(fullPath) {
      if (!fullPath) {
        this.browsePath = [{ name: 'Root', path: '' }];
        return;
      }

      const parts = fullPath.split('/').filter(Boolean);
      this.browsePath = [];
      let accumulated = '';
      for (const part of parts) {
        accumulated += '/' + part;
        this.browsePath.push({ name: part, path: accumulated });
      }
    },

    navigateToBrowsePath(index) {
      if (index < 0 || index >= this.browsePath.length) return;
      const target = this.browsePath[index];
      this.browseDirectory(target.path);
    },

    async searchImages() {
      if (!this.imageSearchQuery || this.imageSearchQuery.length < 2) {
        this.imageSearchResults = [];
        return;
      }

      try {
        const response = await fetch(`/api/files/search?q=${encodeURIComponent(this.imageSearchQuery)}`);
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Search failed');
        }

        this.imageSearchResults = await response.json();
      } catch (err) {
        console.error('Image search failed:', err);
        this.imageSearchResults = [];
      }
    },

    selectBrowsedImage(file) {
      // Backward compat — delegate to selectBrowsedFile
      this.selectBrowsedFile(file);
    },

    selectBrowsedFile(file) {
      // Server file — use its path directly (no re-upload needed)
      // Check if already attached
      if (this.attachedImages.some(img => img.path === file.path)) {
        return; // Already attached
      }

      this.attachedImages.push({
        id: null,
        filename: file.name,
        originalName: file.name,
        name: file.name,
        path: file.path,
        size: file.size,
        mimeType: file.mimeType,
        previewUrl: this.isImageMimeType(file.mimeType)
          ? '/api/files/serve?path=' + encodeURIComponent(file.path)
          : null
      });

      this.showImageBrowser = false;
    },

    isImageMimeType(mimeType) {
      if (!mimeType) return true; // Backward compat: uploaded images may lack mimeType
      return mimeType.startsWith('image/');
    },

    getFileIcon(filename) {
      if (!filename) return '\u{1F4C4}';
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const iconMap = {
        md: '\u{1F4DD}', txt: '\u{1F4DD}', log: '\u{1F4DD}',
        json: '{ }', yaml: 'YML', yml: 'YML', toml: 'TML',
        ts: 'TS', tsx: 'TSX', js: 'JS', jsx: 'JSX',
        py: 'PY', sh: 'SH',
        html: '</>',  css: 'CSS', xml: 'XML', svg: 'SVG',
        pdf: 'PDF', csv: 'CSV',
        zip: '\u{1F4E6}', gz: '\u{1F4E6}', tar: '\u{1F4E6}',
        env: 'ENV', cfg: 'CFG', ini: 'INI',
      };
      return iconMap[ext] || '\u{1F4C4}';
    },

    downloadFile(file) {
      const a = document.createElement('a');
      a.href = '/api/files/download?path=' + encodeURIComponent(file.path);
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },

    async shutdownServer() {
      if (!confirm('Stop the server? You will need to restart it manually.')) return;
      try {
        await fetch('/api/shutdown', { method: 'POST' });
        // Server will shut down, connection will be lost
      } catch (err) {
        // Expected - server is shutting down
      }
    }
  };
}
