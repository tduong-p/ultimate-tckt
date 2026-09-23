const deliveryStatus = item => ['email', 'push'].filter(channel => item[`${channel}_status`]).map(channel => `<span class="delivery-status ${item[`${channel}_status`]}">${channel === 'email' ? 'Email' : 'Push'}: ${esc(item[`${channel}_status`])}</span>`).join('');
const notificationItem = item => `<button class="notification-item ${item.seen_at ? 'seen' : 'unread'}" data-notification-id="${item.id}"><span class="notification-symbol"><i class="ph-bold ph-bell" aria-hidden="true"></i></span><span><strong>${esc(t(item.title))}</strong><p>${esc(item.body)}</p><span class="delivery-statuses">${deliveryStatus(item)}</span><small>${date(item.created_at)}</small></span></button>`;

function renderNotifications() {
  const list = $('#notification-list');
  if (!list) return;
  list.innerHTML = state.notifications.length
    ? state.notifications.map(notificationItem).join('')
    : `<p class="notification-empty">${t('No notifications yet.')}</p>`;
  $$('[data-notification-id]', list).forEach(button => {
    button.onclick = () => openNotification(state.notifications.find(item => String(item.id) === button.dataset.notificationId));
  });
}

function updateNotificationBadge() {
  state.notificationUnread = Number(state.notificationUnread || 0);
  $$('.notification-count').forEach(badge => {
    badge.textContent = state.notificationUnread > 99 ? '99+' : String(state.notificationUnread);
    badge.classList.toggle('hidden', !state.notificationUnread);
  });
}

async function openNotification(item) {
  if (!item) return;
  if (!item.seen_at) {
    await api(`/api/notifications/${item.id}/seen`, { method: 'PATCH' }).catch(() => {});
    item.seen_at = new Date().toISOString();
    state.notificationUnread = Math.max(0, state.notificationUnread - 1);
    updateNotificationBadge();
  }
  $('#notification-panel').classList.add('hidden');
  $$('.notification-trigger').forEach(button => button.setAttribute('aria-expanded', 'false'));
  if (item.url) {
    const target = new URL(item.url, location.origin);
    location.hash = target.hash || '#dashboard';
  }
}

function showNotificationPopup(item) {
  if (state.announcedNotifications.has(String(item.id))) return;
  state.announcedNotifications.add(String(item.id));
  const popup = document.createElement('button');
  popup.className = 'notification-popup';
  popup.innerHTML = `<span class="notification-symbol"><i class="ph-bold ph-bell" aria-hidden="true"></i></span><span><strong>${esc(t(item.title))}</strong><p>${esc(item.body)}</p></span>`;
  popup.onclick = () => { popup.remove(); openNotification(item); };
  $('#notification-popups').append(popup);
  setTimeout(() => popup.remove(), 7000);
}

async function loadNotifications(announce = false) {
  const data = await api('/api/notifications');
  state.notifications = data.notifications || [];
  state.notificationUnread = Number(data.unread_count || 0);
  updateNotificationBadge();
  renderNotifications();
  if (announce) state.notifications.filter(item => !item.seen_at).slice(0, 3).reverse().forEach(showNotificationPopup);
}

async function toggleNotifications() {
  const panel = $('#notification-panel');
  const opening = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !opening);
  $$('.notification-trigger').forEach(button => button.setAttribute('aria-expanded', String(opening)));
  if (!opening) return;
  await loadNotifications();
  if (state.notificationUnread) {
    await api('/api/notifications/seen', { method: 'POST' });
    state.notifications.forEach(item => { if (!item.seen_at) item.seen_at = new Date().toISOString(); });
    state.notificationUnread = 0;
    updateNotificationBadge();
    renderNotifications();
  }
}

function initializeNotifications() {
  const mobileTrigger = $('.mobile-notification');
  const topActions = $('.top-actions');
  if (mobileTrigger && topActions) topActions.insertBefore(mobileTrigger, topActions.firstChild);
  $$('.notification-trigger').forEach(button => button.onclick = event => {
    event.stopPropagation();
    toggleNotifications().catch(error => toast(error.message));
  });
  $('#notification-panel').onclick = event => event.stopPropagation();
  document.addEventListener('click', event => {
    if (event.target.closest('.notification-trigger, #notification-panel')) return;
    $('#notification-panel').classList.add('hidden');
    $$('.notification-trigger').forEach(button => button.setAttribute('aria-expanded', 'false'));
  });
  loadNotifications(true).catch(error => console.warn('Notification inbox failed.', error));
  setInterval(() => loadNotifications(true).catch(() => {}), 60000);
}

const notificationStartup = setInterval(() => {
  if (!state.user) return;
  clearInterval(notificationStartup);
  initializeNotifications();
}, 100);
