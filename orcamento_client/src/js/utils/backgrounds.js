// Gradientes CSS como fundo da tela de login (sem dependencia de imagens externas).
const BACKGROUNDS = [
  'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
  'linear-gradient(135deg, #2e7d32 0%, #1b5e20 100%)',
  'linear-gradient(135deg, #283593 0%, #1a237e 100%)',
  'linear-gradient(135deg, #00695c 0%, #004d40 100%)',
];

/**
 * Pick a random login background (CSS gradient).
 * @returns {string}
 */
export function randomBackground() {
  return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
}
