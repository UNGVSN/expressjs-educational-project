/**
 * Sample JavaScript file for static serving demonstration
 */

(function() {
  'use strict';

  // Wait for DOM
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    console.log('Static file serving demo loaded!');

    // Display load time
    displayLoadInfo();

    // Setup event listeners
    setupEventListeners();
  }

  function displayLoadInfo() {
    const info = document.getElementById('load-info');
    if (!info) return;

    const loadTime = performance.now().toFixed(2);
    info.innerHTML = `
      <p><strong>Page Info:</strong></p>
      <ul>
        <li>Load time: ${loadTime}ms</li>
        <li>User Agent: ${navigator.userAgent.slice(0, 50)}...</li>
        <li>URL: ${window.location.href}</li>
      </ul>
    `;
  }

  function setupEventListeners() {
    // File info button
    const fileInfoBtn = document.getElementById('file-info-btn');
    if (fileInfoBtn) {
      fileInfoBtn.addEventListener('click', fetchFileInfo);
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', toggleTheme);
    }
  }

  async function fetchFileInfo() {
    try {
      const response = await fetch('/api/files');
      const data = await response.json();

      const output = document.getElementById('file-info-output');
      if (output) {
        output.innerHTML = `
          <pre><code>${JSON.stringify(data, null, 2)}</code></pre>
        `;
      }
    } catch (err) {
      console.error('Error fetching file info:', err);
    }
  }

  function toggleTheme() {
    document.body.classList.toggle('dark-theme');
  }

  // Expose for console access
  window.appDemo = {
    version: '1.0.0',
    displayLoadInfo,
    fetchFileInfo,
    toggleTheme
  };
})();
