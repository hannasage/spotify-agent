/**
 * Spotify Agent Web Interface - Client JavaScript
 * Handles real-time communication with the Spotify agents via Socket.IO
 */

class SpotifyAgentClient {
    constructor() {
        this.socket = null;
        this.currentAgent = 'auto'; // 'auto', 'playback', 'lookup'
        this.isConnected = false;
        this.messagesContainer = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.connectionStatus = document.getElementById('connection-status');
        this.connectionText = document.getElementById('connection-text');
        this.agentStatus = document.getElementById('agent-status');
        this.traceStatus = document.getElementById('trace-status');
        // Removed agentToggle reference

        this.initializeSocket();
        this.setupEventListeners();
    }

    initializeSocket() {
        this.socket = io();

        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to Spotify Agent server');
            this.updateConnectionStatus(true);
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus(false, 'Connection failed');
        });

        // Server messages
        this.socket.on('connected', (data) => {
            console.log('Server confirmation:', data);
            this.updateAgentStatus(data.agentsReady, data.tracingEnabled);
        });

        this.socket.on('user_message', (data) => {
            this.addMessage(data.message, 'user', data.timestamp);
        });

        this.socket.on('agent_response', (data) => {
            this.addMessage(data.message, data.type === 'error' ? 'error' : 'agent', data.timestamp, data.agent);
        });

        // Removed conversation_cleared handler
    }

    setupEventListeners() {
        // Auto-focus message input
        this.messageInput.focus();

        // Handle Enter key in input
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-scroll to bottom when new messages arrive
        const observer = new MutationObserver(() => {
            this.scrollToBottom();
        });
        observer.observe(this.messagesContainer, { childList: true });
    }

    updateConnectionStatus(connected, customMessage = null) {
        this.isConnected = connected;
        
        if (connected) {
            this.connectionStatus.className = 'status-indicator status-connected';
            this.connectionText.textContent = customMessage || 'Connected';
            this.sendButton.disabled = false;
            this.messageInput.disabled = false;
        } else {
            this.connectionStatus.className = 'status-indicator status-disconnected';
            this.connectionText.textContent = customMessage || 'Disconnected';
            this.sendButton.disabled = true;
            this.messageInput.disabled = true;
        }
    }

    updateAgentStatus(agentsReady, tracingEnabled) {
        if (agentsReady) {
            this.agentStatus.textContent = '🤖 Agents Ready';
            // Update the status dot to green when agents are ready
            const agentStatusItem = this.agentStatus.closest('.status-item');
            const statusDot = agentStatusItem.querySelector('.status-dot');
            statusDot.className = 'status-dot status-connected';
        } else {
            this.agentStatus.textContent = '⏳ Initializing Agents...';
        }

        this.traceStatus.textContent = tracingEnabled ? '📊 Tracing: ON' : '📊 Tracing: OFF';
        // Update the status dot for tracing
        const traceStatusItem = this.traceStatus.closest('.status-item');
        const traceDot = traceStatusItem.querySelector('.status-dot');
        traceDot.className = tracingEnabled ? 'status-dot status-connected' : 'status-dot status-disconnected';
    }

    addMessage(content, type, timestamp, agent = null) {
        // Hide welcome message when first real message arrives
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage && (type === 'user' || type === 'agent')) {
            welcomeMessage.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;

        if (type === 'error') {
            messageDiv.innerHTML = this.formatMessage(content);
        } else {
            // Create avatar
            const avatarDiv = document.createElement('div');
            avatarDiv.className = `message-avatar avatar-${type}`;
            
            if (type === 'user') {
                avatarDiv.textContent = 'U';
            } else {
                avatarDiv.textContent = agent === 'playback' ? '🎵' : '🔍';
            }

            // Create content
            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.innerHTML = this.formatMessage(content);

            // Create meta
            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-meta';
            
            let metaText = this.formatTimestamp(timestamp);
            if (agent && type === 'agent') {
                const agentName = agent === 'playback' ? 'Playback' : 'Lookup';
                metaText = `${agentName} • ${metaText}`;
            }
            metaDiv.textContent = metaText;

            messageDiv.appendChild(avatarDiv);
            const contentWrapper = document.createElement('div');
            contentWrapper.appendChild(contentDiv);
            contentWrapper.appendChild(metaDiv);
            messageDiv.appendChild(contentWrapper);
        }

        this.messagesContainer.appendChild(messageDiv);
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Basic formatting for agent responses
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code
            .replace(/\n/g, '<br>') // Line breaks
            .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>'); // Links
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    sendMessage() {
        if (!this.isConnected) {
            this.addMessage('Not connected to server. Please wait...', 'error', new Date().toISOString());
            return;
        }

        const message = this.messageInput.value.trim();
        if (!message) return;

        // Clear input
        this.messageInput.value = '';

        // Send to server
        this.socket.emit('chat_message', {
            message: message,
            agent: this.currentAgent
        });

        // Disable input briefly to prevent spam
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;
        
        setTimeout(() => {
            if (this.isConnected) {
                this.messageInput.disabled = false;
                this.sendButton.disabled = false;
                this.messageInput.focus();
            }
        }, 500);
    }

    clearMessages() {
        this.messagesContainer.innerHTML = '';
    }
}

// Global functions for HTML event handlers
let client;

function sendMessage(event) {
    if (event) {
        event.preventDefault();
    }
    client.sendMessage();
}

// Removed clearConversation and toggleAgent functions per user request

function sendExampleMessage(message) {
    if (client && client.messageInput) {
        client.messageInput.value = message;
        client.sendMessage();
    }
}

// Initialize the client when the page loads
document.addEventListener('DOMContentLoaded', () => {
    client = new SpotifyAgentClient();
    
    // Add some helpful startup info
    setTimeout(() => {
        client.addMessage(
            'Try asking me something like:\n' +
            '• "What\'s currently playing?"\n' +
            '• "Play some jazz music"\n' +
            '• "What artists are similar to Radiohead?"\n' +
            '• "Skip to the next track"\n' +
            '• "What\'s this song about?"',
            'agent',
            new Date().toISOString()
        );
    }, 1000);
});

// Handle page visibility changes to manage connection
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden
    } else {
        // Page is visible - ensure connection
        if (client && !client.isConnected) {
            client.initializeSocket();
        }
    }
});