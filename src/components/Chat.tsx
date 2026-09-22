import { useState, useRef, useEffect } from 'react';
import './Chat.css';

type Message = {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    name?: string;
    tool_calls?: any[];
};

export default function Chat() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userPrompt = input.trim();
        setInput('');

        // Add user message to UI immediately
        const newUserMsg: Message = { role: 'user', content: userPrompt };
        setMessages(prev => [...prev, newUserMsg]);
        setIsLoading(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // We send the current history minus the system prompt, the backend can handle it, 
                // but let's send the full history we have
                body: JSON.stringify({
                    user_prompt: userPrompt,
                    messages: messages.length > 0 ? messages : undefined
                })
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            // The backend returns the full updated history, we can just replace our state
            setMessages(data.messages);
        } catch (error) {
            console.error('Error sending message:', error);
            // Add a temporary error message
            setMessages(prev => [...prev, { role: 'assistant', content: 'שגיאה בתקשורת עם השרת.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter and process messages for display
    const displayElements: any[] = [];

    messages.forEach((msg, index) => {
        // Display user and assistant text messages
        if ((msg.role === 'user' || msg.role === 'assistant') && msg.content) {
            displayElements.push({
                key: `msg-${index}`,
                role: msg.role,
                content: msg.content
            });
        }
        // If it's a tool response, check if it contains a generated image file path
        else if (msg.role === 'tool' && msg.content) {
            try {
                const data = JSON.parse(msg.content);
                if (data.status === 'success' && data.file_path && data.file_path.endsWith('.png')) {
                    displayElements.push({
                        key: `tool-img-${index}`,
                        role: 'assistant', // Render as assistant bubble
                        imagePath: `/agent-assets/${data.file_path}`
                    });
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
    });

    return (
        <div className="chat-container">
            <div className="chat-messages" dir="rtl">
                {displayElements.length === 0 && (
                    <div className="chat-empty">
                        <p>ברוכים הבאים לסוכן הלוגיסטיקה! איך אפשר לעזור?</p>
                    </div>
                )}
                {displayElements.map((el) => {
                    return (
                        <div key={el.key} className={`message ${el.role}`}>
                            <div className="message-content">
                                {el.content && <p>{el.content}</p>}
                                {el.imagePath && (
                                    <div className="message-image">
                                        <img src={el.imagePath} alt="Generated Chart" />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                {isLoading && (
                    <div className="message assistant loading">
                        <div className="message-content">
                            <p>חושב...</p>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="chat-input-form" dir="rtl">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="שאל אותי משהו..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !input.trim()}>
                    שלח
                </button>
            </form>
        </div>
    );
}
