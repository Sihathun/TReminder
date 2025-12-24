// API Base URL
const API_URL = '/api/reminders';

// DOM Elements
const reminderForm = document.getElementById('reminderForm');
const remindersList = document.getElementById('remindersList');
const refreshBtn = document.getElementById('refreshBtn');
const notifyTypeSelect = document.getElementById('notify_type');
const notifyTargetInput = document.getElementById('notify_target');
const targetLabel = document.getElementById('targetLabel');
const targetHint = document.getElementById('targetHint');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');

// Toast container
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadReminders();
  setMinDateTime();
  setupEventListeners();
});

function setupEventListeners() {
  reminderForm.addEventListener('submit', handleCreateReminder);
  refreshBtn.addEventListener('click', loadReminders);
  notifyTypeSelect.addEventListener('change', updateTargetField);
  editForm.addEventListener('submit', handleEditReminder);
  
  // Close modal on outside click
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeModal();
    }
  });
}

function setMinDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localISOTime = new Date(now.getTime() - offset * 60000).toISOString().slice(0, 16);
  document.getElementById('remind_at').min = localISOTime;
}

function updateTargetField() {
  const type = notifyTypeSelect.value;
  
  if (type === 'discord') {
    targetLabel.textContent = 'Discord Webhook URL';
    notifyTargetInput.placeholder = 'https://discord.com/api/webhooks/...';
    targetHint.textContent = 'Get this from your Discord server settings → Integrations → Webhooks';
  } else if (type === 'email') {
    targetLabel.textContent = 'Email Address';
    notifyTargetInput.placeholder = 'email@example.com';
    targetHint.textContent = 'The email address to send the reminder to';
  } else {
    targetLabel.textContent = 'Target';
    notifyTargetInput.placeholder = 'Enter target...';
    targetHint.textContent = '';
  }
}

async function loadReminders() {
  remindersList.innerHTML = '<p class="loading">Loading reminders...</p>';
  
  try {
    const response = await fetch(API_URL);
    const reminders = await response.json();
    
    if (reminders.length === 0) {
      remindersList.innerHTML = '<p class="empty">No reminders yet. Create one above!</p>';
      return;
    }
    
    remindersList.innerHTML = reminders.map(reminder => createReminderHTML(reminder)).join('');
    
    // Add event listeners to action buttons
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteReminder(btn.dataset.id));
    });
    
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(btn.dataset.id));
    });
    
  } catch (error) {
    remindersList.innerHTML = '<p class="empty">Failed to load reminders. Please try again.</p>';
    showToast('Failed to load reminders', 'error');
  }
}

function createReminderHTML(reminder) {
  const remindAt = new Date(reminder.remind_at);
  const now = new Date();
  const isPast = remindAt < now;
  const isSent = reminder.sent === 1;
  
  const formattedDate = remindAt.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  const statusBadge = isSent 
    ? '<span class="badge badge-sent">Sent</span>'
    : '<span class="badge badge-pending">Pending</span>';
  
  const typeBadge = reminder.notify_type === 'discord'
    ? '<span class="badge badge-discord">Discord</span>'
    : '<span class="badge badge-email">Email</span>';
  
  return `
    <div class="reminder-item ${isSent ? 'sent' : ''}">
      <div class="reminder-header">
        <div class="reminder-title">
          ${reminder.title}
          ${statusBadge}
        </div>
        <div class="reminder-actions">
          ${!isSent ? `<button class="btn btn-edit" data-id="${reminder.id}">Edit</button>` : ''}
          <button class="btn btn-danger btn-delete" data-id="${reminder.id}">Delete</button>
        </div>
      </div>
      <p class="reminder-message">${escapeHtml(reminder.message)}</p>
      <div class="reminder-meta">
        <span>📅 ${formattedDate}</span>
        <span>${typeBadge}</span>
        <span title="${reminder.notify_target}">📍 ${truncate(reminder.notify_target, 30)}</span>
      </div>
    </div>
  `;
}

async function handleCreateReminder(e) {
  e.preventDefault();
  
  const formData = new FormData(reminderForm);
  const data = {
    title: formData.get('title'),
    message: formData.get('message'),
    notify_type: formData.get('notify_type'),
    notify_target: formData.get('notify_target'),
    remind_at: new Date(formData.get('remind_at')).toISOString()
  };
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      showToast('Reminder created successfully!', 'success');
      reminderForm.reset();
      setMinDateTime();
      loadReminders();
    } else {
      showToast(result.error || 'Failed to create reminder', 'error');
    }
  } catch (error) {
    showToast('Failed to create reminder', 'error');
  }
}

async function deleteReminder(id) {
  if (!confirm('Are you sure you want to delete this reminder?')) {
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    
    if (response.ok) {
      showToast('Reminder deleted', 'success');
      loadReminders();
    } else {
      showToast('Failed to delete reminder', 'error');
    }
  } catch (error) {
    showToast('Failed to delete reminder', 'error');
  }
}

async function openEditModal(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    const reminder = await response.json();
    
    document.getElementById('edit_id').value = reminder.id;
    document.getElementById('edit_title').value = reminder.title;
    document.getElementById('edit_message').value = reminder.message;
    document.getElementById('edit_notify_type').value = reminder.notify_type;
    document.getElementById('edit_notify_target').value = reminder.notify_target;
    
    // Format date for datetime-local input
    const remindAt = new Date(reminder.remind_at);
    const offset = remindAt.getTimezoneOffset();
    const localISOTime = new Date(remindAt.getTime() - offset * 60000).toISOString().slice(0, 16);
    document.getElementById('edit_remind_at').value = localISOTime;
    
    editModal.classList.add('active');
  } catch (error) {
    showToast('Failed to load reminder', 'error');
  }
}

function closeModal() {
  editModal.classList.remove('active');
}

async function handleEditReminder(e) {
  e.preventDefault();
  
  const id = document.getElementById('edit_id').value;
  const data = {
    title: document.getElementById('edit_title').value,
    message: document.getElementById('edit_message').value,
    notify_type: document.getElementById('edit_notify_type').value,
    notify_target: document.getElementById('edit_notify_target').value,
    remind_at: new Date(document.getElementById('edit_remind_at').value).toISOString()
  };
  
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (response.ok) {
      showToast('Reminder updated successfully!', 'success');
      closeModal();
      loadReminders();
    } else {
      const result = await response.json();
      showToast(result.error || 'Failed to update reminder', 'error');
    }
  } catch (error) {
    showToast('Failed to update reminder', 'error');
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncate(str, maxLength) {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}
