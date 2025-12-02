// src/app/api/game/route.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// 請確保在 .env.local 檔案中設定了 GOOGLE_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

export async function POST(req) {
  const { action, targetWord, userGuess } = await req.json();
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  try {
    // 模式一：遊戲開始，生成謎底與第一個提示
    if (action === "start") {
      const prompt = `
        你是一個猜謎遊戲的主持人。請隨機想一個常見的名詞（例如：動物、水果、物品、職業）。
        請回傳一個 JSON 格式，包含兩個欄位：
        1. "word": 謎底（繁體中文）。
        2. "hint": 關於這個謎底的一個隱晦但有關聯的提示（不要直接講出答案）。
        
        只回傳 JSON 字串，不要有 Markdown 格式。
      `;
      
      const result = await model.generateContent(prompt);
      const response = result.response.text().replace(/```json|```/g, "").trim();
      return NextResponse.json(JSON.parse(response));
    }

    // 模式二：使用者猜測，分析關聯性
    if (action === "guess" && targetWord && userGuess) {
      // 如果完全答對
      if (targetWord.trim() === userGuess.trim()) {
        return NextResponse.json({ correct: true, message: `恭喜你！答案正是「${targetWord}」！` });
      }

      // 如果答錯，AI 分析關聯性
      const prompt = `
        謎底是：「${targetWord}」。
        使用者猜：「${userGuess}」。
        使用者猜錯了。
        
        請用繁體中文，以「對話框」的口吻，簡短解釋「${userGuess}」和「${targetWord}」之間的關聯性或區別，引導使用者猜出正確答案。
        例如：如果謎底是蘋果，使用者猜香蕉，你可以說：「香蕉也是水果，但謎底是紅色的，而且長在樹上。」
        
        請直接回覆提示內容，不要包含答案。
      `;

      const result = await model.generateContent(prompt);
      const hint = result.response.text();
      return NextResponse.json({ correct: false, message: hint });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "AI Busy" }, { status: 500 });
  }
}