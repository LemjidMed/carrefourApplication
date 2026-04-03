import { useState, useEffect } from 'react';

type MessageItem = { role: 'user' | 'assistant'; text: string };

function App() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<MessageItem[]>([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    // Listen for MCP tool result notifications
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const message = event.data;
      if (!message || message.jsonrpc !== '2.0') return;
      if (message.method === 'ui/notifications/tool-result') {
        const toolResult = message.params;
        const reply = toolResult?.structuredContent?.reply || 'Réponse reçue';
        setHistory((prev) => [...prev, { role: 'assistant', text: reply }]);
        setStatus('Réponse MCP reçue via bridge');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;

    const userItem: MessageItem = { role: 'user', text: input };
    setHistory((prev) => [...prev, userItem]);
    setStatus('Envoi au MCP...');

    try {
      const res = await fetch('/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_message', input: { text: input } })
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Erreur serveur');

      const reply: MessageItem = { role: 'assistant', text: json.data.reply };
      setHistory((prev) => [...prev, reply]);
      setStatus('Réponse MCP reçue.');
    } catch (error) {
      setHistory((prev) => [...prev, { role: 'assistant', text: `Erreur: ${error}` }]);
      setStatus('Erreur lors de l’appel MCP');
    } finally {
      setInput('');
    }
  };

  return (
    <main className="app">
      <h1>ChatGPT MCP App Carrefour</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <strong>Status :</strong> {status || 'Prêt'}
      </div>

      <div className="card" style={{ maxHeight: 300, overflowY: 'auto' }}>
        {history.length === 0 && <p>Aucune conversation. Envoyez un message !</p>}
        {history.map((msg, index) => (
          <p key={index} style={{ textAlign: msg.role === 'user' ? 'right' : 'left' }}>
            <strong>{msg.role === 'user' ? 'Vous' : 'Assistant'}:</strong> {msg.text}
          </p>
        ))}
      </div>

      <form onSubmit={onSubmit} style={{ marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écris un message pour le MCP..."
          style={{ width: 'calc(100% - 120px)', padding: '10px', marginRight: '8px' }}
        />
        <button type="submit">Envoyer</button>
      </form>
    </main>
  );
}

export default App;
