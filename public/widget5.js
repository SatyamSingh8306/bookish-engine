/**
 * AI Chat Widget - Enhanced Version
 * Features improved UI/UX, dynamic data refresh, and modern styling
 */
; (function () {
    'use strict';

    // Constants
    const DEFAULT_API_TIMEOUT = 10000;
    const MAX_MESSAGE_LENGTH = 2000;
    const MESSAGE_THROTTLE_MS = 500;
    const STORAGE_KEY_PREFIX = 'ai_chat_';
    const AUTO_REFRESH_INTERVAL = 300000; // 5 minutes

    /**
     * Enhanced Chat Widget Class
     */
    class AIChatWidget {
        constructor({ userId, clientId, apiUrl, options = {} }) {
            if (!userId || !clientId || !apiUrl) {
                throw new Error('Missing required configuration parameters');
            }

            this.userId = userId;
            this.clientId = clientId;
            this.apiUrl = apiUrl.normalizeEnding();
            this.options = {
                timeout: DEFAULT_API_TIMEOUT,
                persistHistory: true,
                theme: 'light',
                autoRefresh: false,
                ...options
            };

            this.state = {
                isOpen: false,
                isLoading: false,
                messages: [],
                pendingMessage: null,
                lastRefresh: Date.now()
            };

            this.dom = {};
            this.eventHandlers = {};
            this.throttledSend = this.throttle(this.sendMessage.bind(this), MESSAGE_THROTTLE_MS);
            this.refreshInterval = null;

            this.initialize();
        }

        initialize() {
            try {
                this.loadPersistedState();
                this.injectStyles();
                this.injectUI();
                this.bindEvents();
                this.renderMessages();

                if (this.options.autoRefresh) {
                    this.startAutoRefresh();
                }
            } catch (error) {
                console.error('AIChatWidget initialization failed:', error);
                this.showError('Initialization error. Please refresh the page.');
            }
        }

        loadPersistedState() {
            if (!this.options.persistHistory) return;

            try {
                const storageKey = this.getStorageKey('messages');
                const metadataKey = this.getStorageKey('metadata');
                const persisted = localStorage.getItem(storageKey);
                const metadata = JSON.parse(localStorage.getItem(metadataKey) || '{}');

                if (persisted) {
                    this.state.messages = JSON.parse(persisted);
                }
                this.state.lastRefresh = metadata.lastRefresh || Date.now();
            } catch (error) {
                console.warn('Failed to load persisted state:', error);
            }
        }

        persistState() {
            if (!this.options.persistHistory) return;

            try {
                const storageKey = this.getStorageKey('messages');
                const metadataKey = this.getStorageKey('metadata');
                localStorage.setItem(storageKey, JSON.stringify(this.state.messages));
                localStorage.setItem(metadataKey, JSON.stringify({
                    lastRefresh: this.state.lastRefresh,
                    messageCount: this.state.messages.length
                }));
            } catch (error) {
                console.warn('Failed to persist state:', error);
            }
        }

        getStorageKey(key) {
            return `${STORAGE_KEY_PREFIX}${this.clientId}_${this.userId}_${key}`;
        }

        injectStyles() {
            const css = `
        :root {
          --primary-color: #6366f1;
          --primary-hover: #4f46e5;
          --user-color: var(--primary-color);
          --bot-color: #f3f4f6;
          --error-color: #fecaca;
          --text-primary: #111827;
          --text-secondary: #6b7280;
          --border-color: #e5e7eb;
          --shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        [data-theme="dark"] {
          --primary-color: #818cf8;
          --primary-hover: #6366f1;
          --user-color: var(--primary-color);
          --bot-color: #374151;
          --error-color: #7f1d1d;
          --text-primary: #f9fafb;
          --text-secondary: #9ca3af;
          --border-color: #4b5563;
          --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        #ai-chat-widget-container {
          position: relative;
          z-index: 9999;
        }

        #ai-chat-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: var(--shadow);
          transition: var(--transition);
          background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
          color: white;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        #ai-chat-btn:hover {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
        }

        #ai-chat-btn.pulse {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
          70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }

        #ai-chat-box {
          display: none;
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: 380px;
          height: 600px;
          max-height: calc(100vh - 140px);
          background: ${this.options.theme === 'dark' ? '#1f2937' : 'white'};
          border-radius: 16px;
          box-shadow: var(--shadow);
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          flex-direction: column;
          overflow: hidden;
          transition: var(--transition);
          transform: translateY(20px) scale(0.95);
          opacity: 0;
          border: 1px solid var(--border-color);
        }

        #ai-chat-box.open {
          display: flex;
          transform: translateY(0) scale(1);
          opacity: 1;
        }

        #ai-chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, var(--primary-color), var(--primary-hover));
          color: white;
        }

        #ai-chat-title {
          font-weight: 600;
          font-size: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        #ai-chat-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }

        #ai-chat-controls {
          display: flex;
          gap: 8px;
        }

        .ai-chat-control-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          transition: background 0.2s ease;
          font-size: 16px;
        }

        .ai-chat-control-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        #ai-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }

        #ai-chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        #ai-chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        #ai-chat-messages::-webkit-scrollbar-thumb {
          background: var(--text-secondary);
          border-radius: 3px;
        }

        .message-wrapper {
          display: flex;
          margin: 12px 0;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .message-wrapper.user {
          justify-content: flex-end;
        }

        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          margin: 0 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          flex-shrink: 0;
        }

        .message-wrapper.bot .message-avatar {
          background: var(--bot-color);
          color: var(--text-secondary);
        }

        .message-wrapper.user .message-avatar {
          background: var(--user-color);
          color: white;
        }

        .ai-msg {
          padding: 12px 16px;
          border-radius: 18px;
          max-width: 75%;
          word-wrap: break-word;
          line-height: 1.5;
          font-size: 14px;
          position: relative;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .message-wrapper.bot .ai-msg {
          background: var(--bot-color);
          color: var(--text-primary);
          border-bottom-left-radius: 6px;
        }

        .message-wrapper.user .ai-msg {
          background: var(--user-color);
          color: white;
          border-bottom-right-radius: 6px;
        }

        .ai-msg.error {
          background: var(--error-color);
          color: #7f1d1d;
          align-self: center;
          width: auto;
          padding: 8px 12px;
          font-size: 12px;
          border-radius: 8px;
        }

        .ai-msg.loading {
          background: transparent;
          padding: 8px;
        }

        .ai-typing-indicator {
          display: flex;
          padding: 4px 8px;
          gap: 4px;
        }

        .ai-typing-dot {
          width: 8px;
          height: 8px;
          background: var(--text-secondary);
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
        }

        .message-timestamp {
          font-size: 10px;
          color: var(--text-secondary);
          margin-top: 4px;
          text-align: right;
        }

        #ai-chat-input {
          display: flex;
          gap: 8px;
          padding: 16px;
          border-top: 1px solid var(--border-color);
          background: ${this.options.theme === 'dark' ? '#1f2937' : 'white'};
        }

        #ai-input {
          flex: 1;
          padding: 12px 16px;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          background: ${this.options.theme === 'dark' ? '#374151' : '#f9fafb'};
          color: var(--text-primary);
          outline: none;
          font-size: 14px;
          transition: var(--transition);
        }

        #ai-input:focus {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        #ai-send {
          padding: 12px 18px;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 500;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        #ai-send:hover {
          background: var(--primary-hover);
          transform: scale(1.05);
        }

        #ai-send:disabled {
          background: #a5b4fc;
          cursor: not-allowed;
          transform: scale(1);
        }

        .ai-send-icon {
          font-size: 16px;
        }

        @media (max-width: 480px) {
          #ai-chat-box {
            width: calc(100vw - 32px);
            right: 16px;
            height: calc(100vh - 120px);
            max-height: none;
          }
          
          #ai-chat-btn {
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
          }
        }

        .notification-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: bold;
        }
      `;

            const style = document.createElement('style');
            style.id = 'ai-chat-styles';
            style.textContent = css;
            document.head.appendChild(style);
        }

        injectUI() {
            const container = document.createElement('div');
            container.id = 'ai-chat-widget-container';

            const chatBox = document.createElement('div');
            chatBox.id = 'ai-chat-box';
            chatBox.setAttribute('role', 'dialog');
            chatBox.setAttribute('aria-label', 'AI Assistant Chat');
            chatBox.setAttribute('aria-hidden', 'true');
            chatBox.setAttribute('data-theme', this.options.theme);

            chatBox.innerHTML = `
        <div id="ai-chat-header">
          <div id="ai-chat-title">
            <div id="ai-chat-avatar">🤖</div>
            <span>AI Assistant</span>
          </div>
          <div id="ai-chat-controls">
            <button class="ai-chat-control-btn" id="ai-refresh-btn" title="Refresh data" aria-label="Refresh data"></button>
            <button class="ai-chat-control-btn" id="ai-clear-btn" title="Clear chat" aria-label="Clear chat">🗑️</button>
            <button class="ai-chat-control-btn" id="ai-chat-close" aria-label="Close chat">✕</button>
          </div>
        </div>
        <div id="ai-chat-messages"></div>
        <div id="ai-chat-input">
          <input
            id="ai-input"
            type="text"
            placeholder="Type your message..."
            aria-label="Type your message"
            maxlength="${MAX_MESSAGE_LENGTH}"
            autocomplete="off"
          />
          <button id="ai-send" disabled>
            <span class="ai-send-icon">→</span>
          </button>
        </div>
      `;

            const chatButton = document.createElement('button');
            chatButton.id = 'ai-chat-btn';
            chatButton.setAttribute('aria-label', 'Open AI Assistant Chat');
            chatButton.innerHTML = '💬<span class="notification-badge" id="ai-notification" style="display: none;"></span>';

            container.appendChild(chatBox);
            container.appendChild(chatButton);
            document.body.appendChild(container);

            this.dom = {
                container,
                chatBox,
                chatButton,
                messagesContainer: chatBox.querySelector('#ai-chat-messages'),
                input: chatBox.querySelector('#ai-input'),
                sendButton: chatBox.querySelector('#ai-send'),
                closeButton: chatBox.querySelector('#ai-chat-close'),
                refreshBtn: chatBox.querySelector('#ai-refresh-btn'),
                clearBtn: chatBox.querySelector('#ai-clear-btn'),
                notificationBadge: chatButton.querySelector('#ai-notification'),
                header: chatBox.querySelector('#ai-chat-header')
            };
        }

        bindEvents() {
            // Toggle chat
            this.eventHandlers.toggleChat = () => this.toggleChat();
            this.dom.chatButton.addEventListener('click', this.eventHandlers.toggleChat);
            this.dom.closeButton.addEventListener('click', this.eventHandlers.toggleChat);

            // Send message
            this.eventHandlers.sendMessage = () => this.throttledSend();
            this.dom.sendButton.addEventListener('click', this.eventHandlers.sendMessage);

            // Enter key
            this.eventHandlers.handleKeyPress = (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.throttledSend();
                }
            };
            this.dom.input.addEventListener('keypress', this.eventHandlers.handleKeyPress);

            // Input handling
            this.eventHandlers.handleInput = () => {
                this.dom.sendButton.disabled = !this.dom.input.value.trim();
            };
            this.dom.input.addEventListener('input', this.eventHandlers.handleInput);

            // Refresh and clear
            this.eventHandlers.handleRefresh = () => this.refreshUserData();
            this.dom.refreshBtn.addEventListener('click', this.eventHandlers.handleRefresh);

            this.eventHandlers.handleClear = () => this.clearChat();
            this.dom.clearBtn.addEventListener('click', this.eventHandlers.handleClear);

            // Resize
            this.eventHandlers.handleResize = this.debounce(() => {
                this.adjustForViewport();
            }, 100);
            window.addEventListener('resize', this.eventHandlers.handleResize);

            // Click outside to close
            this.eventHandlers.handleClickOutside = (e) => {
                if (this.state.isOpen &&
                    !this.dom.chatBox.contains(e.target) &&
                    !this.dom.chatButton.contains(e.target)) {
                    this.toggleChat();
                }
            };
            document.addEventListener('click', this.eventHandlers.handleClickOutside);
        }

        toggleChat() {
            this.state.isOpen = !this.state.isOpen;

            if (this.state.isOpen) {
                this.dom.chatBox.classList.add('open');
                this.dom.input.focus();
                this.adjustForViewport();
                this.hideNotification();
            } else {
                this.dom.chatBox.classList.remove('open');
            }

            this.dom.chatBox.setAttribute('aria-hidden', !this.state.isOpen);
        }

        adjustForViewport() {
            const isMobile = window.innerWidth <= 480;
            if (isMobile) {
                this.dom.chatBox.style.bottom = '100px';
            } else {
                this.dom.chatBox.style.bottom = '100px';
            }
        }

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

        renderMessage(message) {
            const wrapper = document.createElement('div');
            wrapper.className = `message-wrapper ${message.sender}`;

            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = message.sender === 'user' ? '👤' : '🤖';

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
                messageElement.textContent = this.sanitizeInput(message.text);

                // Add timestamp
                const timestamp = document.createElement('div');
                timestamp.className = 'message-timestamp';
                timestamp.textContent = this.formatTimestamp(message.timestamp);
                messageElement.appendChild(timestamp);
            }

            wrapper.appendChild(avatar);
            wrapper.appendChild(messageElement);
            this.dom.messagesContainer.appendChild(wrapper);
        }

        formatTimestamp(date) {
            const d = new Date(date);
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        scrollToBottom() {
            this.dom.messagesContainer.scrollTop = this.dom.messagesContainer.scrollHeight;
        }

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
                this.persistState();
            }

            this.renderMessages();

            // Show notification if chat is closed
            if (!this.state.isOpen && sender === 'bot' && !isTyping) {
                this.showNotification();
            }
        }

        showNotification() {
            const badge = this.dom.notificationBadge;
            const current = parseInt(badge.textContent) || 0;
            badge.textContent = current + 1;
            badge.style.display = 'flex';
            this.dom.chatButton.classList.add('pulse');
        }

        hideNotification() {
            this.dom.notificationBadge.style.display = 'none';
            this.dom.notificationBadge.textContent = '';
            this.dom.chatButton.classList.remove('pulse');
        }

        showError(message) {
            this.addMessage(message, 'error');
            console.error('AIChatWidget Error:', message);
        }

        sanitizeInput(input) {
            if (typeof input !== 'string') return '';
            return input
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

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

        debounce(func, wait) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }

        validateMessage(text) {
            if (!text || typeof text !== 'string') return false;
            const trimmed = text.trim();
            return trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;
        }

        async sendMessage() {
            const inputValue = this.dom.input.value.trim();

            if (!this.validateMessage(inputValue) || this.state.isLoading) {
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

                const response = await fetch(`${this.apiUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        userid: this.userId,
                        clientid: this.clientId,
                        query: inputValue,
                        timestamp: new Date().toISOString()
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
         * Refresh user data from script attributes
         */
        refreshUserData() {
            try {
                const script = document.querySelector('script[src*="widget.js"]');
                if (!script) {
                    throw new Error('Script element not found');
                }

                const newUserId = script.getAttribute('data-user');
                const newClientId = script.getAttribute('data-client');
                const newApiUrl = script.getAttribute('data-api');
                const newTheme = script.getAttribute('data-theme') || 'light';

                if (newUserId && newClientId && newApiUrl) {
                    // Update configuration
                    this.userId = newUserId;
                    this.clientId = newClientId;
                    this.apiUrl = newApiUrl.normalizeEnding();
                    this.options.theme = newTheme;

                    // Update theme
                    this.dom.chatBox.setAttribute('data-theme', newTheme);

                    // Reload state with new keys
                    this.clearChat(false); // Clear display but don't clear storage
                    this.loadPersistedState();
                    this.renderMessages();

                    this.state.lastRefresh = Date.now();
                    this.persistState();

                    this.addMessage('Data refreshed successfully!', 'bot');
                    console.log('User data refreshed:', { userId: this.userId, clientId: this.clientId });
                } else {
                    throw new Error('Missing required data attributes');
                }
            } catch (error) {
                console.error('Failed to refresh user data:', error);
                this.showError('Failed to refresh data. Check console for details.');
            }
        }

        /**
         * Clear chat history
         * @param {boolean} clearStorage - Whether to clear localStorage
         */
        clearChat(clearStorage = true) {
            this.state.messages = [];
            this.state.pendingMessage = null;
            this.renderMessages();

            if (clearStorage && this.options.persistHistory) {
                try {
                    const messagesKey = this.getStorageKey('messages');
                    const metadataKey = this.getStorageKey('metadata');
                    localStorage.removeItem(messagesKey);
                    localStorage.removeItem(metadataKey);
                } catch (error) {
                    console.warn('Failed to clear storage:', error);
                }
            }

            this.addMessage('Chat history cleared.', 'bot');
        }

        /**
         * Start auto-refresh interval
         */
        startAutoRefresh() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }

            this.refreshInterval = setInterval(() => {
                this.refreshUserData();
            }, AUTO_REFRESH_INTERVAL);

            console.log(`Auto-refresh started: ${AUTO_REFRESH_INTERVAL}ms interval`);
        }

        /**
         * Stop auto-refresh
         */
        stopAutoRefresh() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
                console.log('Auto-refresh stopped');
            }
        }

        destroy() {
            this.stopAutoRefresh();

            // Remove all event listeners
            Object.keys(this.eventHandlers).forEach(key => {
                const handler = this.eventHandlers[key];
                if (key === 'toggleChat') {
                    this.dom.chatButton.removeEventListener('click', handler);
                    this.dom.closeButton.removeEventListener('click', handler);
                } else if (key === 'sendMessage') {
                    this.dom.sendButton.removeEventListener('click', handler);
                } else if (key === 'handleKeyPress') {
                    this.dom.input.removeEventListener('keypress', handler);
                } else if (key === 'handleInput') {
                    this.dom.input.removeEventListener('input', handler);
                } else if (key === 'handleResize') {
                    window.removeEventListener('resize', handler);
                } else if (key === 'handleClickOutside') {
                    document.removeEventListener('click', handler);
                } else if (key === 'handleRefresh') {
                    this.dom.refreshBtn.removeEventListener('click', handler);
                } else if (key === 'handleClear') {
                    this.dom.clearBtn.removeEventListener('click', handler);
                }
            });

            // Remove DOM elements
            if (this.dom.container && this.dom.container.parentNode) {
                this.dom.container.parentNode.removeChild(this.dom.container);
            }

            // Remove styles
            const styleElement = document.getElementById('ai-chat-styles');
            if (styleElement && styleElement.parentNode) {
                styleElement.parentNode.removeChild(styleElement);
            }

            this.dom = {};
            this.eventHandlers = {};
        }
    }

    String.prototype.normalizeEnding = function () {
        return this.replace(/\/+$/, '');
    };

    function autoInitialize() {
        const script = document.currentScript ||
            document.querySelector('script[src*="widget.js"]');
        if (!script) return;

        const userId = script.getAttribute('data-user');
        const clientId = script.getAttribute('data-client');
        const apiUrl = script.getAttribute('data-api');
        const theme = script.getAttribute('data-theme') || 'light';
        const persistHistory = script.getAttribute('data-persist') !== 'false';
        const autoRefresh = script.getAttribute('data-auto-refresh') === 'true';

        if (userId && clientId && apiUrl) {
            window.aiChatWidget = new AIChatWidget({
                userId,
                clientId,
                apiUrl,
                options: {
                    theme,
                    persistHistory,
                    autoRefresh
                }
            });

            console.log('AI Chat Widget initialized:', { userId, clientId, theme, autoRefresh });
        } else {
            console.error('AIChatWidget: Missing required data attributes (data-user, data-client, data-api)');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitialize);
    } else {
        autoInitialize();
    }

    window.AIChatWidget = AIChatWidget;
})();