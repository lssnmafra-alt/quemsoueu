(()=>{var a={};a.id=175,a.ids=[175,548],a.modules={261:a=>{"use strict";a.exports=require("next/dist/shared/lib/router/utils/app-paths")},3295:a=>{"use strict";a.exports=require("next/dist/server/app-render/after-task-async-storage.external.js")},10846:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},19121:a=>{"use strict";a.exports=require("next/dist/server/app-render/action-async-storage.external.js")},29294:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-async-storage.external.js")},42333:(a,b,c)=>{"use strict";c.r(b),c.d(b,{handler:()=>F,patchFetch:()=>E,routeModule:()=>A,serverHooks:()=>D,workAsyncStorage:()=>B,workUnitAsyncStorage:()=>C});var d={};c.r(d),c.d(d,{POST:()=>y});var e=c(95736),f=c(9117),g=c(4044),h=c(39326),i=c(32324),j=c(261),k=c(54290),l=c(85328),m=c(38928),n=c(46595),o=c(3421),p=c(17679),q=c(41681),r=c(63446),s=c(86439),t=c(51356),u=c(10641);let v=require("@aws-sdk/client-s3");var w=c(86548);let x=new v.S3Client({region:"auto",endpoint:`https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID||"",secretAccessKey:process.env.R2_SECRET_ACCESS_KEY||""}});async function y(a){try{let{prompt:b}=await a.json();if(!b)return u.NextResponse.json({error:"Prompt is required"},{status:400});let c={};if(process.env.GROQ_API_KEY&&"MY_GROQ_API_KEY"!==process.env.GROQ_API_KEY)try{let a=(0,w.getGroqClient)(),d=await a.chat.completions.create({messages:[{role:"system",content:`You are a character visual designer. Given a character name or description, output ONLY a JSON object with their distinctive visual traits for a cartoon avatar silhouette. Never include real person names in output.

Output ONLY valid JSON (no markdown, no explanation):
{
  "skinTone": "#hex",
  "hairColor": "#hex",
  "hairStyle": "mohawk|low_fade_curly|short_wavy|long_straight|afro|bald|undercut|man_bun|short_spiky|medium_wavy",
  "beardStyle": "none|stubble|full_beard|goatee|short_beard",
  "eyeColor": "#hex",
  "eyeSize": "normal|big|small",
  "faceShape": "round|oval|square|chubby",
  "shirtColor": "#hex",
  "shirtAccentColor": "#hex",
  "outfitPattern": "solid|brazil|argentina|barca|muscle|armor|heroine|fluminense|atletico_mg",
  "headwear": "none|gold_tiara|iron_helmet",
  "badgeText": "1-3 letters or number",
  "accessories": ["none"|"earring_left"|"earring_both"|"glasses"|"headband"],
  "expression": "happy|big_smile|calm|confident|cool",
  "cheekBlush": true|false,
  "bgColor1": "#hex",
  "bgColor2": "#hex",
  "initials": "2 letters"
}

Examples of how to translate without using names:
- Soccer player from Brazil known for flair → mohawk or undercut hair, earring, dark skin, yellow/green shirt
- Short Argentine player with beard → short_wavy hair, full_beard, light-medium skin, blue/white shirt  
- Young Moroccan-Spanish teen winger → low_fade_curly, no beard, dark skin, red shirt`},{role:"user",content:`Character: ${b}`}],model:"llama-3.3-70b-versatile",temperature:.7,max_tokens:300}),e=d.choices[0]?.message?.content?.trim()||"{}";c=JSON.parse(e.replace(/```json|```/g,"").trim())}catch(a){console.warn("Groq prompt trait translation failed, continuing with fallback:",a)}c=function(a,b){let c=(a||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,""),d=a=>({...b,...a});if(c.includes("neymar"))return d({skinTone:"#9B5A16",hairColor:"#2B1A10",hairStyle:"mohawk",beardStyle:"goatee",eyeColor:"#3A1D08",eyeSize:"big",faceShape:"round",shirtColor:"#F6D94A",shirtAccentColor:"#168A3A",outfitPattern:"brazil",accessories:["earring_both"],expression:"confident",cheekBlush:!1,bgColor1:"#69C64A",bgColor2:"#2F8D38",initials:"NJ",badgeText:"10"});if(c.includes("messi"))return d({skinTone:"#F0C08B",hairColor:"#4A2A16",hairStyle:"short_wavy",beardStyle:"full_beard",eyeColor:"#4A2A16",eyeSize:"normal",faceShape:"oval",shirtColor:"#75CDEB",shirtAccentColor:"#FFFFFF",outfitPattern:"argentina",accessories:["none"],expression:"calm",cheekBlush:!1,bgColor1:"#D8F5FF",bgColor2:"#93D8F0",initials:"LM",badgeText:"10"});if(c.includes("lamine")||c.includes("yamal"))return d({skinTone:"#8A4B18",hairColor:"#2A1710",hairStyle:"low_fade_curly",beardStyle:"none",eyeColor:"#2A1710",eyeSize:"big",faceShape:"round",shirtColor:"#D90429",shirtAccentColor:"#2347A8",outfitPattern:"barca",accessories:["earring_both"],expression:"big_smile",cheekBlush:!1,bgColor1:"#E8E0D2",bgColor2:"#BFB7A8",initials:"LY",badgeText:"19"});if(c.includes("hulk")&&(c.includes("jogador")||c.includes("futebol")||c.includes("fluminense")||c.includes("atletico")||c.includes("atl\xe9tico")||c.includes("cam"))){let a=c.includes("fluminense");return d({skinTone:"#B06B3A",hairColor:"#151515",hairStyle:"short_wavy",beardStyle:"full_beard",eyeColor:"#1F2937",eyeSize:"normal",faceShape:"square",shirtColor:a?"#7A1021":"#111827",shirtAccentColor:"#FFFFFF",outfitPattern:a?"fluminense":"atletico_mg",accessories:["none"],expression:"confident",cheekBlush:!1,bgColor1:a?"#FFFFFF":"#2E2E2E",bgColor2:a?"#6E1423":"#111111",initials:a?"FLU":"CAM",badgeText:"7"})}return c.includes("hulk")?d({skinTone:"#22B835",hairColor:"#101010",hairStyle:"short_wavy",beardStyle:"none",eyeColor:"#111111",eyeSize:"big",faceShape:"square",shirtColor:"#078A08",shirtAccentColor:"#5B2A86",outfitPattern:"muscle",accessories:["none"],expression:"confident",cheekBlush:!1,bgColor1:"#4B4B4B",bgColor2:"#111111",initials:"HG",badgeText:"H"}):c.includes("homem de ferro")||c.includes("iron man")?d({skinTone:"#C62828",hairColor:"#7A1111",hairStyle:"bald",beardStyle:"none",eyeColor:"#8FEFFF",eyeSize:"small",faceShape:"square",shirtColor:"#B71C1C",shirtAccentColor:"#FFD54F",outfitPattern:"armor",headwear:"iron_helmet",accessories:["none"],expression:"cool",cheekBlush:!1,bgColor1:"#BDBDBD",bgColor2:"#505050",initials:"HF",badgeText:"A"}):c.includes("mulher maravilha")||c.includes("wonder woman")?d({skinTone:"#F0B987",hairColor:"#171018",hairStyle:"long_straight",beardStyle:"none",eyeColor:"#1F4FA3",eyeSize:"big",faceShape:"oval",shirtColor:"#C91524",shirtAccentColor:"#F5C84C",outfitPattern:"heroine",headwear:"gold_tiara",accessories:["earring_both"],expression:"confident",cheekBlush:!0,bgColor1:"#DDF8FF",bgColor2:"#8CCBE8",initials:"MM",badgeText:"W"}):b}(b,c);let d=function(a){let b=a.skinTone||"#C68642",c=a.hairColor||"#1a1a1a",d=a.eyeColor||"#3d2200",e=a.shirtColor||"#2196F3",f=a.shirtAccentColor||"#ffffff",g=a.bgColor1||"#1565C0",h=a.bgColor2||"#0D47A1",i=(a.initials||"?").toUpperCase().replace(/[^A-Z0-9?]/g,"").slice(0,2)||"?",j=a.hairStyle||"short_wavy",k=a.beardStyle||"none",l=a.expression||"happy",m=a.eyeSize||"normal",n=a.faceShape||"oval",o=!1!==a.cheekBlush,p=Array.isArray(a.accessories)?a.accessories:[a.accessories||"none"],q=a.outfitPattern||"solid",r=a.headwear||"none",s=(a.badgeText||i).toUpperCase().replace(/[^A-Z0-9?]/g,"").slice(0,3)||i,t="round"===n||"chubby"===n?40:36,u="big"===m?11:"small"===m?8:9,v="big"===m?10:"small"===m?7:8,w="big"===m?6.5:5,x=200-t+14,y=200+t-14,A="chubby"===n?194:196,B={mohawk:`
      <ellipse cx="200" cy="188" rx="38" ry="32" fill="${b}"/>
      <ellipse cx="200" cy="148" rx="14" ry="36" fill="${c}"/>
      <ellipse cx="162" cy="200" rx="9" ry="14" fill="${z(b,-10)}"/>
      <ellipse cx="238" cy="200" rx="9" ry="14" fill="${z(b,-10)}"/>`,low_fade_curly:`
      <ellipse cx="200" cy="170" rx="40" ry="32" fill="${c}"/>
      <ellipse cx="200" cy="158" rx="36" ry="18" fill="${c}"/>
      <ellipse cx="162" cy="190" rx="11" ry="15" fill="${z(c,30)}"/>
      <ellipse cx="238" cy="190" rx="11" ry="15" fill="${z(c,30)}"/>`,short_wavy:`
      <ellipse cx="200" cy="172" rx="40" ry="34" fill="${c}"/>
      <ellipse cx="200" cy="158" rx="38" ry="20" fill="${c}"/>`,long_straight:`
      <ellipse cx="200" cy="172" rx="40" ry="34" fill="${c}"/>
      <rect x="160" y="188" width="18" height="110" rx="9" fill="${c}"/>
      <rect x="222" y="188" width="18" height="110" rx="9" fill="${c}"/>`,afro:`
      <ellipse cx="200" cy="160" rx="56" ry="52" fill="${c}"/>
      <circle cx="152" cy="185" r="20" fill="${c}"/>
      <circle cx="248" cy="185" r="20" fill="${c}"/>`,bald:"",undercut:`
      <ellipse cx="200" cy="170" rx="40" ry="32" fill="${c}"/>
      <rect x="160" y="178" width="80" height="14" fill="${c}"/>
      <ellipse cx="162" cy="196" rx="8" ry="10" fill="${z(b,-5)}"/>
      <ellipse cx="238" cy="196" rx="8" ry="10" fill="${z(b,-5)}"/>`,man_bun:`
      <ellipse cx="200" cy="175" rx="38" ry="30" fill="${c}"/>
      <ellipse cx="200" cy="148" rx="20" ry="20" fill="${c}"/>
      <circle cx="200" cy="144" r="14" fill="${z(c,10)}"/>`,short_spiky:`
      <ellipse cx="200" cy="176" rx="38" ry="30" fill="${c}"/>
      <path d="M180 158 L185 138 L190 158" fill="${c}"/>
      <path d="M192 154 L197 132 L202 154" fill="${c}"/>
      <path d="M204 154 L209 136 L214 154" fill="${c}"/>
      <path d="M216 158 L220 140 L225 158" fill="${c}"/>`,medium_wavy:`
      <ellipse cx="200" cy="168" rx="42" ry="36" fill="${c}"/>
      <ellipse cx="200" cy="156" rx="40" ry="22" fill="${c}"/>
      <rect x="160" y="185" width="16" height="60" rx="8" fill="${c}"/>
      <rect x="224" y="185" width="16" height="60" rx="8" fill="${c}"/>`},C={none:"",stubble:`<ellipse cx="200" cy="232" rx="26" ry="10" fill="${z(c,40)}" fill-opacity="0.5"/>`,full_beard:`
      <ellipse cx="200" cy="234" rx="30" ry="16" fill="${c}"/>
      <rect x="170" y="218" width="60" height="18" rx="4" fill="${c}"/>
      <ellipse cx="200" cy="232" rx="24" ry="12" fill="${z(c,20)}"/>`,goatee:`
      <ellipse cx="200" cy="236" rx="16" ry="12" fill="${c}"/>`,short_beard:`
      <ellipse cx="200" cy="232" rx="28" ry="13" fill="${c}"/>
      <rect x="172" y="220" width="56" height="14" rx="3" fill="${c}"/>`},D="none"!==k?222:224,E={happy:`<path d="M182 ${D} Q200 ${D+14} 218 ${D}" stroke="${z(b,-60)}" stroke-width="3" fill="none" stroke-linecap="round"/>`,big_smile:`<path d="M178 ${D} Q200 ${D+18} 222 ${D}" stroke="${z(b,-60)}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
                 <ellipse cx="188" cy="${D+5}" rx="5" ry="3" fill="#FF8A80" fill-opacity="0.5"/>
                 <ellipse cx="212" cy="${D+5}" rx="5" ry="3" fill="#FF8A80" fill-opacity="0.5"/>`,calm:`<path d="M186 ${D+2} Q200 ${D+8} 214 ${D+2}" stroke="${z(b,-60)}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,confident:`<path d="M184 ${D} Q200 ${D+12} 216 ${D}" stroke="${z(b,-60)}" stroke-width="3" fill="none" stroke-linecap="round"/>`,cool:`<line x1="186" y1="${D+4}" x2="214" y2="${D+4}" stroke="${z(b,-60)}" stroke-width="2.5" stroke-linecap="round"/>`},F="";(p.includes("earring_left")||p.includes("earring_both"))&&(F+=`<circle cx="${200-t-8}" cy="210" r="5" fill="#FFD600"/>`),p.includes("earring_both")&&(F+=`<circle cx="${200+t+8}" cy="210" r="5" fill="#FFD600"/>`),p.includes("glasses")&&(F+=`
      <rect x="${x-14}" y="${A-10}" width="28" height="20" rx="6" fill="none" stroke="#555" stroke-width="3"/>
      <rect x="${y-14}" y="${A-10}" width="28" height="20" rx="6" fill="none" stroke="#555" stroke-width="3"/>
      <line x1="${x+14}" y1="${A}" x2="${y-14}" y2="${A}" stroke="#555" stroke-width="2.5"/>`),p.includes("headband")&&(F+=`<rect x="${200-t-2}" y="204" width="${(t+2)*2}" height="14" rx="7" fill="${f}"/>`),"gold_tiara"===r&&(F+=`
      <path d="M158 174 Q200 144 242 174 L230 188 Q200 174 170 188 Z" fill="#F5C84C"/>
      <path d="M190 170 L200 150 L210 170 Z" fill="#D7192A"/>
      <circle cx="200" cy="168" r="5" fill="#2F62C9"/>`),"iron_helmet"===r&&(F+=`
      <path d="M160 174 Q200 136 240 174 L235 224 Q200 250 165 224 Z" fill="#B71C1C"/>
      <path d="M174 178 Q200 158 226 178 L220 220 Q200 236 180 220 Z" fill="#FFD54F"/>
      <rect x="${x-12}" y="${A-6}" width="24" height="8" rx="4" fill="#8FEFFF"/>
      <rect x="${y-12}" y="${A-6}" width="24" height="8" rx="4" fill="#8FEFFF"/>
      <line x1="186" y1="228" x2="214" y2="228" stroke="#7A1111" stroke-width="4" stroke-linecap="round"/>`);let G=o?`<ellipse cx="${x-4}" cy="${A+22}" rx="14" ry="8" fill="#FF8C8C" fill-opacity="0.22"/>
       <ellipse cx="${y+4}" cy="${A+22}" rx="14" ry="8" fill="#FF8C8C" fill-opacity="0.22"/>`:"",H="argentina"===q?`
    <rect x="132" y="308" width="30" height="150" fill="${f}" fill-opacity="0.95"/>
    <rect x="190" y="300" width="24" height="165" fill="${f}" fill-opacity="0.95"/>
    <rect x="240" y="310" width="30" height="150" fill="${f}" fill-opacity="0.95"/>`:"brazil"===q?`
    <path d="M118 354 L200 302 L282 354 L200 408 Z" fill="${f}" fill-opacity="0.9"/>
    <circle cx="200" cy="354" r="28" fill="#244CB5" fill-opacity="0.95"/>`:"barca"===q?`
    <rect x="132" y="300" width="42" height="170" fill="${f}" fill-opacity="0.95"/>
    <rect x="214" y="300" width="42" height="170" fill="${f}" fill-opacity="0.95"/>
    <path d="M130 326 Q200 348 270 326" stroke="#F5C84C" stroke-width="10" fill="none"/>`:"muscle"===q?`
    <ellipse cx="104" cy="364" rx="54" ry="48" fill="${z(b,-18)}"/>
    <ellipse cx="296" cy="364" rx="54" ry="48" fill="${z(b,-18)}"/>
    <circle cx="76" cy="410" r="34" fill="${z(b,-8)}"/>
    <circle cx="324" cy="410" r="34" fill="${z(b,-8)}"/>
    <path d="M98 320 Q200 250 302 320 L282 430 Q200 476 118 430 Z" fill="${z(b,-12)}"/>
    <path d="M150 328 Q200 370 250 328" stroke="${z(b,46)}" stroke-width="10" fill="none"/>
    <path d="M156 380 Q200 410 244 380" stroke="${z(b,-42)}" stroke-width="7" fill="none"/>
    <path d="M118 420 L282 420 L264 500 H136 Z" fill="#5B2A86"/>
    <path d="M142 438 H258" stroke="#7E3FB0" stroke-width="14"/>`:"armor"===q?`
    <path d="M116 306 L284 306 L262 470 L138 470 Z" fill="#B71C1C"/>
    <path d="M154 312 L200 352 L246 312 L224 430 L176 430 Z" fill="#FFD54F"/>
    <circle cx="200" cy="362" r="22" fill="#8FEFFF"/>
    <circle cx="200" cy="362" r="13" fill="#FFFFFF" fill-opacity="0.85"/>`:"heroine"===q?`
    <path d="M120 310 L280 310 L250 470 L150 470 Z" fill="#C91524"/>
    <path d="M142 314 L200 358 L258 314" stroke="${f}" stroke-width="16" fill="none"/>
    <path d="M166 360 L200 392 L234 360" stroke="${f}" stroke-width="10" fill="none"/>`:"fluminense"===q?`
    <path d="M116 302 L284 302 L262 470 L138 470 Z" fill="#7A1021"/>
    <rect x="128" y="302" width="34" height="170" fill="#FFFFFF"/>
    <rect x="190" y="292" width="28" height="180" fill="#FFFFFF"/>
    <rect x="246" y="302" width="34" height="170" fill="#FFFFFF"/>
    <path d="M116 350 H284" stroke="#0B6B3A" stroke-width="18"/>
    <circle cx="200" cy="390" r="28" fill="#FFFFFF"/>
    <text x="200" y="400" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="20" font-weight="900" fill="#7A1021">FLU</text>`:"atletico_mg"===q?`
    <path d="M116 302 L284 302 L262 470 L138 470 Z" fill="#111827"/>
    <rect x="132" y="308" width="34" height="170" fill="#FFFFFF"/>
    <rect x="190" y="292" width="28" height="180" fill="#FFFFFF"/>
    <rect x="238" y="308" width="34" height="170" fill="#FFFFFF"/>
    <path d="M116 376 H284" stroke="#111827" stroke-width="18"/>
    <circle cx="200" cy="390" r="28" fill="#111827"/>
    <text x="200" y="400" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="20" font-weight="900" fill="#FFFFFF">CAM</text>`:"",I="armor"===q||"fluminense"===q||"atletico_mg"===q?"":`<circle cx="200" cy="388" r="26" fill="${f}" fill-opacity="0.95"/>
  <text x="200" y="396" text-anchor="middle" font-family="Arial Black,sans-serif" font-size="16" font-weight="900" fill="${e}">${s}</text>`;return`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${g}"/>
      <stop offset="100%" stop-color="${h}"/>
    </radialGradient>
  </defs>

  <rect width="400" height="500" fill="url(#bg)"/>
  <circle cx="60" cy="80" r="55" fill="white" fill-opacity="0.06"/>
  <circle cx="350" cy="430" r="75" fill="white" fill-opacity="0.06"/>

  <!-- Neck -->
  <rect x="184" y="246" width="32" height="80" rx="13" fill="${b}"/>

  <!-- Body -->
  <ellipse cx="200" cy="430" rx="142" ry="108" fill="${e}"/>
  <ellipse cx="200" cy="336" rx="118" ry="64" fill="${e}"/>
  <path d="M150 300 Q200 330 250 300" fill="${z(e,-20)}"/>
  ${H}

  <!-- Hair (back) -->
  ${B[j]||B.short_wavy}

  <!-- Face -->
  <ellipse cx="200" cy="210" rx="${t}" ry="${"chubby"===n?44:42}" fill="${b}"/>

  <!-- Ears -->
  <ellipse cx="${200-t-4}" cy="210" rx="12" ry="16" fill="${b}"/>
  <ellipse cx="${200+t+4}" cy="210" rx="12" ry="16" fill="${b}"/>
  <ellipse cx="${200-t-4}" cy="210" rx="7" ry="10" fill="${z(b,-18)}"/>
  <ellipse cx="${200+t+4}" cy="210" rx="7" ry="10" fill="${z(b,-18)}"/>

  <!-- Beard (below face) -->
  ${C[k]||""}

  <!-- Eyebrows -->
  <path d="M${x-4} ${A-14} Q${x+9} ${A-20} ${x+18} ${A-13}" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M${y-18} ${A-13} Q${y-9} ${A-20} ${y+4} ${A-14}" stroke="${c}" stroke-width="3.5" fill="none" stroke-linecap="round"/>

  <!-- Eyes -->
  <ellipse cx="${x}" cy="${A}" rx="${u}" ry="${v}" fill="white"/>
  <ellipse cx="${y}" cy="${A}" rx="${u}" ry="${v}" fill="white"/>
  <circle cx="${x+2}" cy="${A+1}" r="${w}" fill="${d}"/>
  <circle cx="${y+2}" cy="${A+1}" r="${w}" fill="${d}"/>
  <circle cx="${x+2}" cy="${A+1}" r="${.55*w}" fill="#111"/>
  <circle cx="${y+2}" cy="${A+1}" r="${.55*w}" fill="#111"/>
  <circle cx="${x+4}" cy="${A-2}" r="${.35*w}" fill="white"/>
  <circle cx="${y+4}" cy="${A-2}" r="${.35*w}" fill="white"/>

  <!-- Nose -->
  <path d="M197 ${A+12} Q200 ${A+22} 203 ${A+12}" stroke="${z(b,-45)}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M194 ${A+22} Q200 ${A+27} 206 ${A+22}" stroke="${z(b,-45)}" stroke-width="1.8" fill="none" stroke-linecap="round"/>

  <!-- Mouth -->
  ${E[l]||E.happy}

  <!-- Cheek blush -->
  ${G}

  <!-- Accessories -->
  ${F}

  <!-- Shirt badge -->
  ${I}
</svg>`}(c),e=`char_${Date.now()}_${Math.random().toString(36).slice(2,7)}.svg`;if(process.env.CLOUDFLARE_ACCOUNT_ID&&process.env.R2_BUCKET_NAME)try{await x.send(new v.PutObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:e,Body:Buffer.from(d),ContentType:"image/svg+xml",CacheControl:"public, max-age=31536000"}));let a=process.env.R2_PUBLIC_URL||"";return u.NextResponse.json({url:a.endsWith("/")?`${a}${e}`:`${a}/${e}`})}catch(a){console.warn("R2 upload failed, falling back to data URI:",a)}let f=Buffer.from(d).toString("base64");return u.NextResponse.json({url:`data:image/svg+xml;base64,${f}`})}catch(a){return console.error("Image generation error:",a),u.NextResponse.json({error:a.message||"Internal error"},{status:500})}}function z(a,b){try{let c=a.replace("#","").padStart(6,"0"),d=parseInt(c,16),e=Math.min(255,Math.max(0,(d>>16)+b)),f=Math.min(255,Math.max(0,(d>>8&255)+b)),g=Math.min(255,Math.max(0,(255&d)+b));return`#${(0x1000000|e<<16|f<<8|g).toString(16).slice(1)}`}catch{return a}}let A=new e.AppRouteRouteModule({definition:{kind:f.RouteKind.APP_ROUTE,page:"/api/generate-image/route",pathname:"/api/generate-image",filename:"route",bundlePath:"app/api/generate-image/route"},distDir:".next",relativeProjectDir:"",resolvedPagePath:"/workspaces/quemsoueu/app/api/generate-image/route.ts",nextConfigOutput:"standalone",userland:d}),{workAsyncStorage:B,workUnitAsyncStorage:C,serverHooks:D}=A;function E(){return(0,g.patchFetch)({workAsyncStorage:B,workUnitAsyncStorage:C})}async function F(a,b,c){var d;let e="/api/generate-image/route";"/index"===e&&(e="/");let g=await A.prepare(a,b,{srcPage:e,multiZoneDraftMode:!1});if(!g)return b.statusCode=400,b.end("Bad Request"),null==c.waitUntil||c.waitUntil.call(c,Promise.resolve()),null;let{buildId:u,params:v,nextConfig:w,isDraftMode:x,prerenderManifest:y,routerServerContext:z,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,resolvedPathname:D}=g,E=(0,j.normalizeAppPath)(e),F=!!(y.dynamicRoutes[E]||y.routes[D]);if(F&&!x){let a=!!y.routes[D],b=y.dynamicRoutes[E];if(b&&!1===b.fallback&&!a)throw new s.NoFallbackError}let G=null;!F||A.isDev||x||(G="/index"===(G=D)?"/":G);let H=!0===A.isDev||!F,I=F&&!H,J=a.method||"GET",K=(0,i.getTracer)(),L=K.getActiveScopeSpan(),M={params:v,prerenderManifest:y,renderOpts:{experimental:{cacheComponents:!!w.experimental.cacheComponents,authInterrupts:!!w.experimental.authInterrupts},supportsDynamicResponse:H,incrementalCache:(0,h.getRequestMeta)(a,"incrementalCache"),cacheLifeProfiles:null==(d=w.experimental)?void 0:d.cacheLife,isRevalidate:I,waitUntil:c.waitUntil,onClose:a=>{b.on("close",a)},onAfterTaskError:void 0,onInstrumentationRequestError:(b,c,d)=>A.onRequestError(a,b,d,z)},sharedContext:{buildId:u}},N=new k.NodeNextRequest(a),O=new k.NodeNextResponse(b),P=l.NextRequestAdapter.fromNodeNextRequest(N,(0,l.signalFromNodeResponse)(b));try{let d=async c=>A.handle(P,M).finally(()=>{if(!c)return;c.setAttributes({"http.status_code":b.statusCode,"next.rsc":!1});let d=K.getRootSpanAttributes();if(!d)return;if(d.get("next.span_type")!==m.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${d.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let e=d.get("next.route");if(e){let a=`${J} ${e}`;c.setAttributes({"next.route":e,"http.route":e,"next.span_name":a}),c.updateName(a)}else c.updateName(`${J} ${a.url}`)}),g=async g=>{var i,j;let k=async({previousCacheEntry:f})=>{try{if(!(0,h.getRequestMeta)(a,"minimalMode")&&B&&C&&!f)return b.statusCode=404,b.setHeader("x-nextjs-cache","REVALIDATED"),b.end("This page could not be found"),null;let e=await d(g);a.fetchMetrics=M.renderOpts.fetchMetrics;let i=M.renderOpts.pendingWaitUntil;i&&c.waitUntil&&(c.waitUntil(i),i=void 0);let j=M.renderOpts.collectedTags;if(!F)return await (0,o.I)(N,O,e,M.renderOpts.pendingWaitUntil),null;{let a=await e.blob(),b=(0,p.toNodeOutgoingHttpHeaders)(e.headers);j&&(b[r.NEXT_CACHE_TAGS_HEADER]=j),!b["content-type"]&&a.type&&(b["content-type"]=a.type);let c=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=r.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,d=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=r.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:t.CachedRouteKind.APP_ROUTE,status:e.status,body:Buffer.from(await a.arrayBuffer()),headers:b},cacheControl:{revalidate:c,expire:d}}}}catch(b){throw(null==f?void 0:f.isStale)&&await A.onRequestError(a,b,{routerKind:"App Router",routePath:e,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})},z),b}},l=await A.handleResponse({req:a,nextConfig:w,cacheKey:G,routeKind:f.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:y,isRoutePPREnabled:!1,isOnDemandRevalidate:B,revalidateOnlyGenerated:C,responseGenerator:k,waitUntil:c.waitUntil});if(!F)return null;if((null==l||null==(i=l.value)?void 0:i.kind)!==t.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==l||null==(j=l.value)?void 0:j.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});(0,h.getRequestMeta)(a,"minimalMode")||b.setHeader("x-nextjs-cache",B?"REVALIDATED":l.isMiss?"MISS":l.isStale?"STALE":"HIT"),x&&b.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let m=(0,p.fromNodeOutgoingHttpHeaders)(l.value.headers);return(0,h.getRequestMeta)(a,"minimalMode")&&F||m.delete(r.NEXT_CACHE_TAGS_HEADER),!l.cacheControl||b.getHeader("Cache-Control")||m.get("Cache-Control")||m.set("Cache-Control",(0,q.getCacheControlHeader)(l.cacheControl)),await (0,o.I)(N,O,new Response(l.value.body,{headers:m,status:l.value.status||200})),null};L?await g(L):await K.withPropagatedContext(a.headers,()=>K.trace(m.BaseServerSpan.handleRequest,{spanName:`${J} ${a.url}`,kind:i.SpanKind.SERVER,attributes:{"http.method":J,"http.target":a.url}},g))}catch(b){if(b instanceof s.NoFallbackError||await A.onRequestError(a,b,{routerKind:"App Router",routePath:E,routeType:"route",revalidateReason:(0,n.c)({isRevalidate:I,isOnDemandRevalidate:B})}),F)throw b;return await (0,o.I)(N,O,new Response(null,{status:500})),null}}},44870:a=>{"use strict";a.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},63033:a=>{"use strict";a.exports=require("next/dist/server/app-render/work-unit-async-storage.external.js")},78335:()=>{},86439:a=>{"use strict";a.exports=require("next/dist/shared/lib/no-fallback-error.external")},86548:(a,b,c)=>{"use strict";c.d(b,{getGroqClient:()=>f});var d=c(74637);let e=null;function f(){return e||(process.env.GROQ_API_KEY||console.warn("GROQ_API_KEY is not set. Groq moderation will fail."),e=new d.YH({apiKey:process.env.GROQ_API_KEY||"dummy"})),e}},96487:()=>{}};var b=require("../../../webpack-runtime.js");b.C(a);var c=b.X(0,[331,692,637],()=>b(b.s=42333));module.exports=c})();