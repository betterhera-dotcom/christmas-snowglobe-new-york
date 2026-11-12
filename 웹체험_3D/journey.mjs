export const ENTRY_DURATION_MS=4800;
export const MIN_PLAY_SECONDS=3;
const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Fully cover every geometry/light switch; reveal the city once it is ready.
export const transitionVeil=t=>smooth(t,.12,.34)*(1-smooth(t,.67,.98));
