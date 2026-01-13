import { GoogleGenAI } from '@google/genai';
import { getCharacterPrompt } from '../lib/characters.js';

// Initialize Gemini client
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  console.log('📥 API Request:', req.method, req.url);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health check endpoint
  if (req.url.endsWith('/health')) {
    res.status(200).json({ status: 'ok', service: 'Gemini 3 Pro Agent' });
    return;
  }

  // Chat endpoint
  if (req.url.endsWith('/chat') && req.method === 'POST') {
    try {
      const { message, characterId, history } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const targetCharacterId = characterId || 'alice';
      const systemPrompt = getCharacterPrompt(targetCharacterId);

      // Build conversation history for Gemini
      const contents = [];

      // Add history messages
      if (history && history.length > 0) {
        for (const msg of history) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text || msg.content }]
          });
        }
      }

      // Add current user message
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await genai.models.generateContent({
        model: 'gemini-2.5-pro-preview-05-06',
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 200,
          temperature: 0.7,
        }
      });

      const reply = response.text;

      return res.status(200).json({
        text: reply,
        characterId: targetCharacterId,
        action: "NONE" // Placeholder for future actions
      });

    } catch (error) {
      console.error('Error processing chat:', error);
      return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
  }

  // Voice sample endpoint (ElevenLabs TTS)
  if (req.url.endsWith('/voice-sample') && req.method === 'POST') {
    try {
      const { text, voiceId } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
      if (!elevenLabsApiKey) {
        return res.status(500).json({ error: 'ElevenLabs API key not configured' });
      }

      const targetVoiceId = voiceId || 'rEJAAHKQqr6yTNCh8xS0'; // Default voice

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': elevenLabsApiKey,
          },
          body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ElevenLabs API error:', response.status, errorText);
        return res.status(response.status).json({ error: 'ElevenLabs API error', details: errorText });
      }

      const audioBuffer = await response.arrayBuffer();

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', audioBuffer.byteLength);
      return res.send(Buffer.from(audioBuffer));

    } catch (error) {
      console.error('Error generating voice:', error);
      return res.status(500).json({ error: 'Voice generation failed', details: error.message });
    }
  }

  // Default 404
  res.status(404).json({ error: 'Not Found' });
}
