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
const recurrenceEndGroup = document.getElementById('recurrenceEndGroup');
const editRecurrenceEndGroup = document.getElementById('editRecurrenceEndGroup');

// Toast container
const toastContainer = document.createElement('div');
toastContainer.className = 'toast-container';
document.body.appendChild(toastContainer);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadReminders();
  initializeTimePickers();
  setMinDate();
  setupEventListeners();
});

function setupEventListeners() {
  reminderForm.addEventListener('submit', handleCreateReminder);
  refreshBtn.addEventListener('click', loadReminders);
  notifyTypeSelect.addEventListener('change', updateTargetField);
  editForm.addEventListener('submit', handleEditReminder);
  
  // Recurrence toggle
  document.querySelectorAll('input[name="recurrence"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      recurrenceEndGroup.style.display = e.target.value !== 'none' ? 'block' : 'none';
    });
  });
  
  document.querySelectorAll('input[name="edit_recurrence"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      editRecurrenceEndGroup.style.display = e.target.value !== 'none' ? 'block' : 'none';
    });
  });
  
  // Close modal on outside click
  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) {
      closeModal();
    }
  });
}

function initializeTimePickers() {
  // Populate hour selects (1-12)
  const hourSelects = [document.getElementById('remind_hour'), document.getElementById('edit_remind_hour')];
  hourSelects.forEach(select => {
    if (!select) return;
    select.innerHTML = '<option value="">HH</option>';
    for (let i = 1; i <= 12; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i.toString().padStart(2, '0');
      select.appendChild(option);
    }
  });
  
  // Populate minute selects (00-55 in 5-minute intervals)
  const minuteSelects = [document.getElementById('remind_minute'), document.getElementById('edit_remind_minute')];
  minuteSelects.forEach(select => {
    if (!select) return;
    select.innerHTML = '<option value="">MM</option>';
    for (let i = 0; i < 60; i += 5) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i.toString().padStart(2, '0');
      select.appendChild(option);
    }
  });
}

function setMinDate() {
  const today = new Date().toISOString().split('T')[0];
  const dateInputs = ['remind_date', 'recurrence_end', 'edit_remind_date', 'edit_recurrence_end'];
  dateInputs.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.min = today;
  });
  
  // Set default date to today
  document.getElementById('remind_date').value = today;
  
  // Set default time to next hour
  const now = new Date();
  let hour = now.getHours() + 1;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour > 12 ? hour - 12 : hour;
  if (hour === 0) hour = 12;
  
  document.getElementById('remind_hour').value = hour;
  document.getElementById('remind_minute').value = 0;
  document.getElementById('remind_ampm').value = ampm;
}

function getDateTimeFromPickers(prefix = '') {
  const date = document.getElementById(prefix + 'remind_date').value;
  let hour = parseInt(document.getElementById(prefix + 'remind_hour').value);
  const minute = parseInt(document.getElementById(prefix + 'remind_minute').value);
  const ampm = document.getElementById(prefix + 'remind_ampm').value;
  
  // Convert to 24-hour format
  if (ampm === 'PM' && hour !== 12) {
    hour += 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour = 0;
  }
  
  const dateTime = new Date(`${date}T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`);
  return dateTime.toISOString();
}

function setDateTimeToPickers(isoString, prefix = '') {
  const date = new Date(isoString);
  
  // Set date
  const dateStr = date.toISOString().split('T')[0];
  document.getElementById(prefix + 'remind_date').value = dateStr;
  
  // Set time
  let hour = date.getHours();
  const minute = Math.floor(date.getMinutes() / 5) * 5; // Round to nearest 5
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour > 12 ? hour - 12 : hour;
  if (hour === 0) hour = 12;
  
  document.getElementById(prefix + 'remind_hour').value = hour;
  document.getElementById(prefix + 'remind_minute').value = minute;
  document.getElementById(prefix + 'remind_ampm').value = ampm;
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
  
  // Recurrence badge
  let recurrenceBadge = '';
  if (reminder.recurrence && reminder.recurrence !== 'none') {
    const recurrenceLabels = {
      daily: '🔄 Daily',
      weekly: '🔄 Weekly',
      monthly: '🔄 Monthly'
    };
    recurrenceBadge = `<span class="badge badge-recurring">${recurrenceLabels[reminder.recurrence]}</span>`;
  }
  
  // Recurrence end info
  let recurrenceEndInfo = '';
  if (reminder.recurrence_end) {
    const endDate = new Date(reminder.recurrence_end).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    recurrenceEndInfo = `<span class="recurrence-info">Until ${endDate}</span>`;
  }
  
  return `
    <div class="reminder-item ${isSent ? 'sent' : ''}">
      <div class="reminder-header">
        <div class="reminder-title">
          ${reminder.title}
          ${statusBadge}
          ${recurrenceBadge}
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
        ${recurrenceEndInfo}
      </div>
    </div>
  `;
}

async function handleCreateReminder(e) {
  e.preventDefault();
  
  const recurrence = document.querySelector('input[name="recurrence"]:checked').value;
  const recurrenceEnd = document.getElementById('recurrence_end').value;
  
  const data = {
    title: document.getElementById('title').value,
    message: document.getElementById('message').value,
    notify_type: document.getElementById('notify_type').value,
    notify_target: document.getElementById('notify_target').value,
    remind_at: getDateTimeFromPickers(),
    recurrence: recurrence,
    recurrence_end: recurrenceEnd ? new Date(recurrenceEnd + 'T23:59:59').toISOString() : null
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
      setMinDate();
      recurrenceEndGroup.style.display = 'none';
      document.querySelector('input[name="recurrence"][value="none"]').checked = true;
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
    
    // Set date and time
    setDateTimeToPickers(reminder.remind_at, 'edit_');
    
    // Set recurrence
    const recurrence = reminder.recurrence || 'none';
    document.querySelector(`input[name="edit_recurrence"][value="${recurrence}"]`).checked = true;
    editRecurrenceEndGroup.style.display = recurrence !== 'none' ? 'block' : 'none';
    
    // Set recurrence end
    if (reminder.recurrence_end) {
      const endDate = new Date(reminder.recurrence_end).toISOString().split('T')[0];
      document.getElementById('edit_recurrence_end').value = endDate;
    } else {
      document.getElementById('edit_recurrence_end').value = '';
    }
    
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
  const recurrence = document.querySelector('input[name="edit_recurrence"]:checked').value;
  const recurrenceEnd = document.getElementById('edit_recurrence_end').value;
  
  const data = {
    title: document.getElementById('edit_title').value,
    message: document.getElementById('edit_message').value,
    notify_type: document.getElementById('edit_notify_type').value,
    notify_target: document.getElementById('edit_notify_target').value,
    remind_at: getDateTimeFromPickers('edit_'),
    recurrence: recurrence,
    recurrence_end: recurrenceEnd ? new Date(recurrenceEnd + 'T23:59:59').toISOString() : null
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
