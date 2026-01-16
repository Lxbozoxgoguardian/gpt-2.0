
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

2. FILE EXTENSIONS: 
   - Use '.html' for page structure.
   - Use '.css' for styling.
   - Use '.js' or '.ts' for logic.
   - Use '.tsx' ONLY for React components.

3. PREVIEW MANDATE: 
   - Every project MUST have an 'index.html'. If it is missing, CREATE IT.
   - You MUST link styles and scripts in 'index.html' using:
     <link rel="stylesheet" href="style.css">
     <script src="script.js"></script>
   - Do not use 'index.tsx' as the link in 'index.html' directly; use '.js' or '.ts' for the main logic file you generate for the user's project.

4. FOCUS: Professional, clean, and production-ready code. Briefly explain your work.
5. Use Tailwind CDN or external assets in 'index.html' if requested.`;

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
