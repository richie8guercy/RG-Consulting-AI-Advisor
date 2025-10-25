// Add type definitions for the Web Speech API to fix TypeScript errors.
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { Message, Role } from './types';
import { SYSTEM_INSTRUCTION } from './constants';

// --- SVG Icon Components ---

const BotIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
    <path d="M8.5 12.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zm7 0c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM12 7c-2.76 0-5 2.24-5 5h10c0-2.76-2.24-5-5-5z" />
  </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
  </svg>
);

const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z" />
  </svg>
);

const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 6h12v12H6z"/>
    </svg>
);


// --- UI Components ---

interface HeaderProps {
  name: string;
}
const Header: React.FC<HeaderProps> = ({ name }) => (
  <header className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-10 p-4 border-b border-slate-700">
    <div className="max-w-4xl mx-auto flex items-center space-x-3">
      <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
        <BotIcon className="w-6 h-6 text-cyan-400" />
      </div>
      <div>
        <h1 className="text-xl font-bold text-slate-100">{name}</h1>
        <p className="text-sm text-green-400">Online</p>
      </div>
    </div>
  </header>
);

interface ChatBubbleProps {
  message: Message;
}
const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;
  const bubbleClasses = isUser
    ? 'bg-blue-600 self-end rounded-br-none'
    : 'bg-slate-700 self-start rounded-bl-none';
  const containerClasses = isUser ? 'justify-end' : 'justify-start';
  const Icon = isUser ? UserIcon : BotIcon;

  return (
    <div className={`flex items-end gap-2 ${containerClasses}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-slate-800 rounded-full flex-shrink-0 flex items-center justify-center">
          <Icon className="w-5 h-5 text-cyan-400" />
        </div>
      )}
      <div
        className={`max-w-lg lg:max-w-2xl px-4 py-3 rounded-2xl text-white whitespace-pre-wrap ${bubbleClasses}`}
      >
        {message.text}
      </div>
      {isUser && (
        <div className="w-8 h-8 bg-slate-800 rounded-full flex-shrink-0 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-400" />
        </div>
      )}
    </div>
  );
};

const LoadingBubble: React.FC = () => (
    <div className="flex items-end gap-2 justify-start">
        <div className="w-8 h-8 bg-slate-800 rounded-full flex-shrink-0 flex items-center justify-center">
            <BotIcon className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="max-w-lg lg:max-w-2xl px-4 py-3 rounded-2xl bg-slate-700 self-start rounded-bl-none">
            <div className="flex items-center space-x-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-0"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-75"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-150"></span>
            </div>
        </div>
    </div>
);


interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}
const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  const handleMicClick = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setInput('');
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <footer className="bg-slate-900/80 backdrop-blur-md sticky bottom-0 z-10 py-3 px-4 border-t border-slate-700">
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex items-center bg-slate-800 rounded-lg p-2 gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? "Écoute en cours..." : "Posez votre question ici..."}
            rows={1}
            className="flex-grow bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none resize-none max-h-40 px-2"
            disabled={isLoading || isRecording}
          />
           <button
            type="button"
            onClick={handleMicClick}
            disabled={isLoading || (!!input.trim() && !isRecording)}
            className={`w-10 h-10 flex-shrink-0 rounded-md flex items-center justify-center disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-transparent hover:bg-slate-700'}`}
            aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <StopIcon className="w-5 h-5 text-white" /> : <MicIcon className="w-5 h-5 text-slate-400" />}
          </button>
          <button
            type="submit"
            disabled={isLoading || !input.trim() || isRecording}
            className="w-10 h-10 flex-shrink-0 bg-blue-600 rounded-md flex items-center justify-center disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
             aria-label="Send message"
          >
            <SendIcon className="w-5 h-5 text-white" />
          </button>
        </form>
      </div>
    </footer>
  );
};


// --- Main App Component ---

const App: React.FC = () => {
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
        role: Role.MODEL,
        text: "Bonjour ! Je suis RG Consulting AI Advisor. Comment puis-je vous aider aujourd'hui à structurer votre projet ou à innover dans votre stratégie ?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initChat = () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const chatInstance = ai.chats.create({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
        setChat(chatInstance);
      } catch (error) {
        console.error("Failed to initialize Gemini:", error);
        setMessages(prev => [...prev, { role: Role.MODEL, text: "Erreur: Impossible d'initialiser l'assistant IA. Veuillez vérifier la configuration."}]);
      }
    };
    initChat();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!chat) return;

    const userMessage: Message = { role: Role.USER, text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
        const stream = await chat.sendMessageStream({ message: text });

        let fullResponse = '';
        // Add a placeholder for the bot's response
        setMessages(prev => [...prev, { role: Role.MODEL, text: '' }]);

        for await (const chunk of stream) {
            const chunkText = chunk.text;
            fullResponse += chunkText;
            
            setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = { role: Role.MODEL, text: fullResponse };
                return newMessages;
            });
        }

    } catch (error) {
        console.error("Gemini API error:", error);
        const errorMessage: Message = { role: Role.MODEL, text: "Désolé, une erreur est survenue. Veuillez réessayer." };
        setMessages(prev => {
          const newMessages = [...prev];
          // Replace placeholder if it exists, otherwise add new error message
          if(newMessages[newMessages.length - 1].text === ''){
             newMessages[newMessages.length - 1] = errorMessage;
          } else {
            newMessages.push(errorMessage);
          }
          return newMessages;
        });
    } finally {
        setIsLoading(false);
    }
  }, [chat]);

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col font-sans">
      <Header name="RG Consulting AI Advisor" />
      <main className="flex-grow p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto flex flex-col space-y-6">
          {messages.map((msg, index) => (
            <ChatBubble key={index} message={msg} />
          ))}
          {isLoading && messages[messages.length - 1]?.role === Role.USER && <LoadingBubble />}
          <div ref={messagesEndRef} />
        </div>
      </main>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;
