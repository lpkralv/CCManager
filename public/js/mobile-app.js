/**
 * Mobile app layer — extends the base app() with tab navigation and page stack.
 */
function mobileApp() {
  const base = app();

  return {
    ...base,

    // Navigation state
    activeTab: 'projects',
    navStack: [],            // stack of detail page names
    selectedLiveTask: null,  // for live output page

    // Title map for pages
    pageTitles: {
      'projects': 'Projects',
      'active': 'Active Tasks',
      'history': 'Task History',
      'more': 'More',
      'project-details': 'Project Details',
      'task-output': 'Task Output',
      'task-output-live': 'Live Output',
      'new-project': 'New Project',
      'summary': 'Projects Summary',
      'settings': 'Settings',
      'file-browser': 'Browse Files',
    },

    currentPage() {
      if (this.navStack.length > 0) {
        return this.navStack[this.navStack.length - 1];
      }
      return this.activeTab;
    },

    currentPageTitle() {
      return this.pageTitles[this.currentPage()] || 'Claude Code Manager';
    },

    switchTab(tab) {
      this.navStack = [];
      this.activeTab = tab;
    },

    navPush(page) {
      this.navStack.push(page);
    },

    navBack() {
      this.navStack.pop();
    },

    // Override createProject to navigate back instead of alert
    async createProjectMobile() {
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

        const { project } = await response.json();
        this.projects.push(project);
        this.newProjectName = '';
        this.newProjectDesc = '';
        this.selectedProjects = [project];
        this.lastSelectedIndex = this.projects.length - 1;
        this.navBack();
      } catch (err) {
        console.error('Failed to create project:', err);
        // Show inline or use a simple notification
        this.showMobileNotification('Error: ' + err.message);
      } finally {
        this.creatingProject = false;
      }
    },

    // Override saveSettings to navigate back
    async saveSettingsMobile() {
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
        this.navBack();
        await this.refreshProjects();
      } catch (err) {
        console.error('Failed to save settings:', err);
        this.showMobileNotification('Error: ' + err.message);
      } finally {
        this.savingSettings = false;
      }
    },

    // Open file browser data (without showing modal)
    async openImageBrowserData() {
      this.imageSearchQuery = '';
      this.imageSearchResults = [];
      await this.browseDirectory('');
    },

    // Simple toast-style notification
    showMobileNotification(message) {
      const toast = document.createElement('div');
      toast.className = 'mobile-toast';
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add('visible'), 10);
      setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    },

    // Override shutdownServer to skip confirm() on mobile
    async shutdownServer() {
      // Use navPush to a confirm-like UX, or just do it
      if (!confirm('Stop the server?')) return;
      try {
        await fetch('/api/shutdown', { method: 'POST' });
      } catch (err) {
        // Expected
      }
    },
  };
}
