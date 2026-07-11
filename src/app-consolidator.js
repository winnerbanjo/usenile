// "The Problem" Section: Scattered Apps Consolidation & Interactive Hub Logic

export function initAppConsolidator() {
  const section = document.getElementById('problem-section');
  const headline = document.getElementById('problem-headline');
  const subheadline = document.getElementById('problem-subheading');
  const hubDisplay = document.getElementById('nile-hub-display');
  const nodes = document.querySelectorAll('.app-node');

  if (!section) return;

  // 1. Scroll-triggered consolidation observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Trigger consolidation to active ring layout on scroll reveal
        section.classList.add('consolidated');
      } else {
        // Reset when out of view
        section.classList.remove('consolidated');
        resetHub();
      }
    });
  }, {
    threshold: 0.2
  });

  observer.observe(section);

  // 2. Interactive Click handlers for the nodes
  nodes.forEach(node => {
    node.addEventListener('click', (e) => {
      e.stopPropagation();

      // Only allow interaction if consolidated (functional state active)
      if (!section.classList.contains('consolidated')) return;

      const isActive = node.classList.contains('active');

      // Clear active states
      nodes.forEach(n => n.classList.remove('active'));

      if (isActive) {
        // Toggle off if clicking the already active tool
        resetHub();
      } else {
        // Activate clicked tool
        node.classList.add('active');

        // Extract metadata attributes
        const name = node.getAttribute('data-name');
        const icon = node.getAttribute('data-icon');
        const status = node.getAttribute('data-status');
        const desc = node.getAttribute('data-desc');

        // Update Nile Hub center display
        if (hubDisplay) {
          hubDisplay.style.transform = 'translate(-50%, -50%) scale(0.95)';
          setTimeout(() => {
            hubDisplay.innerHTML = `
              <div style="font-size: 1.5rem; line-height: 1.1;">${icon}</div>
              <div style="font-size: 0.75rem; font-weight: 700; color: white; margin-top: 0.25rem; letter-spacing: 0.02em;">${name}</div>
              <div style="font-size: 0.6rem; color: #34D399; font-weight: 700; margin-top: 0.15rem; text-transform: uppercase;">${status}</div>
              <div style="font-size: 0.5rem; color: #94A3B8; margin-top: 0.15rem; padding: 0 0.5rem; line-height: 1.2;">${desc}</div>
            `;
            hubDisplay.style.transform = 'translate(-50%, -50%) scale(1)';
          }, 100);
        }
      }
    });
  });

  // Reset helper
  if (hubDisplay) {
    hubDisplay.addEventListener('click', (e) => {
      e.stopPropagation();
      resetHub();
    });
  }

  document.addEventListener('click', () => {
    resetHub();
  });

  function resetHub() {
    nodes.forEach(n => n.classList.remove('active'));
    if (hubDisplay) {
      hubDisplay.innerHTML = `Nile<span>Hub</span>`;
    }
  }
}
