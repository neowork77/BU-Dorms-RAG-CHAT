"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export function ChatInputBar({
  value,
  onChange,
  onSend,
  disabled,
}: ChatInputBarProps) {
  const canSend = value.trim().length > 0 && !disabled;

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const valueRef = useRef(value);
  const startValueRef = useRef("");
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      if (typeof window !== "undefined") {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          // Force Thai language explicitly
          recognition.lang = "th-TH";

          recognition.onstart = () => setIsListening(true);
          
          recognition.onresult = (event: any) => {
            let transcript = "";
            for (let i = 0; i < event.results.length; i++) {
              transcript += event.results[i][0].transcript;
            }
            const prefix = startValueRef.current ? startValueRef.current + (startValueRef.current.endsWith(" ") ? "" : " ") : "";
            onChangeRef.current(prefix + transcript);
          };

          recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
          };

          recognition.onend = () => setIsListening(false);

          recognitionRef.current = recognition;
          startValueRef.current = valueRef.current;
          
          try {
            recognition.start();
          } catch (e) {
            console.error(e);
            setIsListening(false);
          }
        } else {
          alert("Speech Recognition is not supported in this browser.");
        }
      }
    }
  };

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey && canSend) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="absolute bottom-0 left-0 w-full z-20 bg-gradient-to-t from-background via-background/90 to-transparent pt-10 pb-6 md:pb-8 px-4 flex justify-center">
      <div className="w-full max-w-5xl">
        <div className="bg-surface-container-lowest rounded-full p-2 flex items-center border-2 border-surface-variant shadow-[0_10px_30px_rgba(184,228,213,0.15)] focus-within:border-primary-container transition-colors">
          {/* Attachment Button */}
          <button className="cursor-pointer w-12 h-12 shrink-0 rounded-full text-tertiary hover:bg-tertiary-container/50 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-2xl">
              add_circle
            </span>
          </button>
          {/* Input Field */}
          <input
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[16px] leading-[1.6] px-4 placeholder:text-outline-variant text-on-surface"
            placeholder="Ask Puffin AI or mention a file..."
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          {/* Voice Input */}
          <button 
            onClick={toggleListening}
            disabled={disabled}
            className={`cursor-pointer w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-all mr-1 ${
              isListening 
                ? "bg-error text-on-error shadow-[0_0_15px_rgba(186,26,26,0.3)]" 
                : "text-outline hover:text-primary hover:bg-primary-container/30"
            }`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <div className="flex items-center justify-center gap-[2px] h-4 w-4">
                <span className="w-[3px] h-full bg-on-error rounded-[1px] soundwave-bar" />
                <span className="w-[3px] h-full bg-on-error rounded-[1px] soundwave-bar" />
                <span className="w-[3px] h-full bg-on-error rounded-[1px] soundwave-bar" />
                <span className="w-[3px] h-full bg-on-error rounded-[1px] soundwave-bar" />
              </div>
            ) : (
              <span className="material-symbols-outlined">mic</span>
            )}
          </button>
          {/* Send Button */}
          <button
            onClick={onSend}
            disabled={!canSend}
            className={`cursor-pointer w-12 h-12 shrink-0 rounded-full flex items-center justify-center transition-all shadow-md ${
              canSend
                ? "bg-primary text-on-primary hover:opacity-90 active:scale-95"
                : "bg-surface-container-high text-outline cursor-not-allowed opacity-50"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              send
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
