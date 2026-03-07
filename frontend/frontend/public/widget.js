/**
 * Chatbot Widget Client
 * This script creates and manages the chatbot widget on customer websites
 */
(function() {
  // Configuration with defaults
  let config = {
    chatbotId: null,
    apiUrl: null,
    position: 'bottom-right',
    theme: {
      primaryColor: '#0084ff',
      textColor: '#ffffff',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      borderRadius: '16px',
      logoUrl: null
    },
    texts: {
      title: 'Chat Assistant',
      placeholder: 'Type your message here...',
      greeting: 'Hello! How can I help you today?',
      sendButtonText: 'Send',
      errorMessage: 'Something went wrong. Please try again.'
    },
    icons: {
      chatIcon: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
      closeIcon: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
      sendIcon: `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`
    }
  };

  // State variables
  let chatWindow = null;
  let chatMessages = null;
  let chatInput = null;
  let chatBubble = null;
  let visitorId = null;
  let conversationId = null;
  let isOpen = false;
  
  // Initialize the widget
  function init() {
    // Get the chatbot ID from the script tag
    const scripts = document.getElementsByTagName('script');
    const currentScript = scripts[scripts.length - 1];
    config.chatbotId = currentScript.dataset.chatbotId;
    // Prefer explicit API URL passed via attribute; fallback to global; finally attempt origin-based proxy
    config.apiUrl = currentScript.dataset.apiUrl || (window.CHATBOT_API_URL || (window.location.origin + '/api/proxy/chatbots'));
    
    if (!config.chatbotId) {
      console.error('Chatbot ID is required. Add data-chatbot-id attribute to the script tag.');
      return;
    }
    if (!config.apiUrl) {
      console.error('API URL is required. Add data-api-url attribute to the script tag or set window.CHATBOT_API_URL.');
      return;
    }
    
    // Generate a visitor ID or get from local storage
    visitorId = localStorage.getItem('chatbot_visitor_id') || generateId();
    localStorage.setItem('chatbot_visitor_id', visitorId);
    
    // Create the widget elements
    createWidgetElements();
    
    // Load chatbot configuration from the server
    loadChatbotConfig();
  }
  
  // Create widget elements and add them to the DOM
  function createWidgetElements() {
    // Create main container
    const container = document.createElement('div');
    container.id = 'ai-chatbot-container';
    container.style.cssText = 'position: fixed; z-index: 9999; font-family: sans-serif; font-size: 14px;';
    
    // Position the container based on config
    switch (config.position) {
      case 'bottom-right':
        container.style.right = '20px';
        container.style.bottom = '20px';
        break;
      case 'bottom-left':
        container.style.left = '20px';
        container.style.bottom = '20px';
        break;
      case 'top-right':
        container.style.right = '20px';
        container.style.top = '20px';
        break;
      case 'top-left':
        container.style.left = '20px';
        container.style.top = '20px';
        break;
    }
    
    document.body.appendChild(container);
    
    // Create chat bubble button
    chatBubble = document.createElement('div');
    chatBubble.id = 'ai-chatbot-bubble';
    chatBubble.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: ${config.theme.primaryColor};
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    `;
    chatBubble.addEventListener('click', toggleChatWindow);
    
    // Chat bubble icon
    const bubbleIcon = document.createElement('div');
    bubbleIcon.innerHTML = config.icons.chatIcon;
    bubbleIcon.style.color = config.theme.textColor;
    
    chatBubble.appendChild(bubbleIcon);
    
    // Create chat window (hidden by default)
    chatWindow = document.createElement('div');
    chatWindow.id = 'ai-chatbot-window';
    chatWindow.style.cssText = `
      position: absolute;
      ${config.position.includes('bottom') ? 'bottom: 80px;' : 'top: 80px;'}
      ${config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
      width: 350px;
      height: 500px;
      background-color: ${config.theme.backgroundColor};
      border-radius: ${config.theme.borderRadius};
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;
    
    // Chat header
    const chatHeader = document.createElement('div');
    chatHeader.style.cssText = `
      padding: 16px;
      background-color: ${config.theme.primaryColor};
      color: ${config.theme.textColor};
      display: flex;
      align-items: center;
      justify-content: space-between;
    `;
    
    // Header title/logo
    const headerTitle = document.createElement('div');
    headerTitle.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    if (config.theme.logoUrl) {
      const logo = document.createElement('img');
      logo.src = config.theme.logoUrl;
      logo.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 4px;
      `;
      headerTitle.appendChild(logo);
    }
    
    const title = document.createElement('span');
    title.textContent = config.texts.title;
    title.style.fontWeight = 'bold';
    headerTitle.appendChild(title);
    chatHeader.appendChild(headerTitle);
    
    // Close button
    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      background: none;
      border: none;
      cursor: pointer;
      color: ${config.theme.textColor};
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    closeButton.innerHTML = config.icons.closeIcon;
    closeButton.addEventListener('click', toggleChatWindow);
    chatHeader.appendChild(closeButton);
    
    // Chat messages area
    chatMessages = document.createElement('div');
    chatMessages.style.cssText = `
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    // Create input area
    const inputArea = document.createElement('div');
    inputArea.style.cssText = `
      padding: 12px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
    `;
    
    // Create text input
    chatInput = document.createElement('input');
    chatInput.type = 'text';
    chatInput.placeholder = config.texts.placeholder;
    chatInput.style.cssText = `
      flex: 1;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 20px;
      outline: none;
      font-family: ${config.theme.fontFamily};
      font-size: ${config.theme.fontSize};
    `;
    chatInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && chatInput.value.trim()) {
        sendMessage();
      }
    });
    
    // Create send button
    const sendButton = document.createElement('button');
    sendButton.style.cssText = `
      background-color: ${config.theme.primaryColor};
      color: ${config.theme.textColor};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
    `;
    sendButton.innerHTML = config.icons.sendIcon;
    sendButton.addEventListener('click', function() {
      if (chatInput.value.trim()) {
        sendMessage();
      }
    });
    
    // Assemble the chat window
    inputArea.appendChild(chatInput);
    inputArea.appendChild(sendButton);
    
    chatWindow.appendChild(chatHeader);
    chatWindow.appendChild(chatMessages);
    chatWindow.appendChild(inputArea);
    
    // Add elements to the container
    container.appendChild(chatWindow);
    container.appendChild(chatBubble);
  }
  
  // Load chatbot configuration from the server
  async function loadChatbotConfig() {
    try {
      const response = await fetch(`${config.apiUrl}/${config.chatbotId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load chatbot configuration');
      }
      
      const data = await response.json();
      const chatbot = data.chatbot;
      
      // Update configuration with server settings
      if (chatbot.customization) {
        config.theme.primaryColor = chatbot.customization.theme_color || config.theme.primaryColor;
        config.theme.fontFamily = chatbot.customization.font_family || config.theme.fontFamily;
        config.texts.greeting = chatbot.customization.greeting_message || config.texts.greeting;
        config.texts.placeholder = chatbot.customization.placeholder_text || config.texts.placeholder;
        config.theme.logoUrl = chatbot.customization.logo_url || config.theme.logoUrl;
        config.position = chatbot.customization.position || config.position;
      }
      
      // Update elements with new configuration
      updateElementStyles();
      
      // Add initial greeting message
      addBotMessage(config.texts.greeting);
      
    } catch (error) {
      console.error('Error loading chatbot configuration:', error);
      // Continue with default configuration
    }
  }
  
  // Update element styles based on configuration
  function updateElementStyles() {
    if (chatBubble) {
      chatBubble.style.backgroundColor = config.theme.primaryColor;
    }
    
    if (chatWindow) {
      const header = chatWindow.querySelector('#ai-chatbot-window > div:first-child');
      if (header) {
        header.style.backgroundColor = config.theme.primaryColor;
        header.style.color = config.theme.textColor;
      }
      
      chatInput.placeholder = config.texts.placeholder;
      chatInput.style.fontFamily = config.theme.fontFamily;
      
      const sendButton = chatWindow.querySelector('button:last-child');
      if (sendButton) {
        sendButton.style.backgroundColor = config.theme.primaryColor;
        sendButton.style.color = config.theme.textColor;
      }
    }
  }
  
  // Toggle chat window visibility
  function toggleChatWindow() {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    
    if (isOpen) {
      chatInput.focus();
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
  
  // Send a message
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;
    
    // Clear input
    chatInput.value = '';
    
    // Add user message to chat
    addUserMessage(message);
    
    try {
      // Show typing indicator
      const typingIndicator = addTypingIndicator();
      
      // Send message to server
      const response = await fetch(`${config.apiUrl}/${config.chatbotId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          conversation_id: conversationId,
          visitor_id: visitorId,
          source_url: window.location.href,
          metadata: {
            referrer: document.referrer,
            userAgent: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`
          }
        })
      });
      
      // Remove typing indicator
      if (typingIndicator) {
        chatMessages.removeChild(typingIndicator);
      }
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const data = await response.json();
      
      // Save conversation ID for continuing the conversation
      if (data.conversation_id) {
        conversationId = data.conversation_id;
      }
      
      // Add bot response to chat
      addBotMessage(data.message || data.response);
      
    } catch (error) {
      console.error('Error sending message:', error);
      addBotMessage(config.texts.errorMessage);
    }
  }
  
  // Add a user message to the chat
  function addUserMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
      align-self: flex-end;
      background-color: ${config.theme.primaryColor};
      color: ${config.theme.textColor};
      padding: 10px 14px;
      border-radius: 18px 18px 0 18px;
      max-width: 80%;
      word-wrap: break-word;
    `;
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Add a bot message to the chat
  function addBotMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.style.cssText = `
      align-self: flex-start;
      background-color: #f1f1f1;
      color: #333;
      padding: 10px 14px;
      border-radius: 18px 18px 18px 0;
      max-width: 80%;
      word-wrap: break-word;
    `;
    messageElement.textContent = message;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
  
  // Add typing indicator
  function addTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      align-self: flex-start;
      background-color: #f1f1f1;
      color: #888;
      padding: 14px;
      border-radius: 18px 18px 18px 0;
      max-width: 60px;
      display: flex;
    `;
    
    // Create the typing animation dots
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 8px;
        height: 8px;
        background-color: #888;
        border-radius: 50%;
        margin: 0 2px;
        animation: typing-animation 1.4s infinite;
        animation-timing-function: ease-in-out;
        animation-delay: ${i * 0.2}s;
      `;
      indicator.appendChild(dot);
    }
    
    // Add keyframe animation to head
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes typing-animation {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-5px); }
      }
    `;
    document.head.appendChild(styleSheet);
    
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return indicator;
  }
  
  // Generate a random ID
  function generateId() {
    return 'v_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  // Initialize the widget when the page loads
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})(); 