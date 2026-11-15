import { EventEmitter } from './EventEmitter.js';

export class ThemeManager extends EventEmitter {
  constructor() {
    super();
    this.theme = 'system';
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  }

  init() {
    // Load saved theme
    const saved = localStorage.getItem('mood-companion-theme');
    if (saved) {
      this.theme = saved;
    }
    this.applyTheme();

    // Listen for system theme changes
    this.mediaQuery.addEventListener('change', () => {
      if (this.theme === 'system') {
        this.applyTheme();
      }
    });
  }

  getTheme() {
    return this.theme;
  }

  getResolvedTheme() {
    if (this.theme === 'system') {
      return this.mediaQuery.matches ? 'dark' : 'light';
    }
    return this.theme;
  }

  setTheme(theme) {
    this.theme = theme;
    localStorage.setItem('mood-companion-theme', theme);
    this.applyTheme();
    this.emit('change', { theme: this.theme });
  }

  toggleTheme() {
    const themes = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(this.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    this.setTheme(themes[nextIndex]);
  }

  applyTheme() {
    const resolved = this.getResolvedTheme();
    document.documentElement.setAttribute('data-theme', resolved);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', resolved === 'dark' ? '#1a1625' : '#faf5ff');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = resolved === 'dark' ? '#1a1625' : '#faf5ff';
      document.head.appendChild(meta);
    }
  }

  isDark() {
    return this.getResolvedTheme() === 'dark';
  }
}