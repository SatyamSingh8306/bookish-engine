/**
 * AI Chat Widget - A lightweight, performant chat interface for AI-powered conversations
 * @module AIChatWidget
 */
; (function () {
    'use strict';

    // Constants
    const DEFAULT_API_TIMEOUT = 10000;
    const MAX_MESSAGE_LENGTH = 2000;
    const MESSAGE_THROTTLE_MS = 500;
    const STORAGE_KEY_PREFIX = 'ai_chat_';

    /**
     * Generate a unique session/history ID
     * @returns {string} Unique ID
     */
    function generateSessionId() {
        const timestamp = Date.now().toString(36);
        const randomPart = Math.random().toString(36).substring(2, 10);
        return `session_${timestamp}_${randomPart}`;
    }

    /**
     * Main Chat Widget Class
     */
    class AIChatWidget {
        /**
         * @param {Object} config - Configuration options
         * @param {string} config.clientId - Client/application identifier (fixed per client)
         * @param {string} config.apiUrl - Base URL for API endpoints
         * @param {string} [config.sessionId] - Optional session ID (auto-generated if not provided)
         * @param {Object} [config.options] - Additional options
         */
        constructor({ clientId, apiUrl, sessionId, options = {} }) {
            if (!clientId || !apiUrl) {
                throw new Error('Missing required configuration parameters: clientId and apiUrl');
            }

            this.clientId = clientId;
            this.apiUrl = apiUrl.normalizeEnding();

            // AUTO-GENERATE new sessionId (userId) on every page load
            this.sessionId = sessionId || generateSessionId();

            console.log('🆕 New Chat Session Created:', this.sessionId);

            this.options = {
                timeout: DEFAULT_API_TIMEOUT,
                theme: 'light',
                ...options
            };

            this.state = {
                isOpen: false,
                isLoading: false,
                messages: [],
                pendingMessage: null
            };

            this.dom = {};
            this.eventHandlers = {};
            this.throttledSend = this.throttle(this.sendMessage.bind(this), MESSAGE_THROTTLE_MS);

            this.initialize();
        }

        /**
         * Initialize the widget
         */
        initialize() {
            try {
                this.injectStyles();
                this.injectUI();
                this.bindEvents();
                this.renderMessages();
            } catch (error) {
                console.error('AIChatWidget initialization failed:', error);
                this.showError('Initialization error. Please refresh the page.');
            }
        }

        /**
         * Get current session ID
         * @returns {string} Current session ID
         */
        getSessionId() {
            return this.sessionId;
        }

        /**
         * Start a new chat session manually
         * @returns {string} New session ID
         */
        startNewChat() {
            this.sessionId = generateSessionId();
            this.state.messages = [];
            this.state.pendingMessage = null;
            this.renderMessages();
            console.log('🆕 New Chat Session Started:', this.sessionId);
            return this.sessionId;
        }

        /**
         * Inject CSS styles into the document
         */
        injectStyles() {
            const css = `
        #ai-chat-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 55px;
          height: 55px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
          background: ${this.options.theme === 'dark' ? '#374151' : '#4f46e5'};
          color: white;
        }

        #ai-chat-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        #ai-chat-box {
          display: none;
          position: fixed;
          bottom: 90px;
          right: 20px;
          width: 320px;
          max-height: 500px;
          background: ${this.options.theme === 'dark' ? '#1f2937' : 'white'};
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          padding: 12px;
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid ${this.options.theme === 'dark' ? '#374151' : '#e5e7eb'};
        }

        #ai-chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid ${this.options.theme === 'dark' ? '#374151' : '#e5e7eb'};
        }

        #ai-chat-title {
          font-weight: 600;
          color: ${this.options.theme === 'dark' ? 'white' : '#1f2937'};
          font-size: 14px;
        }

        .ai-chat-header-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        #ai-chat-new {
          background: none;
          border: none;
          color: ${this.options.theme === 'dark' ? '#9ca3af' : '#6b7280'};
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        #ai-chat-new:hover {
          background: ${this.options.theme === 'dark' ? '#374151' : '#f3f4f6'};
        }

        #ai-chat-close {
          background: none;
          border: none;
          color: ${this.options.theme === 'dark' ? '#9ca3af' : '#6b7280'};
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
        }

        #ai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 5px;
          font-size: 14px;
          margin-bottom: 8px;
          min-height: 200px;
          max-height: 350px;
          -webkit-overflow-scrolling: touch;
        }

        .ai-msg {
          padding: 8px 12px;
          border-radius: 8px;
          margin: 4px 0;
          max-width: 85%;
          word-wrap: break-word;
          line-height: 1.4;
        }

        .ai-msg.bot {
          background: ${this.options.theme === 'dark' ? '#374151' : '#f3f4f6'};
          color: ${this.options.theme === 'dark' ? 'white' : '#1f2937'};
          align-self: flex-start;
        }

        .ai-msg.user {
          background: ${this.options.theme === 'dark' ? '#4f46e5' : '#4f46e5'};
          color: white;
          align-self: flex-end;
          margin-left: auto;
        }

        .ai-msg.error {
          background: #fecaca;
          color: #991b1b;
          align-self: center;
          width: auto;
          padding: 6px 10px;
          font-size: 12px;
        }

        .ai-msg.loading {
          color: ${this.options.theme === 'dark' ? '#9ca3af' : '#6b7280'};
          font-style: italic;
          text-align: center;
          background: transparent;
          padding: 4px;
        }

        #ai-chat-input {
          display: flex;
          gap: 6px;
          margin-top: 5px;
        }

        #ai-input {
          flex: 1;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid ${this.options.theme === 'dark' ? '#374151' : '#d1d5db'};
          background: ${this.options.theme === 'dark' ? '#374151' : 'white'};
          color: ${this.options.theme === 'dark' ? 'white' : '#1f2937'};
          outline: none;
          font-size: 14px;
        }

        #ai-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 1px #4f46e5;
        }

        #ai-send {
          padding: 8px 14px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s ease;
        }

        #ai-send:hover {
          background: #4338ca;
        }

        #ai-send:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
        }

        .ai-typing-indicator {
          display: flex;
          padding: 8px;
          gap: 3px;
        }

        .ai-typing-dot {
          width: 6px;
          height: 6px;
          background: #9ca3af;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .ai-typing-dot:nth-child(1) { animation-delay: 0s; }
        .ai-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .ai-typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }

        @media (max-width: 360px) {
          #ai-chat-box {
            width: calc(100vw - 30px);
            right: 15px;
            max-height: 60vh;
          }
        }
      `;

            const style = document.createElement('style');
            style.id = 'ai-chat-styles';
            style.textContent = css;
            document.head.appendChild(style);
        }

        /**
         * Inject UI elements into the document
         */
        injectUI() {
            const chatBox = document.createElement('div');
            chatBox.id = 'ai-chat-box';
            chatBox.setAttribute('role', 'dialog');
            chatBox.setAttribute('aria-label', 'AI Chat');
            chatBox.setAttribute('aria-hidden', 'true');

            chatBox.innerHTML = `
        <div id="ai-chat-header">
          <div id="ai-chat-title">AI Assistant</div>
          <div class="ai-chat-header-actions">
            <button id="ai-chat-new" aria-label="Start new chat" title="New Chat" style="background-color:orange">**New</button>
            <button id="ai-chat-close" aria-label="Close chat">×</button>
          </div>
        </div>
        <div id="ai-chat-messages"></div>
        <div id="ai-chat-input">
          <input
            id="ai-input"
            type="text"
            placeholder="Ask something..."
            aria-label="Type your message"
            maxlength="${MAX_MESSAGE_LENGTH}"
          />
          <button id="ai-send" disabled>→</button>
        </div>
      `;

            const chatButton = document.createElement('button');
            chatButton.id = 'ai-chat-btn';
            chatButton.setAttribute('aria-label', 'Open AI Chat');
            chatButton.textContent = '💬';

            document.body.appendChild(chatBox);
            document.body.appendChild(chatButton);

            // Cache DOM elements
            this.dom = {
                chatBox,
                chatButton,
                messagesContainer: chatBox.querySelector('#ai-chat-messages'),
                input: chatBox.querySelector('#ai-input'),
                sendButton: chatBox.querySelector('#ai-send'),
                closeButton: chatBox.querySelector('#ai-chat-close'),
                newChatButton: chatBox.querySelector('#ai-chat-new')
            };
        }

        /**
         * Bind all event handlers
         */
        bindEvents() {
            this.eventHandlers.toggleChat = () => this.toggleChat();
            this.dom.chatButton.addEventListener('click', this.eventHandlers.toggleChat);
            this.dom.closeButton.addEventListener('click', this.eventHandlers.toggleChat);

            this.eventHandlers.newChat = () => this.startNewChat();
            this.dom.newChatButton.addEventListener('click', this.eventHandlers.newChat);

            this.eventHandlers.sendMessage = () => this.throttledSend();
            this.dom.sendButton.addEventListener('click', this.eventHandlers.sendMessage);

            this.eventHandlers.handleKeyPress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.throttledSend();
                }
            };
            this.dom.input.addEventListener('keypress', this.eventHandlers.handleKeyPress);

            this.eventHandlers.handleInput = () => {
                this.dom.sendButton.disabled = !this.dom.input.value.trim();
            };
            this.dom.input.addEventListener('input', this.eventHandlers.handleInput);

            this.eventHandlers.handleResize = this.debounce(() => {
                this.adjustForViewport();
            }, 100);
            window.addEventListener('resize', this.eventHandlers.handleResize);
        }

        /**
         * Toggle chat visibility
         */
        toggleChat() {
            this.state.isOpen = !this.state.isOpen;
            this.dom.chatBox.style.display = this.state.isOpen ? 'flex' : 'none';
            this.dom.chatBox.setAttribute('aria-hidden', !this.state.isOpen);

            if (this.state.isOpen) {
                this.dom.input.focus();
                this.adjustForViewport();
            }
        }

        /**
         * Adjust chat position for small viewports
         */
        adjustForViewport() {
            if (window.innerWidth <= 360) {
                this.dom.chatBox.style.bottom = '100px';
            } else {
                this.dom.chatBox.style.bottom = '90px';
            }
        }

        /**
         * Render all messages to the DOM
         */
        renderMessages() {
            if (!this.dom.messagesContainer) return;

            this.dom.messagesContainer.innerHTML = '';

            this.state.messages.forEach(msg => {
                this.renderMessage(msg);
            });

            if (this.state.pendingMessage) {
                this.renderMessage(this.state.pendingMessage);
            }

            this.scrollToBottom();
        }

        /**
         * Render a single message
         * @param {Object} message - Message object
         */
        renderMessage(message) {
            const messageElement = document.createElement('div');
            messageElement.className = `ai-msg ${message.sender}`;

            if (message.sender === 'bot' && message.isTyping) {
                messageElement.className += ' loading';
                messageElement.innerHTML = `
          <div class="ai-typing-indicator">
            <div class="ai-typing-dot"></div>
            <div class="ai-typing-dot"></div>
            <div class="ai-typing-dot"></div>
          </div>
        `;
            } else if (message.sender === 'error') {
                messageElement.className += ' error';
                messageElement.textContent = message.text;
            } else {
                messageElement.textContent = message.text;
            }

            this.dom.messagesContainer.appendChild(messageElement);
        }

        /**
         * Scroll messages container to bottom
         */
        scrollToBottom() {
            this.dom.messagesContainer.scrollTop = this.dom.messagesContainer.scrollHeight;
        }

        /**
         * Add a message to the state
         * @param {string} text - Message text
         * @param {string} sender - Message sender ('user' or 'bot')
         * @param {boolean} [isTyping=false] - Whether this is a typing indicator
         */
        addMessage(text, sender, isTyping = false) {
            const message = {
                text: this.sanitizeInput(text),
                sender,
                timestamp: new Date(),
                isTyping
            };

            if (isTyping) {
                this.state.pendingMessage = message;
            } else {
                this.state.messages.push(message);
                this.state.pendingMessage = null;
            }

            this.renderMessages();
        }

        /**
         * Show an error message
         * @param {string} message - Error message
         */
        showError(message) {
            this.addMessage(message, 'error');
            console.error('AIChatWidget Error:', message);
        }

        /**
         * Sanitize user input to prevent XSS
         * @param {string} input - User input
         * @returns {string} Sanitized input
         */
        sanitizeInput(input) {
            if (typeof input !== 'string') return '';
            return input
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        /**
         * Throttle function calls
         */
        throttle(func, limit) {
            let inThrottle = false;
            let lastArgs = null;

            return function (...args) {
                if (!inThrottle) {
                    func.apply(this, args);
                    inThrottle = true;
                    setTimeout(() => {
                        inThrottle = false;
                        if (lastArgs) {
                            func.apply(this, lastArgs);
                            lastArgs = null;
                        }
                    }, limit);
                } else {
                    lastArgs = args;
                }
            };
        }

        /**
         * Debounce function calls
         */
        debounce(func, wait) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        /**
         * Validate message before sending
         */
        validateMessage(text) {
            if (!text || typeof text !== 'string') return false;
            const trimmed = text.trim();
            return trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;
        }

        /**
         * Send message to API
         */
        async sendMessage() {
            const inputValue = this.dom.input.value.trim();

            if (!this.validateMessage(inputValue)) {
                return;
            }

            if (this.state.isLoading) {
                return;
            }

            this.addMessage(inputValue, 'user');
            this.dom.input.value = '';
            this.dom.sendButton.disabled = true;

            this.addMessage('', 'bot', true);
            this.state.isLoading = true;

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

                // API Request - sessionId is sent as "userid"
                const response = await fetch(`${this.apiUrl}/api/agent-chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        userid: this.sessionId,    // Auto-generated session ID
                        clientid: this.clientId,   // Fixed client identifier
                        query: inputValue
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (!data || typeof data.reply !== 'string') {
                    throw new Error('Invalid response format');
                }

                this.addMessage(data.reply, 'bot');
            } catch (error) {
                console.error('API request failed:', error);
                this.showError(this.getErrorMessage(error));
            } finally {
                this.state.isLoading = false;
            }
        }

        /**
         * Get user-friendly error message
         */
        getErrorMessage(error) {
            if (error.name === 'AbortError') {
                return 'Request timed out. Please try again.';
            } else if (error.message.includes('HTTP error! status:')) {
                return 'Service unavailable. Please try again later.';
            } else if (error.message.includes('Failed to fetch')) {
                return 'Network error. Please check your connection.';
            } else {
                return 'An error occurred. Please try again.';
            }
        }

        /**
         * Clean up resources
         */
        destroy() {
            this.dom.chatButton.removeEventListener('click', this.eventHandlers.toggleChat);
            this.dom.closeButton.removeEventListener('click', this.eventHandlers.toggleChat);
            this.dom.newChatButton.removeEventListener('click', this.eventHandlers.newChat);
            this.dom.sendButton.removeEventListener('click', this.eventHandlers.sendMessage);
            this.dom.input.removeEventListener('keypress', this.eventHandlers.handleKeyPress);
            this.dom.input.removeEventListener('input', this.eventHandlers.handleInput);
            window.removeEventListener('resize', this.eventHandlers.handleResize);

            if (this.dom.chatBox && this.dom.chatBox.parentNode) {
                this.dom.chatBox.parentNode.removeChild(this.dom.chatBox);
            }
            if (this.dom.chatButton && this.dom.chatButton.parentNode) {
                this.dom.chatButton.parentNode.removeChild(this.dom.chatButton);
            }

            const styleElement = document.getElementById('ai-chat-styles');
            if (styleElement && styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }

            this.dom = {};
            this.eventHandlers = {};
        }
    }

    /**
     * Helper to normalize URL endings
     */
    String.prototype.normalizeEnding = function () {
        return this.replace(/\/+$/, '');
    };

    /**
     * Auto-initialize widget from script attributes
     */
    function autoInitialize() {
        const script = document.currentScript;
        if (!script) return;

        const clientId = script.getAttribute('data-client');
        const apiUrl = script.getAttribute('data-api');
        const theme = script.getAttribute('data-theme') || 'light';

        // data-user is NO LONGER needed - sessionId is auto-generated

        if (clientId && apiUrl) {
            window.aiChatWidget = new AIChatWidget({
                clientId,
                apiUrl,
                options: {
                    theme
                }
            });
        } else {
            console.error('AIChatWidget: Missing required data attributes (data-client, data-api)');
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitialize);
    } else {
        autoInitialize();
    }

    // Export for manual initialization
    window.AIChatWidget = AIChatWidget;
})();