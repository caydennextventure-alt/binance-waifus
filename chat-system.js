/**
 * Simplified Direct LLM Chat System
 * Replaces legacy ElizaOS integration
 */

class ChatSystem {
    constructor() {
        this.apiBaseURL = ''; // Relative path
        this.chatHistory = [];
        this.isProcessing = false;
        this.currentAudio = null;

        // DOM Elements
        this.inputField = document.getElementById('chat-input-field');
        this.sendButton = document.getElementById('send-btn');
        this.messagesContainer = document.getElementById('chat-window-messages') || document.querySelector('.chat-messages');

        // Character Data (for Voice IDs)
        this.characters = [
            { id: "alice", voiceId: "rEJAAHKQqr6yTNCh8xS0" },
            { id: "ash", voiceId: "bY4cOgafbv5vatmokfg0" },
            { id: "bobo", voiceId: "rEJAAHKQqr6yTNCh8xS0" }, // Default
            { id: "elinyaa", voiceId: "4cxHntmhK38NT4QMBr9m" },
            { id: "fliza", voiceId: "s9lrHYk7TIJ2UO7UNbje" },
            { id: "imeris", voiceId: "eVItLK1UvXctxuaRV2Oq" },
            { id: "kyoko", voiceId: "ATSlMe1wEISLjgGhZEKK" },
            { id: "lena", voiceId: "uEn2ClE3OziJMlhQS91c" },
            { id: "lilium", voiceId: "yRRXNdbFeQpIK5MAhenr" },
            { id: "maple", voiceId: "B8gJV1IhpuegLxdpXFOE" },
            { id: "miru", voiceId: "eVJCDcwCTZBLNdQdbdmd" },
            { id: "miumiu", voiceId: "SU7BtMmgc7KhQiC6G24B" },
            { id: "neco", voiceId: "t9ZwnJtpA3lWrJ4W7pAl" },
            { id: "nekona", voiceId: "kcg1KQQGuCGzH6FUjsZQ" },
            { id: "notia", voiceId: "abz2RylgxmJx76xNpaj1" },
            { id: "ququ", voiceId: "tfQFvzjodQp63340jz2r" },
            { id: "rainy", voiceId: "1ghrzLZQ7Dza7Xs9OkhY" },
            { id: "rindo", voiceId: "nclQ39ewSlJMu5Nidnsf" },
            { id: "sikirei", voiceId: "n263mAk9k8VWEuZSmuMl" },
            { id: "vivi", voiceId: "4lWJNy00PxQAOMgQTiIS" },
            { id: "wolf", voiceId: "WW3EvqkXGmu65ga8TYqa" },
            { id: "wolferia", voiceId: "3SeVwPUl5aO6J2GETjox" },
            { id: "yawl", voiceId: "c6wjO0u66VyvwAC4UTqx" },
            { id: "yuuyii", voiceId: "UPwKM85l2CG7nbF2u1or" },
            { id: "zwei", voiceId: "0EzDWfDZDlAIeQQOjhoC" }
        ];

        this.init();
    }

    init() {
        console.log('🚀 Chat System Initializing...');

        if (!this.inputField || !this.sendButton) {
            console.error('❌ Critical: Chat inputs not found!');
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
                    history: this.chatHistory.slice(-10)
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();

            // 4. Remove Loading & Add AI Message
            this.removeMessage(loadingId);
            const reply = data.text || "I'm not sure what to say...";
            this.appendMessage('ai', reply);

            // 5. Trigger Animation/Action
            if (window.triggerAIAction) {
                window.triggerAIAction(data.action || "NONE");
            }

            // 6. Generate and Play Voice
            this.speak(reply, currentCharacterId);

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

    async speak(text, characterId) {
        try {
            console.log(`🎤 Generating voice for ${characterId}...`);
            const character = this.characters.find(c => c.id === characterId) || this.characters[0];
            const voiceId = character.voiceId;

            const response = await fetch('/api/voice-sample', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: text,
                    voiceId: voiceId
                })
            });

            if (!response.ok) throw new Error('Voice generation failed');

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            if (this.currentAudio) {
                this.currentAudio.pause();
                this.currentAudio = null;
            }

            this.currentAudio = new Audio(audioUrl);
            this.currentAudio.play();
            console.log('🔊 Playing voice...');

        } catch (error) {
            console.error('❌ Voice Error:', error);
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
}

// Auto-start
document.addEventListener('DOMContentLoaded', () => {
    window.chatSystem = new ChatSystem();
});
