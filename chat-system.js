/**
 * Simplified Direct LLM Chat System
 * Replaces legacy ElizaOS integration
 */

class ChatSystem {
    constructor() {
        this.apiBaseURL = ''; // Relative path for Next.js API
        this.chatHistory = [];
        this.isProcessing = false;

        // DOM Elements
        this.inputField = document.getElementById('chat-input-field');
        this.sendButton = document.getElementById('send-btn');
        this.messagesContainer = document.getElementById('chat-window-messages') || document.querySelector('.chat-messages');

        this.init();
    }

    init() {
        console.log('🚀 Chat System Initializing...');

        if (!this.inputField || !this.sendButton) {
            console.error('❌ Critical: Chat inputs not found!', {
                input: !!this.inputField,
                btn: !!this.sendButton
            });
            return;
        }

        // Attach Event Listeners
        this.sendButton.addEventListener('click', () => this.sendMessage());

        this.inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        console.log('✅ Event listeners attached. Ready to chat.');
    }

    async sendMessage() {
        if (this.isProcessing) return;

        const text = this.inputField.value.trim();
        if (!text) return;

        // 1. Add User Message to UI
        this.appendMessage('user', text);
        this.inputField.value = '';
        this.isProcessing = true;

        // 2. Show Typing Indicator
        const loadingId = this.appendLoadingMessage();

        try {
            // 3. Call API
            console.log('📡 Sending to API:', text);
            const currentCharacterId = this.getCurrentCharacterId();

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    characterId: currentCharacterId,
                    history: this.chatHistory.slice(-10) // Send last 10 context
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();

            // 4. Remove Loading & Add AI Message
            this.removeMessage(loadingId);
            const reply = data.text || "I'm not sure what to say...";
            this.appendMessage('ai', reply);

            // 5. Speak (if VoiceManager exists)
            if (window.voiceManager) {
                window.voiceManager.speak(reply, currentCharacterId);
            }

            // Update History
            this.chatHistory.push({ role: 'user', content: text });
            this.chatHistory.push({ role: 'assistant', content: reply });

        } catch (error) {
            console.error('❌ Chat Error:', error);
            this.removeMessage(loadingId);
            this.appendMessage('ai', 'Error: Could not reach the agent.');
        } finally {
            this.isProcessing = false;
        }
    }

    getCurrentCharacterId() {
        try {
            const stored = localStorage.getItem('selectedCharacter');
            if (stored) {
                const data = JSON.parse(stored);
                return data.id || data.name?.toLowerCase() || 'alice';
            }
        } catch (e) {
            console.warn('Failed to parse selectedCharacter:', e);
        }
        return 'alice';
    }

    appendMessage(role, text) {
        if (!this.messagesContainer) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = `message-bubble ${role}`;

        // Ensure visibility (some CSS sets opacity: 0)
        msgDiv.style.opacity = '1';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'bubble-content';
        msgDiv.appendChild(contentDiv);

        this.messagesContainer.appendChild(msgDiv);

        if (role === 'ai' && !text.startsWith('Error:')) {
            this.typeTextWithPencil(contentDiv, text);
        } else {
            contentDiv.textContent = text;
        }

        this.scrollToBottom();
        return msgDiv;
    }

    async typeTextWithPencil(element, text) {
        const cursor = document.createElement('span');
        cursor.textContent = ' ✏️';
        cursor.className = 'pencil-cursor';
        element.appendChild(cursor);

        for (let i = 0; i < text.length; i++) {
            cursor.before(text[i]);
            await new Promise(r => setTimeout(r, Math.random() * 30 + 20));
            this.scrollToBottom();
        }

        cursor.remove();
    }

    appendLoadingMessage() {
        if (!this.messagesContainer) return;

        const msgDiv = document.createElement('div');
        msgDiv.className = 'message-bubble ai loading';
        msgDiv.style.opacity = '1';
        msgDiv.id = 'loading-' + Date.now();

        msgDiv.innerHTML = `
            <div class="bubble-content">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;

        this.messagesContainer.appendChild(msgDiv);
        this.scrollToBottom();
        return msgDiv.id;
    }

    removeMessage(id) {
        if (!id) return;
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    scrollToBottom() {
        if (this.messagesContainer) {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Auto-start
document.addEventListener('DOMContentLoaded', () => {
    window.chatSystem = new ChatSystem();
});
