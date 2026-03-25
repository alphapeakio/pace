/**
 * Navigation and section switching.
 */

/** Initialize section tab navigation */
export function initNav() {
  // Section switching
  document.querySelectorAll('.nav button[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const sectionId = btn.dataset.section;
      showSection(sectionId);
    });
  });

  // Event dropdown navigation
  const eventSelect = document.getElementById('eventSelect');
  if (eventSelect) {
    eventSelect.addEventListener('change', () => {
      const url = eventSelect.value;
      if (url) window.location.href = url;
    });
  }
}

/** Show a section by id, hiding others */
export function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav button[data-section]').forEach(b => b.classList.remove('active'));

  const section = document.getElementById(id);
  if (section) section.classList.add('active');

  const btn = document.querySelector(`.nav button[data-section="${id}"]`);
  if (btn) btn.classList.add('active');
}

/** Get the events list for the dropdown */
export const EVENTS_LIST = [
  { id: '100m', name: '100m', url: '/events/100m.html' },
  { id: '200m', name: '200m', url: '/events/200m.html' },
  { id: '400m', name: '400m', url: '/events/400m.html' },
  { id: '800m', name: '800m', url: '/events/800m.html' },
  { id: '1500m', name: '1500m', url: '/events/1500m.html' },
  { id: '2mile', name: '2 Mile', url: '/events/2mile.html' },
  { id: '5k', name: '5K', url: '/events/5k.html' },
];
