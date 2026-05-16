require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function run() {
    try {
        const chat = await ai.chats.create({
            model: 'gemini-2.5-flash',
            history: [
                { role: 'user', parts: [{ text: "hi" }] },
                { role: 'model', parts: [{ text: "Hi there!" }] }
            ]
        });
        const res = await chat.sendMessage({ message: "hello" });
        console.log("SUCCESS", res.text);
    } catch(e) {
        console.error(e);
    }
}
run();
