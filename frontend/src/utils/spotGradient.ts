const CARD_GRADIENTS = [
  'linear-gradient(135deg, #0a5a7a 0%, #2090c0 100%)',
  'linear-gradient(135deg, #1a4a20 0%, #3a9050 100%)',
  'linear-gradient(135deg, #6a3000 0%, #c06020 100%)',
  'linear-gradient(135deg, #2c1a8a 0%, #6040df 100%)',
  'linear-gradient(135deg, #6a1a1a 0%, #c04040 100%)',
  'linear-gradient(135deg, #1a3a8a 0%, #4070c8 100%)',
  'linear-gradient(135deg, #3a1a6a 0%, #8050b0 100%)',
  'linear-gradient(135deg, #0a4a4a 0%, #2a9090 100%)',
];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getSpotGradient(id: string): string {
  return CARD_GRADIENTS[hashId(id) % CARD_GRADIENTS.length];
}
