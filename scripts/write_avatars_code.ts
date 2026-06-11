import fs from 'fs';
const data = fs.readFileSync('avatars.json', 'utf8');
const avatars = JSON.parse(data);

const tsContent = `// Pre-generated static SVG avatars
export const defaultAvatars = [
  { name: 'Felix', url: '${avatars.Felix}' },
  { name: 'Aneka', url: '${avatars.Aneka}' },
  { name: 'Oliver', url: '${avatars.Oliver}' },
  { name: 'Jude', url: '${avatars.Jude}' },
  { name: 'Destiny', url: '${avatars.Destiny}' },
];
`;

fs.writeFileSync('lib/avatars.ts', tsContent);
console.log("Wrote lib/avatars.ts");
