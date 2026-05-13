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

  const suggestions = [
    "อยากได้ห้อง Kave space มีมั้ย",
    "ขอรายละเอียด พลัม คอนโด ที่ราคาไม่เกิน 9,000 บาท",
    "ขอหอแบบติดรั้วมหาลัยเลย รัศมีไม่เกิน 500 เมตร (0.5 กม.) มีที่ไหนแนะนำบ้าง",
    "มีมอเตอร์ไซค์ ขี่ไปมอได้สบายๆ ขอระยะไม่เกิน 3 โล งบจำกัดแค่ 8,000 บาท",
    "รัศมี 2 กิโลรอบมอ ขอที่ราคาถูกที่สุด 5 อันดับแรกเรียงมาให้ดูหน่อย",
    "มีที่ไหนที่ห้องกว้าง ๆ บ้าง ของบไม่เกิน 10,000 บาท",
    "แอททิจูด บียู กับ แกรนด์ โมเดิร์น คอนโด เทียบให้ดูหน่อยว่าเดินไปมหาลัยอันไหนใกล้กว่ากัน",
    "ค่าเทอมคณะนิเทศศาสตร์ ม.กรุงเทพ ตอนนี้เท่าไหร่",
    "ช่วยวางแผนการเดินทางจากอนุสาวรีย์ชัยฯ ไปมอกรุงเทพให้หน่อย",
  ];

  return (
    <div className="absolute bottom-0 left-0 w-full z-20 bg-gradient-to-t from-background via-background/90 to-transparent pt-6 sm:pt-10 pb-4 sm:pb-6 md:pb-8 px-2 sm:px-4 flex justify-center">
      <div className="w-full max-w-5xl flex flex-col">
        {/* Suggestions */}
        <div 
          className="flex overflow-x-auto gap-1.5 sm:gap-2 mb-2 sm:mb-3 px-1 pb-1 no-scrollbar" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <style dangerouslySetInnerHTML={{__html: `
            .no-scrollbar::-webkit-scrollbar { display: none; }
          `}} />
          {suggestions.map((text, i) => (
            <button
              key={i}
              onClick={() => onChange(text)}
              disabled={disabled}
              className="whitespace-nowrap px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-surface-variant bg-surface-container-lowest text-on-surface text-[12px] sm:text-[14px] hover:bg-surface-variant transition-colors flex-shrink-0 shadow-sm cursor-pointer"
            >
              {text}
            </button>
          ))}
        </div>

        <div className="bg-surface-container-lowest rounded-full p-1.5 sm:p-2 flex items-center border-2 border-surface-variant shadow-[0_10px_30px_rgba(184,228,213,0.15)] focus-within:border-primary-container transition-colors pl-3 sm:pl-4">
          {/* Input Field */}
          <input
            className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-[12px] sm:text-[16px] leading-[1.6] px-2 sm:px-4 placeholder:text-outline-variant text-on-surface placeholder:text-[12px] sm:placeholder:text-[16px]"
            placeholder="หาหอพักที่โดนใจ... ลองถาม BU Dorms ดูสิ"
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
            className={`cursor-pointer w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-full flex items-center justify-center transition-all mr-1 ${
              isListening 
                ? "bg-error text-on-error shadow-[0_0_15px_rgba(186,26,26,0.3)]" 
                : "text-outline hover:text-primary hover:bg-primary-container/30"
            }`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <div className="flex items-center justify-center gap-[1px] sm:gap-[2px] h-3 w-3 sm:h-4 sm:w-4">
                <span className="w-[2px] sm:w-[3px] h-full bg-on-error rounded-[1px] soundwave-bar" />
                <span className="w-[2px] sm:w-[3px] h-full bg-on-error rounded-[1px] soundwave-bar" />
                <span className="w-[2px] sm:w-[3px] h-full bg-on-error rounded-[1px] soundwave-bar" />
                <span className="w-[2px] sm:w-[3px] h-full bg-on-error rounded-[1px] soundwave-bar" />
              </div>
            ) : (
              <span className="material-symbols-outlined text-[20px] sm:text-[24px]">mic</span>
            )}
          </button>
          {/* Send Button */}
          <button
            onClick={onSend}
            disabled={!canSend}
            className={`cursor-pointer w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full flex items-center justify-center transition-all shadow-md ${
              canSend
                ? "bg-primary text-on-primary hover:opacity-90 active:scale-95"
                : "bg-surface-container-high text-outline cursor-not-allowed opacity-50"
            }`}
          >
            <span
              className="material-symbols-outlined text-[18px] sm:text-[24px]"
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
