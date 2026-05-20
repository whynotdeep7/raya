// chat.js
const socket = io();

const currentUserId = document.body.dataset.userId;
const currentUserName = document.body.dataset.userName;

// DOM Elements
const chatListItems = document.querySelectorAll('.chat-list-item');
const chatEmpty = document.getElementById('chatEmpty');
const chatMain = document.getElementById('chatMain');
const activeChatImg = document.getElementById('activeChatImg');
const activeChatName = document.getElementById('activeChatName');
const chatMessages = document.getElementById('chatMessages');
const chatForm = document.getElementById('chatForm');
const messageInput = document.getElementById('messageInput');
const typingIndicator = document.getElementById('typingIndicator');

let activeChatId = null;
let activeOtherUserId = null;
let typingTimeout = null;

// Format timestamp
function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Scroll to bottom
function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Get tick HTML based on status
function getTickHtml(status) {
  if (status === 'sent') return '<i class="fa-solid fa-check" style="color: rgba(255, 255, 255, 0.6);"></i>';
  if (status === 'delivered') return '<i class="fa-solid fa-check-double" style="color: rgba(255, 255, 255, 0.6);"></i>';
  if (status === 'read') return '<i class="fa-solid fa-check-double" style="color: #4ade80;"></i>'; // Bright green/blue for contrast
  return '';
}

// Render a single message
function renderMessage(msg) {
  const isSent = msg.sender === currentUserId;
  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
  
  // Use data attribute to update ticks later without full re-render
  if (isSent) {
    bubble.dataset.messageId = msg._id;
  }
  
  const ticks = isSent ? `<span class="message-status status-${msg._id}">${getTickHtml(msg.status || 'sent')}</span>` : '';
  
  bubble.innerHTML = `
    <span class="message-text">${msg.text}</span>
    <span class="message-meta">${formatTime(msg.createdAt)} ${ticks}</span>
  `;
  
  chatMessages.appendChild(bubble);
  scrollToBottom();
}

// Update sidebar last message
function updateSidebarLastMessage(chatId, text, timestamp) {
  const listItem = document.querySelector(`.chat-list-item[data-chat-id="${chatId}"]`);
  if (listItem) {
    const lastMsgEl = listItem.querySelector('.last-message');
    const timeEl = listItem.querySelector('.chat-time');
    
    if (lastMsgEl) lastMsgEl.innerText = text;
    
    if (timeEl) {
      timeEl.innerText = formatTime(timestamp);
    } else {
      const header = listItem.querySelector('.chat-info-header');
      if (header) {
        header.innerHTML += `<span class="chat-time">${formatTime(timestamp)}</span>`;
      }
    }
    
    // Move to top of list
    const chatList = document.getElementById('chatList');
    chatList.prepend(listItem);
  }
}

// Select a chat
chatListItems.forEach(item => {
  item.addEventListener('click', async () => {
    // UI Update
    chatListItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    
    chatEmpty.classList.add('hidden');
    chatMain.classList.remove('hidden');
    
    // Set Data
    activeOtherUserId = item.dataset.otherId;
    let chatId = item.dataset.chatId;
    
    const otherName = item.dataset.otherName;
    const otherImg = item.querySelector('img').src;
    
    activeChatName.innerText = otherName;
    activeChatImg.src = otherImg;
    
    // Clear unread badge
    const badge = item.querySelector('.unread-badge');
    if (badge) {
      badge.innerText = '0';
      badge.classList.add('hidden');
    }
    
    // Clear messages
    chatMessages.innerHTML = '';
    
    if (!chatId) {
      try {
        const response = await fetch('/api/chat/new', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetUserId: activeOtherUserId })
        });
        const newChat = await response.json();
        chatId = newChat._id;
        item.dataset.chatId = chatId;
      } catch (err) {
        console.error('Failed to create chat', err);
        return;
      }
    }
    
    activeChatId = chatId;
    
    // Join socket room
    socket.emit('join chat', activeChatId);
    
    // Fetch older messages
    try {
      const res = await fetch(`/api/chat/${activeChatId}/messages`);
      const messages = await res.json();
      
      const unreadIds = [];
      messages.forEach(msg => {
        renderMessage(msg);
        if (msg.sender !== currentUserId && msg.status !== 'read') {
          unreadIds.push(msg._id);
        }
      });
      
      // Mark as read
      if (unreadIds.length > 0) {
        socket.emit('update message status', {
          chatId: activeChatId,
          messageIds: unreadIds,
          status: 'read'
        });
      }
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  });
});

// Send Message
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !activeChatId) return;
  
  socket.emit('chat message', {
    chatId: activeChatId,
    senderId: currentUserId,
    text: text
  });
  
  socket.emit('stop typing', { chatId: activeChatId, senderId: currentUserId });
  messageInput.value = '';
});

// Typing Events
messageInput.addEventListener('input', () => {
  if (!activeChatId) return;
  
  socket.emit('typing', { chatId: activeChatId, senderId: currentUserId });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('stop typing', { chatId: activeChatId, senderId: currentUserId });
  }, 2000);
});

// Socket Listeners
socket.on('chat message', (msg) => {
  // If the message is for the currently open chat, render it
  if (msg.chatId === activeChatId) {
    renderMessage(msg);
    
    // If we received it while chat is active, mark it as read immediately
    if (msg.sender !== currentUserId) {
      socket.emit('update message status', {
        chatId: activeChatId,
        messageIds: [msg._id],
        status: 'read'
      });
    }
  } else {
    // Delivered but not read (since chat is not open)
    if (msg.sender !== currentUserId) {
      socket.emit('update message status', {
        chatId: msg.chatId,
        messageIds: [msg._id],
        status: 'delivered'
      });
      
      // Increment unread badge in sidebar
      const badge = document.getElementById(`unread-${msg.chatId}`);
      if (badge) {
        const count = parseInt(badge.innerText || '0') + 1;
        badge.innerText = count;
        badge.classList.remove('hidden');
      }
    }
  }
  
  // Always update sidebar
  updateSidebarLastMessage(msg.chatId, msg.text, msg.createdAt);
});

socket.on('message status update', ({ messageIds, status, chatId }) => {
  if (chatId === activeChatId) {
    messageIds.forEach(id => {
      const statusSpan = document.querySelector(`.status-${id}`);
      if (statusSpan) {
        statusSpan.innerHTML = getTickHtml(status);
      }
    });
  }
});

socket.on('user typing', ({ senderId, chatId }) => {
  if (senderId === activeOtherUserId) {
    typingIndicator.classList.remove('hidden');
  }
  
  // Sidebar update
  const listItem = document.querySelector(`.chat-list-item[data-chat-id="${chatId}"]`);
  if (listItem) {
    const lastMsgEl = listItem.querySelector('.last-message');
    if (lastMsgEl) {
      if (!lastMsgEl.dataset.originalText) {
        lastMsgEl.dataset.originalText = lastMsgEl.innerHTML;
      }
      lastMsgEl.innerHTML = `<span style="color: #4ade80; font-style: italic;">typing...</span>`;
    }
  }
});

socket.on('user stop typing', ({ senderId, chatId }) => {
  if (senderId === activeOtherUserId) {
    typingIndicator.classList.add('hidden');
  }
  
  // Sidebar update
  const listItem = document.querySelector(`.chat-list-item[data-chat-id="${chatId}"]`);
  if (listItem) {
    const lastMsgEl = listItem.querySelector('.last-message');
    if (lastMsgEl && lastMsgEl.dataset.originalText) {
      lastMsgEl.innerHTML = lastMsgEl.dataset.originalText;
      delete lastMsgEl.dataset.originalText;
    }
  }
});
