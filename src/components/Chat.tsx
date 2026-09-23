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
    const [selectedModel, setSelectedModel] = useState('logfare/auto');
    const [colabStatus, setColabStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (selectedModel.startsWith('colab/')) {
            fetch('/api/colab_status')
                .then(res => res.json())
                .then(data => setColabStatus(data.status))
                .catch(() => setColabStatus('error'));
        }
    }, [selectedModel]);

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userPrompt = input.trim();
        setInput('');

        // Add user message to UI immediately
        const newUserMsg: Message = { role: 'user', content: userPrompt };
        setMessages(prev => [...prev, newUserMsg]);
        setIsLoading(true);

        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_prompt: userPrompt,
                    messages: messages.length > 0 ? messages : undefined,
                    model: selectedModel
                }),
                signal: abortControllerRef.current.signal
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const data = await response.json();
            setMessages(data.messages);
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Generation stopped by user');
                setMessages(prev => [...prev, { role: 'assistant', content: 'הפעולה הופסקה על ידי המשתמש.' }]);
            } else {
                console.error('Error sending message:', error);
                setMessages(prev => [...prev, { role: 'assistant', content: 'שגיאה בתקשורת עם השרת.' }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const displayElements: any[] = [];
    messages.forEach((msg, index) => {
        if ((msg.role === 'user' || msg.role === 'assistant') && msg.content) {
            displayElements.push({ key: `msg-${index}`, role: msg.role, content: msg.content });
        } else if (msg.role === 'tool' && msg.content) {
            try {
                const data = JSON.parse(msg.content);
                if (data.status === 'success' && data.file_path && data.file_path.endsWith('.png')) {
                    displayElements.push({
                        key: `tool-img-${index}`,
                        role: 'assistant',
                        imagePath: `/agent-assets/${data.file_path}`
                    });
                }
            } catch (e) { }
        }
    });

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="model-selector-container">
                    <label htmlFor="model-select">Model:</label>
                    <select 
                        id="model-select" 
                        value={selectedModel} 
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="model-select"
                        disabled={isLoading}
                    >
                        <optgroup label="Cloud GPU (Google Colab/Kaggle)">
                            <option value="colab/llama3.1">Colab: Llama 3.1 8B</option>
                        </optgroup>
                        <optgroup label="Logfare (Unlimited Free)">
                            <option value="logfare/auto">Logfare: Auto (Best Available Model)</option>
                        </optgroup>
                        <optgroup label="Cerebras (Insanely Fast & Free)">
                            <option value="cerebras/llama3.1-8b">Cerebras: Llama 3.1 8B</option>
                            <option value="cerebras/llama3.1-70b">Cerebras: Llama 3.1 70B</option>
                        </optgroup>
                        <optgroup label="OpenRouter (Free Tier)">
                            <option value="openrouter/meta-llama/llama-3-8b-instruct:free">OpenRouter: Llama 3 8B</option>
                            <option value="openrouter/google/gemma-2-9b-it:free">OpenRouter: Gemma 2 9B</option>
                            <option value="openrouter/mistralai/mistral-7b-instruct:free">OpenRouter: Mistral 7B</option>
                        </optgroup>
                        <optgroup label="Groq (Cloud - Fast but Rate Limited)">
                            <option value="llama-3.1-8b-instant">Llama 3.1 8B</option>
                            <option value="llama-3.1-70b-versatile">Llama 3.1 70B</option>
                            <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                            <option value="gemma-7b-it">Gemma 7B</option>
                        </optgroup>
                        <optgroup label="Local (Ollama - Free & Unlimited)">
                            <option value="local/llama3.1">Local: Llama 3.1 8B</option>
                        </optgroup>
                    </select>
                    {selectedModel.startsWith('colab/') && (
                        <span style={{marginLeft: '10px', fontSize: '0.9rem', color: colabStatus === 'connected' ? '#4CAF50' : '#F44336'}}>
                            {colabStatus === 'connected' ? '🟢 GPU Connected' : '🔴 Disconnected'}
                        </span>
                    )}
                </div>
            </div>

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

            <div className="chat-input-container">
                <form onSubmit={handleSubmit} className="chat-input-form" dir="rtl">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="שאל אותי משהו..."
                        disabled={isLoading}
                    />
                    {isLoading ? (
                        <button type="button" onClick={handleStop} className="stop-button" style={{ backgroundColor: 'red', color: 'white' }}>
                            עצור
                        </button>
                    ) : (
                        <button type="submit" disabled={!input.trim()}>
                            שלח
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}
