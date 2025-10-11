// widget/src/index.js
(function() {
    // Widget configuration
    const config = {
      apiUrl: "https://api.yourchatbot.com", // Will be replaced with actual URL in production
      chatbotId: null,
      apiKey: null,
      position: "bottom-right",
      theme: {
        primaryColor: "#0084ff",
        fontFamily: "Inter, sans-serif",
        bubbleIcon: null,
        logoUrl: null
      },
      i18n: {
        placeholder: "Type your message here...",
        greeting: "Hello! How can I help you today?",
        sendButtonLabel: "Send message",
        loadingText: "Thinking...",
        errorText: "Something went wrong. Please try again."
      }
    };
  
    // Widget state
    const state = {
      isOpen: false,
      conversationId: null,
      visitorId: null,
      messages: [],
      isLoading: false,
      error: null
    };
  
    // Create Widget Elements
    function createWidgetElements() {
      // Create main container
      const container = document.createElement("div");
      container.id = "ai-chatbot-widget-container";
      container.style.cssText = `
        position: fixed;
        ${config.position.includes("bottom") ? "bottom: 20px;" : "top: 20px;"}
        ${config.position.includes("right") ? "right: 20px;" : "left: 20px;"}
        z-index: 9999;
        font-family: ${config.theme.fontFamily};
      `;
  
      // Create chat bubble
      const chatBubble = document.createElement("div");
      chatBubble.id = "ai-chatbot-bubble";
      chatBubble.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${config.theme.primaryColor};
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        transition: all 0.3s ease;
      `;
      
      // Add icon or logo to bubble
      const bubbleIcon = document.createElement("div");
      if (config.theme.bubbleIcon) {
        bubbleIcon.innerHTML = config.theme.bubbleIcon;
      } else {
        bubbleIcon.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        `;
      }
      chatBubble.appendChild(bubbleIcon);
  
      // Create chat window (hidden by default)
      const chatWindow = document.createElement("div");
      chatWindow.id = "ai-chatbot-window";
      chatWindow.style.cssText = `
        position: absolute;
        ${config.position.includes("bottom") ? "bottom: 80px;" : "top: 80px;"}
        ${config.position.includes("right") ? "right: 0;" : "left: 0;"}
        width: 370px;
        height: 500px;
        background-color: white;
        border-radius: 16px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        display: none;
        flex-direction: column;
        overflow: hidden;
      `;
  
      // Chat header
      const chatHeader = document.createElement("div");
      chatHeader.style.cssText = `
        padding: 16px;
        background-color: ${config.theme.primaryColor};
        color: white;
        display: flex;
        align-items: center;
        justify-content: space-between;
      `;
      
      // Header title/logo
      const headerTitle = document.createElement("div");
      headerTitle.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      
      if (config.theme.logoUrl) {
        const logo = document.createElement("img");
        logo.src = config.theme.logoUrl;
        logo.style.cssText = `
          width: 24px;
          height: 24px;
          border-radius: 4px;
        `;
        headerTitle.appendChild(logo);
      }
      
      const title = document.createElement("span");
      title.textContent = "Chat Assistant";
      headerTitle.appendChild(title);
      chatHeader.appendChild(headerTitle);
      
      // Close button
      const closeButton = document.createElement("button");
      closeButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      closeButton.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
      `;
      chatHeader.appendChild(closeButton);
      chatWindow.appendChild(chatHeader);
      
      // Chat messages container
      const messagesContainer = document.createElement("div");
      messagesContainer.id = "ai-chatbot-messages";
      messagesContainer.style.cssText = `
        flex: 1;
        padding: 16px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      `;
      chatWindow.appendChild(messagesContainer);
      
      // Input area
      const inputContainer = document.createElement("div");
      inputContainer.style.cssText = `
        display: flex;
        padding: 12px 16px;
        border-top: 1px solid #eaeaea;
        background-color: white;
      `;
      
      // Text input
      const input = document.createElement("input");
      input.id = "ai-chatbot-input";
      input.type = "text";
      input.placeholder = config.i18n.placeholder;
      input.style.cssText = `
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #e0e0e0;
        border-radius: 20px;
        outline: none;
        font-family: inherit;
        font-size: 14px;
      `;
      
      // Send button
      const sendButton = document.createElement("button");
      sendButton.id = "ai-chatbot-send";
      sendButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="${config.theme.primaryColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      sendButton.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        padding: 0 8px;
        margin-left: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      `;
      
      inputContainer.appendChild(input);
      inputContainer.appendChild(sendButton);
      chatWindow.appendChild(inputContainer);
      
      // Add all elements to container
      container.appendChild(chatWindow);
      container.appendChild(chatBubble);
      
      // Append to body
      document.body.appendChild(container);
      
      // Return elements for event listeners
      return {
        container,
        chatBubble,
        chatWindow,
        closeButton,
        messagesContainer,
        input,
        sendButton
      };
    }
  
    // Add message to chat
    function addMessage(content, isUser) {
      const messagesEl = document.getElementById("ai-chatbot-messages");
      
      // Create message element
      const messageEl = document.createElement("div");
      messageEl.className = isUser ? "ai-chatbot-message-user" : "ai-chatbot-message-assistant";
      messageEl.style.cssText = `
        max-width: 80%;
        padding: 10px 14px;
        border-radius: ${isUser ? "18px 18px 0 18px" : "18px 18px 18px 0"};
        background-color: ${isUser ? config.theme.primaryColor : "#f0f0f0"};
        color: ${isUser ? "white" : "black"};
        align-self: ${isUser ? "flex-end" : "flex-start"};
        word-wrap: break-word;
      `;
      
      // Add message content
      messageEl.textContent = content;
      
      // Add to container
      messagesEl.appendChild(messageEl);
      
      // Scroll to bottom
      messagesEl.scrollTop = messagesEl.scrollHeight;
      
      // Save to state
      state.messages.push({
        content,
        isUser
      });
    }
  
    // Show loading indicator
    function showLoading() {
      state.isLoading = true;
      
      const messagesEl = document.getElementById("ai-chatbot-messages");
      
      // Create loading element
      const loadingEl = document.createElement("div");
      loadingEl.id = "ai-chatbot-loading";
      loadingEl.className = "ai-chatbot-message-assistant";
      loadingEl.style.cssText = `
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 18px 18px 18px 0;
        background-color: #f0f0f0;
        color: black;
        align-self: flex-start;
        display: flex;
        align-items: center;
      `;
      
      // Loading dots animation
      loadingEl.innerHTML = `
        <div class="ai-chatbot-loading-dots">
          <span style="animation-delay: 0s">.</span>
          <span style="animation-delay: 0.2s">.</span>
          <span style="animation-delay: 0.4s">.</span>
        </div>
      `;
      
      // Add style for animation
      const style = document.createElement("style");
      style.textContent = `
        .ai-chatbot-loading-dots {
          display: flex;
        }
        .ai-chatbot-loading-dots span {
          animation: ai-chatbot-loading 1.4s infinite both;
          font-size: 20px;
          line-height: 10px;
        }
        @keyframes ai-chatbot-loading {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      
      // Add to container
      messagesEl.appendChild(loadingEl);
      
      // Scroll to bottom
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  
    // Hide loading indicator
    function hideLoading() {
      state.isLoading = false;
      
      const loadingEl = document.getElementById("ai-chatbot-loading");
      if (loadingEl) {
        loadingEl.remove();
      }
    }
  
    // Show error message
    function showError(message) {
      state.error = message;
      
      const messagesEl = document.getElementById("ai-chatbot-messages");
      
      // Create error element
      const errorEl = document.createElement("div");
      errorEl.className = "ai-chatbot-message-error";
      errorEl.style.cssText = `
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 18px;
        background-color: #fee2e2;
        color: #b91c1c;
        align-self: center;
        margin: 8px 0;
        font-size: 13px;
      `;
      
      // Add error message
      errorEl.textContent = message || config.i18n.errorText;
      
      // Add to container
      messagesEl.appendChild(errorEl);
      
      // Scroll to bottom
      messagesEl.scrollTop = messagesEl.scrollHeight;
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        errorEl.remove();
        state.error = null;
      }, 5000);
    }
  
    // Send message to API
    async function sendMessage(message) {
      try {
        // Show loading
        showLoading();
        
        // Prepare visitor info
        const visitorInfo = {
          visitorId: state.visitorId,
          sourceUrl: window.location.href
        };
        
        // Call API
        const response = await fetch(`${config.apiUrl}/api/widget/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": config.apiKey
          },
          body: JSON.stringify({
            chatbotId: config.chatbotId,
            conversationId: state.conversationId,
            message,
            visitorInfo
          })
        });
        
        // Check for errors
        if (!response.ok) {
          throw new Error("Failed to send message");
        }
        
        // Parse response
        const data = await response.json();
        
        // Hide loading
        hideLoading();
        
        // Update state
        state.conversationId = data.conversationId;
        if (!state.visitorId) {
          state.visitorId = data.visitorId || `visitor_${Date.now()}`;
        }
        
        // Add assistant message to UI
        addMessage(data.message.content, false);
        
        // Track event
        trackEvent("message_sent");
        
      } catch (error) {
        console.error("Error sending message:", error);
        
        // Hide loading
        hideLoading();
        
        // Show error
        showError(error.message);
      }
    }
  
    // Track events for analytics
    async function trackEvent(eventType, eventData = {}) {
      try {
        await fetch(`${config.apiUrl}/api/widget/event`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": config.apiKey
          },
          body: JSON.stringify({
            chatbotId: config.chatbotId,
            conversationId: state.conversationId,
            visitorId: state.visitorId,
            eventType,
            eventData: {
              ...eventData,
              url: window.location.href,
              userAgent: navigator.userAgent
            }
          })
        });
      } catch (error) {
        console.error("Error tracking event:", error);
      }
    }
  
    // Initialize widget
    function initWidget() {
      // Generate visitor ID
      state.visitorId = `visitor_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      // Get chatbot ID from script tag
      const scriptTag = document.currentScript || document.getElementById("ai-chatbot-script");
      if (scriptTag) {
        config.chatbotId = scriptTag.getAttribute("data-chatbot-id");
        config.apiKey = scriptTag.getAttribute("data-api-key");
        
        // Get position if specified
        const position = scriptTag.getAttribute("data-position");
        if (position) {
          config.position = position;
        }
      }
      
      // Create widget elements
      const elements = createWidgetElements();
      
      // Add event listeners
      
      // Toggle chat window
      elements.chatBubble.addEventListener("click", () => {
        state.isOpen = !state.isOpen;
        elements.chatWindow.style.display = state.isOpen ? "flex" : "none";
        
        // If opening for the first time, add greeting
        if (state.isOpen && state.messages.length === 0) {
          addMessage(config.i18n.greeting, false);
          trackEvent("widget_opened");
        }
      });
      
      // Close chat window
      elements.closeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        state.isOpen = false;
        elements.chatWindow.style.display = "none";
        trackEvent("widget_closed");
      });
      
      // Send message on button click
      elements.sendButton.addEventListener("click", () => {
        const input = document.getElementById("ai-chatbot-input");
        const message = input.value.trim();
        
        if (message && !state.isLoading) {
          // Clear input
          input.value = "";
          
          // Add message to UI
          addMessage(message, true);
          
          // Send to API
          sendMessage(message);
        }
      });
      
      // Send message on Enter key
      elements.input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const message = e.target.value.trim();
          
          if (message && !state.isLoading) {
            // Clear input
            e.target.value = "";
            
            // Add message to UI
            addMessage(message, true);
            
            // Send to API
            sendMessage(message);
          }
        }
      });
      
      // Load widget configuration from API
      loadWidgetConfig();
    }
  
    // Load widget configuration from API
    async function loadWidgetConfig() {
      try {
        if (!config.chatbotId || !config.apiKey) {
          console.error("Missing chatbot ID or API key");
          return;
        }
        
        const response = await fetch(`${config.apiUrl}/api/widget/config?chatbotId=${config.chatbotId}`, {
          headers: {
            "X-API-Key": config.apiKey
          }
        });
        
        if (!response.ok) {
          throw new Error("Failed to load widget configuration");
        }
        
        const data = await response.json();
        
        // Update configuration
        if (data.theme) {
          config.theme = {
            ...config.theme,
            ...data.theme
          };
          
          // Update UI with new theme
          const bubble = document.getElementById("ai-chatbot-bubble");
          const header = document.querySelector("#ai-chatbot-window > div:first-child");
          
          if (bubble && data.theme.primaryColor) {
            bubble.style.backgroundColor = data.theme.primaryColor;
          }
          
          if (header && data.theme.primaryColor) {
            header.style.backgroundColor = data.theme.primaryColor;
          }
          
          if (data.theme.logoUrl) {
            const headerTitle = document.querySelector("#ai-chatbot-window > div:first-child > div:first-child");
            if (headerTitle) {
              let logo = headerTitle.querySelector("img");
              
              if (!logo) {
                logo = document.createElement("img");
                logo.style.cssText = `
                  width: 24px;
                  height: 24px;
                  border-radius: 4px;
                `;
                headerTitle.insertBefore(logo, headerTitle.firstChild);
              }
              
              logo.src = data.theme.logoUrl;
            }
          }
        }
        
        if (data.i18n) {
          config.i18n = {
            ...config.i18n,
            ...data.i18n
          };
          
          // Update UI with new texts
          const input = document.getElementById("ai-chatbot-input");
          if (input && data.i18n.placeholder) {
            input.placeholder = data.i18n.placeholder;
          }
        }
        
        // Track widget loaded event
        trackEvent("widget_loaded");
        
      } catch (error) {
        console.error("Error loading widget configuration:", error);
      }
    }
  
    // Initialize on load
    if (document.readyState === "complete" || document.readyState === "interactive") {
      initWidget();
    } else {
      window.addEventListener("DOMContentLoaded", initWidget);
    }
  })();