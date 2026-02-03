function app() {
  return {
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

    // New project modal
    showNewProject: false,
    newProjectName: '',
    newProjectDesc: '',
    creatingProject: false,

    // Project details modal
    showProjectDetails: false,
    projectDetails: null,
    loadingDetails: false,

    async init() {
      await this.loadProjects();
      await this.loadTaskHistory();
      this.connectWebSocket();
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

    connectWebSocket() {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connected = true;
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
      console.log('WS message:', data);

      if (data.type === 'initial') {
        this.activeTasks = data.tasks || [];
        this.updateCounts();
        return;
      }

      switch (data.type) {
        case 'task:created':
          this.activeTasks.push(data.task);
          break;

        case 'task:started':
          this.updateTask(data.task);
          break;

        case 'task:output':
          const task = this.activeTasks.find(t => t.id === data.taskId);
          if (task) {
            task.output = (task.output || '') + data.output;
          }
          break;

        case 'task:completed':
        case 'task:failed':
        case 'task:cancelled':
          this.updateTask(data.task);
          // Move to history after a delay, then update counts again
          setTimeout(() => {
            this.activeTasks = this.activeTasks.filter(t => t.id !== data.task.id);
            this.taskHistory.unshift(data.task);
            if (this.taskHistory.length > 100) {
              this.taskHistory = this.taskHistory.slice(0, 100);
            }
            this.updateCounts();
          }, 3000);
          break;
      }

      this.updateCounts();
    },

    updateTask(updatedTask) {
      const index = this.activeTasks.findIndex(t => t.id === updatedTask.id);
      if (index !== -1) {
        // Preserve output if not in update
        const existingOutput = this.activeTasks[index].output;
        this.activeTasks[index] = { ...updatedTask, output: updatedTask.output || existingOutput };
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
      try {
        // Dispatch to all selected projects in parallel
        const dispatchPromises = this.selectedProjects.map(project =>
          fetch('/api/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              prompt: this.taskPrompt
            })
          }).then(async response => {
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to dispatch task');
            }
            return { project: project.name, success: true };
          }).catch(err => {
            return { project: project.name, success: false, error: err.message };
          })
        );

        const results = await Promise.allSettled(dispatchPromises);
        const failures = results
          .map(r => r.value)
          .filter(r => r && !r.success);

        if (failures.length > 0) {
          const failedProjects = failures.map(f => `${f.project}: ${f.error}`).join('\n');
          alert(`Some tasks failed to dispatch:\n${failedProjects}`);
        }

        // Clear form on success (even partial)
        this.taskPrompt = '';
      } catch (err) {
        console.error('Failed to dispatch tasks:', err);
        alert('Failed to dispatch tasks: ' + err.message);
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
        alert('Failed to cancel task: ' + err.message);
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

        const project = await response.json();
        this.projects.push(project);
        this.showNewProject = false;
        this.newProjectName = '';
        this.newProjectDesc = '';
        // Select the newly created project
        this.selectedProjects = [project];
        this.lastSelectedIndex = this.projects.length - 1;
      } catch (err) {
        console.error('Failed to create project:', err);
        alert('Failed to create project: ' + err.message);
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
      return date.toLocaleTimeString();
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
        alert('Failed to load project details: ' + err.message);
        this.showProjectDetails = false;
      } finally {
        this.loadingDetails = false;
      }
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
