import { OpenAI } from 'openai';
import { getCharacterPrompt } from '../lib/characters.js';

// Initialize OpenAI client
// Note: Vercel/Next.js automatically loads process.env variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    res.status(200).json({ status: 'ok', service: 'Direct LLM Agent' });
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

      // Construct messages array
      const messages = [
        { role: 'system', content: systemPrompt },
        ...(history || []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.text || msg.content
        })),
        { role: 'user', content: message }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Fast and cost-effective
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
      });

      const reply = completion.choices[0].message.content;

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

  // Default 404
  res.status(404).json({ error: 'Not Found' });
}
