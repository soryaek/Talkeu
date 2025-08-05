const moment = require('moment');

function formatMessage(username, text) {
  try {
    // Sanitize inputs
    const sanitizedUsername = username ? username.toString().trim().substring(0, 20) : 'Unknown';
    const sanitizedText = text ? text.toString().trim().substring(0, 1000) : '';

    return {
      username: sanitizedUsername,
      text: sanitizedText,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error formatting message:', error);
    return {
      username: 'System',
      text: 'Error formatting message',
      timestamp: new Date().toISOString()
    };
  }
}

// Validate message content
function validateMessage(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, message: 'Message cannot be empty' };
  }

  const trimmedText = text.trim();
  if (trimmedText.length === 0) {
    return { valid: false, message: 'Message cannot be empty' };
  }

  if (trimmedText.length > 1000) {
    return { valid: false, message: 'Message too long (max 1000 characters)' };
  }

  // Check for spam patterns (simple implementation)
  const spamPatterns = [
    /(.)\1{10,}/, // Repeated characters
    /[A-Z]{20,}/, // ALL CAPS
    /(.){1,3}\1{5,}/ // Repeated short patterns
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(trimmedText)) {
      return { valid: false, message: 'Message contains spam patterns' };
    }
  }

  return { valid: true, message: 'Message is valid' };
}

// Format system message
function formatSystemMessage(text) {
  return formatMessage('System', text);
}

// Format bot message
function formatBotMessage(text) {
  return formatMessage('Talkeu Bot', text);
}

module.exports = {
  formatMessage,
  validateMessage,
  formatSystemMessage,
  formatBotMessage
};
