import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../lib/api';

const Chatbot = ({ darkMode = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: "Hi there! I'm your SlotDotExe assistant. Ask me about lecture halls, buses, library seats, professor projects, or even books to study!" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Theme-aware classes derived from darkMode prop
  const containerClass = darkMode ? 'bg-sky-950 border-sky-800' : 'bg-white border-sky-200';
  const headerClass = darkMode ? 'bg-sky-900 text-white' : 'bg-sky-600 text-white';
  const closeBtnClass = darkMode ? 'hover:bg-sky-800 p-1 rounded-full transition-colors' : 'hover:bg-sky-500 p-1 rounded-full transition-colors';
  const messageAreaClass = darkMode ? 'bg-sky-900/10' : 'bg-sky-50';
  const modelBubbleBase = darkMode ? 'bg-sky-800 text-sky-50 border-sky-700' : 'bg-white text-sky-950 border-sky-100';
  const userBubbleBase = 'bg-sky-600 text-white';
  const loadingBubbleBase = modelBubbleBase;
  const inputAreaClass = darkMode ? 'bg-sky-950 border-sky-800' : 'bg-white border-sky-100';
  const inputInnerClass = darkMode ? 'bg-sky-900 border-sky-700 text-white placeholder-sky-500' : 'bg-sky-50 border-sky-200 text-sky-950 placeholder-sky-400';
  const submitBtnClass = darkMode ? 'bg-sky-600 hover:bg-sky-700 disabled:bg-sky-800' : 'bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300';
  const fabClass = 'bg-sky-600 hover:bg-sky-700 text-white';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    const newMessages = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      // Exclude the very first welcome message from history if we want to save tokens, 
      // but it's fine to include it.
      const history = messages.map(m => ({ role: m.role, text: m.text }));
      const res = await sendChatMessage(userMsg, history);
      
      setMessages([...newMessages, { role: 'model', text: res.text }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: 'model', text: "Sorry, the server returned an error (API Quota Exceeded or Not Configured). Please try again in a minute or check your API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className={`${containerClass} rounded-2xl shadow-2xl w-80 sm:w-96 mb-4 flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right`} style={{ height: '500px', maxHeight: '80vh' }}>
          
          {/* Header */}
          <div className={`${headerClass} p-4 flex justify-between items-center shadow-md`}>
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="font-semibold text-lg">AI Assistant</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className={closeBtnClass}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${messageAreaClass}`}>
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.role === 'user' 
                    ? userBubbleBase + ' rounded-br-none' 
                    : modelBubbleBase + ' rounded-bl-none shadow-sm'
                }`}>
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className={`${loadingBubbleBase} border border-sky-100 rounded-2xl rounded-bl-none px-4 py-2 shadow-sm flex items-center gap-1`}>
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className={`p-3 ${inputAreaClass} border-t border-sky-100` }>
            <div className="relative flex items-center">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..." 
                className={`w-full ${inputInnerClass} border rounded-full py-2 pl-4 pr-12 focus:outline-none focus:ring-2 focus:ring-sky-500`}
                disabled={isLoading}
              />
              <button 
                type="submit" 
                disabled={isLoading || !input.trim()}
                className={`absolute right-1 top-1 bottom-1 ${submitBtnClass} text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-sky-600 hover:bg-sky-700 text-white rounded-full p-4 shadow-xl transition-all duration-300 transform hover:scale-105 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`}
        aria-label="Open AI Assistant"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    </div>
  );
};

export default Chatbot;
