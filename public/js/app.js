function app() {
  return {
    // WebSocket connection
    ws: null,
    connected: false,

    // Projects
    projects: [],
    selectedProject: null,

    // Tasks
    activeTasks: [],
    taskHistory: [],
    runningCount: 0,
    pendingCount: 0,

    // Task form
    taskPrompt: '',
    taskBudget: 1.0,
    dispatching: false,

    // New project modal
    showNewProject: false,
    newProjectName: '',
    newProjectDesc: '',
    creatingProject: false,

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
          // Move to history after a delay
          setTimeout(() => {
            this.activeTasks = this.activeTasks.filter(t => t.id !== data.task.id);
            this.taskHistory.unshift(data.task);
            if (this.taskHistory.length > 100) {
              this.taskHistory = this.taskHistory.slice(0, 100);
            }
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

    selectProject(project) {
      this.selectedProject = project;
    },

    async dispatchTask() {
      if (!this.selectedProject || !this.taskPrompt) return;

      this.dispatching = true;
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: this.selectedProject.id,
            prompt: this.taskPrompt,
            maxBudget: this.taskBudget
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to dispatch task');
        }

        // Clear form on success
        this.taskPrompt = '';
      } catch (err) {
        console.error('Failed to dispatch task:', err);
        alert('Failed to dispatch task: ' + err.message);
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
        this.selectProject(project);
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
    }
  };
}
