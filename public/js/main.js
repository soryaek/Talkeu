const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');
const msgInput = document.getElementById('msg');
const emojiBtn = document.getElementById('emoji-btn');
const emojiPicker = document.getElementById('emoji-picker');

// Debug: Check if elements exist
console.log('Chat form:', chatForm);
console.log('Chat messages:', chatMessages);
console.log('Room name:', roomName);
console.log('User list:', userList);
console.log('Message input:', msgInput);
console.log('Emoji button:', emojiBtn);
console.log('Emoji picker:', emojiPicker);


const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

if (!username || !room) {
  alert('Invalid URL parameters. Please go back and enter your details.');
  window.location = '../index.html';
}

window.username = username;

const socket = io({
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true
});

socket.on('connect', () => {
  console.log('Connected to server');
  showConnectionStatus('Connected', 'success');
  
  // Join room after connection is established
  socket.emit('joinRoom', { username, room });
});

socket.on('connected', (data) => {
  console.log('Server confirmed connection:', data);
});

socket.on('roomJoined', (data) => {
  console.log('Successfully joined room:', data);
  outputRoomName(data.room);
  outputUsers(data.users);
  updateUserCount(data.users.length);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server:', reason);
  showConnectionStatus('Disconnected', 'error');
  
  if (reason === 'io server disconnect') {
    // Server disconnected us, try to reconnect
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})`);
      setTimeout(() => {
        socket.connect();
      }, 1000 * reconnectAttempts);
    } else {
      showNotification('Failed to reconnect. Please refresh the page.', 'error');
    }
  }
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  showConnectionStatus('Connection failed', 'error');
  showNotification('Failed to connect to server. Retrying...', 'error');
});

// Reconnection logic
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

socket.on('error', (error) => {
  console.error('Socket error:', error);
  showNotification(error.message || 'An error occurred', 'error');
});

// Initialize user count
updateUserCount(0);

let typingTimer;
const doneTypingInterval = 1000;

msgInput.addEventListener('input', () => {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('typing');
  }, 300);
  
  clearTimeout(stopTypingTimer);
  stopTypingTimer = setTimeout(() => {
    socket.emit('stopTyping');
  }, doneTypingInterval);
});

let stopTypingTimer;

socket.on('roomUsers', ({ room, users }) => {
  console.log('Room users updated:', { room, users });
  outputRoomName(room);
  outputUsers(users);
  updateUserCount(users.length);
});

socket.on('message', (message) => {
  displayMessage(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('userTyping', (username) => {
  if (username !== window.username) {
    showTypingIndicator(`${username} is typing...`);
  }
});

socket.on('stopTyping', (username) => {
  if (username !== window.username) {
    hideTypingIndicator();
  }
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msg = msgInput.value.trim();
  
  if (!msg) return false;
  
  if (msg.length > 1000) {
    showNotification('Message too long (max 1000 characters)', 'error');
    return false;
  }
  
  socket.emit('chatMessage', msg);
  msgInput.value = '';
  msgInput.focus();
});

const displayMessage = (message) => {
  console.log('Displaying message:', message);
  const div = document.createElement('div');
  div.classList.add('message');
  
  if (message.username === username) {
    div.classList.add('own-message');
  }
  
  const p = document.createElement('p');
  p.classList.add('meta');
  
  const usernameSpan = document.createElement('span');
  usernameSpan.className = 'username';
  usernameSpan.textContent = escapeHtml(message.username);
  
  const timeSpan = document.createElement('span');
  timeSpan.className = 'time';
  timeSpan.textContent = ` ${message.time}`;
  
  p.appendChild(usernameSpan);
  p.appendChild(timeSpan);
  div.appendChild(p);
  
  const para = document.createElement('p');
  para.classList.add('text');
  para.innerHTML = formatMessageText(message.text);
  div.appendChild(para);
  
  document.querySelector('.chat-messages').appendChild(div);
  console.log('Message added to DOM');
};



const formatMessageText = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  text = text.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  
  const emojiMap = {
    ':)': '😊', ':(': '😢', ':D': '😃', ';)': '😉',
    '<3': '❤️', ':P': '😛', ':O': '😮', ':|': '😐'
  };
  
  Object.entries(emojiMap).forEach(([code, emoji]) => {
    const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(escapedCode, 'g'), emoji);
  });
  
  return escapeHtml(text);
};

const escapeHtml = (text) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

const showTypingIndicator = (text) => {
  let indicator = document.getElementById('typing-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.classList.add('typing-indicator');
    document.getElementById('typing-container').appendChild(indicator);
  }
  indicator.textContent = text;
  indicator.style.display = 'block';
};

const hideTypingIndicator = () => {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.style.display = 'none';
    setTimeout(() => {
      if (indicator && indicator.style.display === 'none') {
        indicator.remove();
      }
    }, 300);
  }
};

const showConnectionStatus = (status, type) => {
  const statusDiv = document.getElementById('connection-status') || createConnectionStatus();
  statusDiv.textContent = status;
  statusDiv.className = `connection-status ${type}`;
};

const createConnectionStatus = () => {
  const statusDiv = document.createElement('div');
  statusDiv.id = 'connection-status';
  statusDiv.classList.add('connection-status');
  document.querySelector('.chat-header').appendChild(statusDiv);
  return statusDiv;
};

const showNotification = (message, type = 'info') => {
  const notification = document.createElement('div');
  notification.classList.add('notification', type);
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 100);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
};

function outputRoomName(room) {
  roomName.innerText = room;
}

function outputUsers(users) {
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="user-name">${escapeHtml(user.username)}</span>
    `;
    userList.appendChild(li);
  });
}

function updateUserCount(count) {
  const userCountElement = document.getElementById('user-count');
  if (userCountElement) {
    userCountElement.textContent = `(${count})`;
  }
}

document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Are you sure you want to leave the chatroom?');
  if (leaveRoom) {
    socket.disconnect();
    window.location = '../index.html';
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    chatForm.dispatchEvent(new Event('submit'));
  }
  
  if (e.key === 'Escape') {
    msgInput.value = '';
    msgInput.blur();
  }
});

const observer = new MutationObserver(() => {
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

observer.observe(chatMessages, {
  childList: true,
  subtree: true
});

// Emoji picker functionality
const emojis = [
  '😊', '😂', '❤️', '👍', '🎉', '🔥', '😎', '🤔',
  '😢', '😡', '😴', '🤗', '😍', '😋', '🤣', '😅',
  '😭', '😤', '😱', '😨', '😰', '😵', '🤯', '😵‍💫',
  '🥳', '😇', '🤠', '🤡', '👻', '🤖', '👽', '👾',
  '💪', '👏', '🙌', '🤝', '👊', '✌️', '🤞', '🤟',
  '🍕', '🍔', '🍟', '🌭', '🌮', '🌯', '🥪', '🥙',
  '☕', '🍺', '🍷', '🍸', '🍹', '🥤', '🧃', '🥛',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱'
];

function initEmojiPicker() {
  emojis.forEach(emoji => {
    const emojiItem = document.createElement('div');
    emojiItem.className = 'emoji-item';
    emojiItem.textContent = emoji;
    emojiItem.addEventListener('click', () => {
      const cursorPos = msgInput.selectionStart;
      const textBefore = msgInput.value.substring(0, cursorPos);
      const textAfter = msgInput.value.substring(cursorPos);
      msgInput.value = textBefore + emoji + textAfter;
      msgInput.focus();
      msgInput.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
      hideEmojiPicker();
    });
    emojiPicker.appendChild(emojiItem);
  });
}

function toggleEmojiPicker() {
  if (emojiPicker.classList.contains('show')) {
    hideEmojiPicker();
  } else {
    showEmojiPicker();
  }
}

function showEmojiPicker() {
  emojiPicker.classList.add('show');
}

function hideEmojiPicker() {
  emojiPicker.classList.remove('show');
}

// Initialize emoji picker
initEmojiPicker();

// Emoji button click event
emojiBtn.addEventListener('click', toggleEmojiPicker);

// Hide emoji picker when clicking outside
document.addEventListener('click', (e) => {
  if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) {
    hideEmojiPicker();
  }
});
