import { createClient } from '@supabase/supabase-js';
import { Groq } from 'groq-sdk';
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function run() {
  const { data: chars } = await supabase.from('characters').select('*');
  if (!chars) return;
  
  for (const char of chars) {
    if (char.image_url && (char.image_url.includes('pollinations.ai') || char.image_url.includes('data:image') || char.image_url.includes('r2.dev') || char.image_url.includes('svg'))) {
        console.log(`Generating image for ${char.name}...`);
        
        try {
          const refinement = await groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: "You are a specialized prompt engineer. Transform character names into abstract, stylized neon synthwave image prompts. Focus on symbols, geometric shapes, and atmospheric lighting (cyan/magenta). Do NOT describe a realistic person. Describe a 'symbolic portrait' using glowing lines and synthwave aesthetics. Keep it concise."
              },
              {
                role: "user",
                content: char.name
              }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
          });
  
          const refinedPrompt = refinement.choices[0].message.content || char.name;
          const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(refinedPrompt)}?model=zimage&width=400&height=500&nologo=true`;
          
          const headers: any = {};
          if (process.env.POLLINATIONS_API_KEY) {
            headers['Authorization'] = `Bearer ${process.env.POLLINATIONS_API_KEY}`;
          }

          const response = await fetch(imageUrl, { headers });
          if (!response.ok) throw new Error(`Pollinations error (${response.status}): ${response.statusText}`);

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);

          const key = `char_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
          await s3Client.send(
            new PutObjectCommand({
              Bucket: process.env.R2_BUCKET_NAME || '',
              Key: key,
              Body: buffer,
              ContentType: "image/png",
              CacheControl: "public, max-age=31536000",
            })
          );
          
          const publicUrl = process.env.R2_PUBLIC_URL?.endsWith('/') 
            ? `${process.env.R2_PUBLIC_URL}${key}` 
            : `${process.env.R2_PUBLIC_URL}/${key}`;
          
          await supabase.from('characters').update({ image_url: publicUrl }).eq('id', char.id);
          console.log(`✅ Updated ${char.name} -> ${publicUrl}`);
        } catch (e) {
          console.error(`❌ Failed for ${char.name}`, e);
        }
    }
  }
}

run();
