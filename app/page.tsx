// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";

type Message = {
  role: "system" | "user";
  text: string;
};

export default function Home() {
  const [targetWord, setTargetWord] = useState<string>(""); // 謎底 (實務上可以加密，這裡為了Demo明碼存)
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  
  // 自動捲動到最新訊息
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // 1. 遊戲初始化：取得謎底與第一題示
  const startGame = async () => {
    setLoading(true);
    setMessages([]);
    setGameWon(false);
    setTargetWord("");
    
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      
      setTargetWord(data.word);
      setMessages([{ role: "system", text: `題目已生成！提示：${data.hint}` }]);
    } catch (e) {
      alert("啟動失敗，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  // 頁面載入時自動開始
  useEffect(() => {
    startGame();
  }, []);

  // 2. 處理使用者猜測
  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || gameWon) return;

    const guess = input.trim();
    setInput("");
    
    // 顯示使用者的猜測
    setMessages((prev) => [...prev, { role: "user", text: guess }]);
    setLoading(true);

    try {
      const res = await fetch("/api/game", {
        method: "POST",
        body: JSON.stringify({ action: "guess", targetWord, userGuess: guess }),
      });
      const data = await res.json();

      if (data.correct) {
        // 答對了
        setMessages((prev) => [...prev, { role: "system", text: data.message }]);
        setGameWon(true);
      } else {
        // 答錯了，顯示 AI 給的關聯性提示
        setMessages((prev) => [...prev, { role: "system", text: data.message }]);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { role: "system", text: "AI 思考中斷，請重試。" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4 font-sans">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
        
        {/* 標題區 */}
        <div className="bg-gray-700 p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">AI 猜字謎 Agent</h1>
          <button 
            onClick={startGame} 
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition"
          >
            重開局
          </button>
        </div>

        {/* 對話框顯示區 */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none" // 使用者樣式
                    : "bg-gray-600 text-gray-100 rounded-bl-none border border-gray-500" // AI 樣式
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-600 text-gray-300 rounded-lg p-3 text-xs animate-pulse">
                AI 正在分析關聯性...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 輸入區：如果答對(gameWon)則隱藏 */}
        {!gameWon ? (
          <form onSubmit={handleGuess} className="p-4 bg-gray-700 border-t border-gray-600 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="輸入你的猜測..."
              className="flex-1 bg-gray-900 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-500 text-white px-4 py-2 rounded font-medium transition"
            >
              送出
            </button>
          </form>
        ) : (
          <div className="p-4 bg-green-900/50 border-t border-green-700 text-center">
            <p className="text-green-300 font-bold text-lg">🎉 遊戲勝利！ 🎉</p>
            <p className="text-sm text-green-400 mt-1">點擊上方「重開局」再來一次</p>
          </div>
        )}
      </div>
    </main>
  );
}