const users = [];

// Join user to chat
function userJoin(id, username, room) {
  try {
    // Validate inputs
    if (!id || !username || !room) {
      throw new Error('Missing required parameters');
    }

    // Check if user already exists
    const existingUser = users.find(user => user.id === id);
    if (existingUser) {
      return existingUser;
    }

    const user = { 
      id, 
      username: username.trim(), 
      room: room.trim(),
      joinedAt: new Date()
    };

    users.push(user);
    return user;
  } catch (error) {
    console.error('Error joining user:', error);
    throw error;
  }
}

// Get current user
function getCurrentUser(id) {
  try {
    return users.find(user => user.id === id);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// User leaves chat
function userLeave(id) {
  try {
    const index = users.findIndex(user => user.id === id);

    if (index !== -1) {
      return users.splice(index, 1)[0];
    }
    return null;
  } catch (error) {
    console.error('Error leaving user:', error);
    return null;
  }
}

// Get room users
function getRoomUsers(room) {
  try {
    return users.filter(user => user.room === room);
  } catch (error) {
    console.error('Error getting room users:', error);
    return [];
  }
}

// Validate username
function validateUsername(username, room) {
  try {
    if (!username || username.trim().length === 0) {
      return { valid: false, message: 'Username cannot be empty' };
    }

    if (username.trim().length > 20) {
      return { valid: false, message: 'Username must be 20 characters or less' };
    }

    // Check if username contains only allowed characters
    const usernameRegex = /^[a-zA-Z0-9_\-\s]+$/;
    if (!usernameRegex.test(username.trim())) {
      return { valid: false, message: 'Username can only contain letters, numbers, spaces, hyphens, and underscores' };
    }

    // Check if username is already taken in the room
    const existingUser = getRoomUsers(room).find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (existingUser) {
      return { valid: false, message: 'Username already taken in this room' };
    }

    return { valid: true, message: 'Username is valid' };
  } catch (error) {
    console.error('Error validating username:', error);
    return { valid: false, message: 'Error validating username' };
  }
}

// Get all users (for admin purposes)
function getAllUsers() {
  return [...users];
}

// Get user count
function getUserCount() {
  return users.length;
}

// Get room count
function getRoomCount() {
  const rooms = new Set(users.map(user => user.room));
  return rooms.size;
}

// Clean up inactive users (optional - for future use)
function cleanupInactiveUsers(maxInactiveTime = 30 * 60 * 1000) { // 30 minutes
  const now = new Date();
  const inactiveUsers = users.filter(user => {
    const timeDiff = now - user.joinedAt;
    return timeDiff > maxInactiveTime;
  });

  inactiveUsers.forEach(user => {
    const index = users.findIndex(u => u.id === user.id);
    if (index !== -1) {
      users.splice(index, 1);
    }
  });

  return inactiveUsers.length;
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers,
  validateUsername,
  getAllUsers,
  getUserCount,
  getRoomCount,
  cleanupInactiveUsers
};
