"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Minus, Send, MessageSquare, Smile, Ban } from 'lucide-react';

interface DMMessage {
    id: string;
    from: string;
    message: string;
    timestamp: number;
    isSelf?: boolean;
}

interface DMWindowProps {
    targetUsername: string;
    messages: DMMessage[];
    onClose: () => void;
    onMinimize: () => void;
    onSendMessage: (text: string) => void;
    onIgnore?: () => void;
    isIgnored?: boolean;
    initialPosition?: { x: number; y: number };
}

const EMOJI_LIST = [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊',
    '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋',
    '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🫡',
    '🤐', '🤨', '😐', '😑', '😶', '🫥', '😏', '😒', '🙄', '😬',
    '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
    '🤮', '🥴', '😵', '🤯', '🥳', '🥸', '😎', '🤓', '🧐', '😕',
    '👍', '👎', '👋', '🤝', '👏', '🙌', '🤞', '✌️', '🤟', '🤘',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '💕',
    '🔥', '⭐', '✨', '🎉', '🎊', '💯', '👀', '💬', '🎵', '🎶',
];

export function DMWindow({
    targetUsername,
    messages,
    onClose,
    onMinimize,
    onSendMessage,
    onIgnore,
    isIgnored,
    initialPosition = { x: 100, y: 100 }
}: DMWindowProps) {
    const [position, setPosition] = useState(initialPosition);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [inputText, setInputText] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const windowRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    // Drag Logic
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.dm-header')) {
            setIsDragging(true);
            const rect = windowRef.current!.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    }, []);

    useEffect(() => {
        if (!isDragging) return;
        const handleMouseMove = (e: MouseEvent) => {
            setPosition({
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            });
        };
        const handleMouseUp = () => setIsDragging(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    const handleSend = useCallback(() => {
        if (!inputText.trim()) return;
        onSendMessage(inputText);
        setInputText("");
    }, [inputText, onSendMessage]);

    const addEmoji = useCallback((emoji: string) => {
        setInputText(prev => prev + emoji);
        setShowEmoji(false);
        inputRef.current?.focus();
    }, []);

    // Memoize message list to avoid re-renders
    const messageList = useMemo(() => messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.isSelf ? 'justify-end' : 'justify-start'}`}>
            <div className={`
                max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed
                ${msg.isSelf
                    ? 'bg-amber-700 text-white rounded-br-none'
                    : 'bg-[#1f222e] text-gray-200 rounded-bl-none border border-white/5'}
            `}>
                {msg.message}
                <div className={`text-[9px] mt-1 opacity-50 ${msg.isSelf ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    )), [messages]);

    return (
        <div
            ref={windowRef}
            className="fixed z-50 w-80 bg-[#13151c] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden"
            style={{
                left: position.x,
                top: position.y,
                height: '420px',
                willChange: isDragging ? 'transform' : 'auto',
            }}
            onMouseDown={handleMouseDown}
        >
            {/* Header (Draggable) */}
            <div className="dm-header h-10 bg-white/5 border-b border-white/5 flex items-center justify-between px-3 cursor-move select-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-sm font-semibold text-gray-200">{targetUsername}</span>
                </div>
                <div className="flex items-center gap-1">
                    {onIgnore && (
                        <button onClick={onIgnore} className={`p-1 rounded transition-colors ${isIgnored ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`} title={isIgnored ? 'Yoksayma Kaldır' : 'Yoksay'}>
                            <Ban className="w-3 h-3" />
                        </button>
                    )}
                    <button onClick={onMinimize} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors">
                        <Minus className="w-3 h-3" />
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-[#0b0d14]/50">
                {messages.length === 0 && (
                    <div className="text-center mt-10 opacity-30">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-xs">Özel mesajlaşma başladı.</p>
                    </div>
                )}
                {messageList}
                <div ref={messagesEndRef} />
            </div>

            {/* Emoji Picker (inline) */}
            {showEmoji && (
                <div className="border-t border-white/5 bg-[#13151c] p-2 max-h-[140px] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-10 gap-0.5">
                        {EMOJI_LIST.map((emoji, i) => (
                            <button
                                key={i}
                                onClick={() => addEmoji(emoji)}
                                className="w-7 h-7 flex items-center justify-center text-base hover:bg-white/10 rounded transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-white/5 bg-[#13151c]">
                <div className="relative flex items-center gap-1">
                    <button
                        onClick={() => setShowEmoji(s => !s)}
                        className={`p-1.5 rounded-full transition-colors ${showEmoji ? 'bg-amber-700 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-white/10'}`}
                    >
                        <Smile className="w-4 h-4" />
                    </button>
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-[#0b0d14] border border-white/10 rounded-full pl-4 pr-10 py-2 text-sm text-gray-200 focus:border-amber-600 focus:outline-none placeholder-gray-600"
                        placeholder="Bir mesaj yazın..."
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        onClick={handleSend}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-amber-700 hover:bg-amber-600 rounded-full text-white transition-colors"
                    >
                        <Send className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}
