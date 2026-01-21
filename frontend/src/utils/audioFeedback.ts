// Utilitat per generar sons sense fitxers MP3 (Web Audio API)

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

export const playSuccessSound = () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // So tipus "Moneda" o "Ding" (Ona Sinusoidal + Triangle)
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
  oscillator.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.1); // C6
  
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.5);
};

export const playErrorSound = () => {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  
  // So tipus "Buzz" o "Error" (Ona Dent de Serra)
  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); 
  oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.3);
  
  gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
  
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.3);
};