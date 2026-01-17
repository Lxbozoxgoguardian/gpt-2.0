
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { ProjectFile } from "../types.ts";

const SYSTEM_INSTRUCTION = `You are DevMind AI, an elite Coding Chat Bot and Software Architect.
You help users build projects within a virtual IDE.

STRICT FILE RULES:
1. You are ONLY allowed to create or modify files with these extensions: .html, .js, .py
2. Do NOT create .css, .ts, .tsx, .txt, or any other file types. 
3. For styling, use Tailwind CSS CDN within the .html files.
4. For logic, use .js or .py.

OUTPUT FORMAT:
To create or update a file, use this EXACT format:
FILE: path/filename.ext
\`\`\`language
content
\`\`\`

Example:
FILE: index.html
\`\`\`html
<!DOCTYPE html>...
\`\`\`

Always start by creating an 'index.html' for any web project so the live preview works.
Keep explanations concise and code-focused.`;

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
          temperature: 0.3,
        },
      });
    }

    const contextStr = currentFiles.length > 0 
      ? `\n\nCURRENT PROJECT FILES (ALLOWED: .html, .js, .py):\n${currentFiles.map(f => `- ${f.path}`).join('\n')}`
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
