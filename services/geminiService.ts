
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ProjectFile } from "../types";

const SYSTEM_INSTRUCTION = `You are DevMind AI, an elite Full-Stack Architect.
You work within a virtual IDE environment that has a live web preview.

Rules for Output:
1. When creating or updating files, you MUST use this exact format:
   FILE: path/to/filename.ext
   \`\`\`language
   content
   \`\`\`

2. IMPORTANT: For any web UI request, you MUST always include or update an 'index.html' file. 
3. PREVIEW LOGIC: The preview environment renders 'index.html'. If you create 'style.css' or 'script.js', you MUST link them in 'index.html' using relative paths:
   - <link rel="stylesheet" href="style.css">
   - <script src="script.js"></script>
4. Focus on production-ready, modular, and typed code.
5. You can provide multiple file blocks. Explain architectural decisions briefly.
6. Assume a modern React/Tailwind/Vite environment unless specified. Use CDN links for external libraries in HTML if needed.`;

export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async *streamMessage(userMessage: string, currentFiles: ProjectFile[]) {
    if (!this.chatSession) {
      this.chatSession = this.ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          temperature: 0.4,
        },
      });
    }

    const contextStr = currentFiles.length > 0 
      ? `\n\nCURRENT PROJECT STRUCTURE:\n${currentFiles.map(f => `- ${f.path}`).join('\n')}`
      : "";

    try {
      const responseStream = await this.chatSession.sendMessageStream({
        message: userMessage + contextStr,
      });

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        yield c.text || '';
      }
    } catch (error: any) {
      if (error.message?.includes("entity was not found")) {
        this.chatSession = null; 
      }
      throw error;
    }
  }

  resetSession() {
    this.chatSession = null;
  }
}

export const geminiService = new GeminiService();
