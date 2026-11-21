const DB_NAME = 'terreno-db';
const STORE = 'tasks';
let db;
let tasks = [];
let currentFilter = 'all';
let deferredInstallPrompt;
let selectedLocation = null;
let selectedPhoto = null;
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const taskList = $('#taskList');
const dialog = $('#taskDialog');
const taskForm = $('#taskForm');
const dateToday = new Date();

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transaction(mode, action) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function loadTasks() {
  tasks = (await transaction('readonly', (store) => store.getAll())) || [];
  tasks.sort((a, b) => (a.done - b.done) || (b.createdAt - a.createdAt));
  render();
}

function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function readableDate(value) {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T12:00:00`);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return 'Hoy';
  if (date.toDateString() === tomorrow.toDateString()) return 'Mañana';
  return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date);
}

function render() {
  const query = $('#searchInput').value.trim().toLocaleLowerCase('es-MX');
  const visible = tasks.filter((task) => {
    const matchesFilter = currentFilter === 'all' || (currentFilter === 'open' ? !task.done : task.done);
    return matchesFilter && `${task.title} ${task.notes || ''}`.toLocaleLowerCase('es-MX').includes(query);
  });
  const open = tasks.filter((task) => !task.done).length;
  $('#openCount').textContent = open;
  $('#taskCount').textContent = tasks.length;
  $('#allCount').textContent = tasks.length;
  $('#pendingCount').textContent = open;
  $('#doneCount').textContent = tasks.length - open;
  $('#emptyState').hidden = visible.length !== 0;
  taskList.innerHTML = visible.map((task) => `<article class="task-card ${task.done ? 'done' : ''}">
    <button class="check-btn" data-action="toggle" data-id="${task.id}" aria-label="${task.done ? 'Marcar pendiente' : 'Completar tarea'}">${task.done ? '✓' : ''}</button>
    <div class="task-main"><div class="task-title">${escapeHTML(task.title)}</div>${task.notes ? `<div class="task-note">${escapeHTML(task.notes)}</div>` : ''}</div>
    ${task.photo ? `<img class="task-photo" src="${task.photo}" alt="Foto adjunta" />` : ''}
    <div class="task-info">${task.location ? '<span class="task-loc">⌖ Ubicación</span>' : ''}<span>${readableDate(task.date)}</span><span class="priority ${task.priority}">${task.priority === 'high' ? 'Alta' : task.priority === 'low' ? 'Baja' : 'Normal'}</span></div>
    <button class="delete-btn" data-action="delete" data-id="${task.id}" aria-label="Eliminar tarea" title="Eliminar">×</button>
  </article>`).join('');
}

function showToast(message) {
  const toast = $('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function resetForm() {
  taskForm.reset(); selectedLocation = null; selectedPhoto = null;
  $('#locationText').textContent = 'Añadir ubicación'; $('#photoText').textContent = 'Adjuntar foto';
  $('#attachmentPreview').hidden = true; $('#attachmentPreview').replaceChildren();
}

function openDialog() {
  resetForm();
  $('#taskDate').value = new Date().toISOString().slice(0, 10);
  dialog.showModal();
  $('#taskTitle').focus();
}

$('#todayLabel').textContent = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(dateToday);
$('#newTaskBtn').addEventListener('click', openDialog);
$('#emptyNewBtn').addEventListener('click', openDialog);
$('#closeDialog').addEventListener('click', () => dialog.close());
$('#cancelDialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
$('#searchInput').addEventListener('input', render);
document.querySelectorAll('.filter').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach((item) => item.classList.toggle('active', item === button));
  currentFilter = button.dataset.filter; render();
}));

taskList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const task = tasks.find((item) => item.id === button.dataset.id); if (!task) return;
  if (button.dataset.action === 'toggle') {
    task.done = !task.done; task.updatedAt = Date.now(); await transaction('readwrite', (store) => store.put(task));
    await loadTasks(); showToast(task.done ? 'Tarea completada' : 'Tarea pendiente');
  } else if (button.dataset.action === 'delete') {
    await transaction('readwrite', (store) => store.delete(task.id)); await loadTasks(); showToast('Entrada eliminada');
  }
});

$('#locationBtn').addEventListener('click', () => {
  if (!('geolocation' in navigator)) return showToast('Este dispositivo no ofrece ubicación');
  const button = $('#locationBtn'); button.disabled = true; $('#locationText').textContent = 'Obteniendo ubicación…';
  navigator.geolocation.getCurrentPosition((position) => {
    selectedLocation = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy };
    $('#locationText').textContent = 'Ubicación añadida ✓'; button.disabled = false; showToast('Ubicación guardada con la tarea');
  }, (error) => {
    button.disabled = false; $('#locationText').textContent = 'Añadir ubicación';
    showToast(error.code === 1 ? 'Permite el acceso a la ubicación para continuar' : 'No se pudo obtener la ubicación');
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
});

$('#photoInput').addEventListener('change', (event) => {
  const file = event.target.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image(); image.onload = () => {
      const maxSide = 900; const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      selectedPhoto = canvas.toDataURL('image/jpeg', .76);
      $('#photoText').textContent = 'Foto lista ✓'; $('#attachmentPreview').hidden = false;
      $('#attachmentPreview').innerHTML = `<img src="${selectedPhoto}" alt="Vista previa de la foto" />`;
    }; image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const task = {
    id: crypto.randomUUID(), title: $('#taskTitle').value.trim(), notes: $('#taskNotes').value.trim(),
    date: $('#taskDate').value, priority: $('#taskPriority').value, done: false, createdAt: Date.now(),
    location: selectedLocation, photo: selectedPhoto,
  };
  if (!task.title) return;
  await transaction('readwrite', (store) => store.add(task));
  dialog.close(); await loadTasks(); showToast('Tarea guardada en este dispositivo');
});

window.addEventListener('online', updateConnection);
window.addEventListener('offline', updateConnection);
function updateConnection() {
  const badge = $('#connection'); badge.classList.toggle('offline', !navigator.onLine);
  badge.querySelector('span').textContent = navigator.onLine ? 'En línea' : 'Sin conexión';
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); deferredInstallPrompt = event; $('#installBtn').hidden = false;
});
$('#installBtn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null; $('#installBtn').hidden = true;
});
window.addEventListener('appinstalled', () => showToast('Terreno se instaló correctamente'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showToast('Actualización lista para usar');
        });
      });
    } catch (error) { console.error('No se pudo registrar el Service Worker:', error); }
  });
}

updateConnection();
try { db = await openDatabase(); await loadTasks(); }
catch (error) {
  console.error('No se pudo abrir IndexedDB:', error);
  showToast('No se pudo iniciar el almacenamiento local');
}
