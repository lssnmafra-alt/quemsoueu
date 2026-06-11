import { Groq } from 'groq-sdk';
import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });
dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

async function run() {
  const names = ['Felix', 'Aneka', 'Oliver', 'Jude', 'Destiny'];
  const results: any = {};
  
  for (const name of names) {
    console.log(`Generating SVG for ${name}...`);
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are an expert SVG designer creating cinematic, abstract, stylized neon synthwave portrait graphics. Return ONLY raw, valid SVG code, no markdown wrappers, no explanations. The SVG should be 150x150.'
        },
        {
          role: 'user',
          content: `Spy Agent: ${name}`
        }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
    });

    let svg = completion.choices[0].message.content || '';
    if (svg.includes('<svg')) {
      svg = svg.substring(svg.indexOf('<svg'));
    }
    if (svg.includes('</svg>')) {
      svg = svg.substring(0, svg.lastIndexOf('</svg>') + 6);
    }
    
    const base64Svg = Buffer.from(svg).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
    results[name] = dataUrl;
  }
  
  fs.writeFileSync('avatars.json', JSON.stringify(results, null, 2));
  console.log("Written to avatars.json");
}

run();
