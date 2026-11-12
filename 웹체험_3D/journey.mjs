export const CITY_TITLE_MS=5000;
export const WISH_DURATION_MS=6500;
export const WISH_FADE_MS=5000;
export const ENTRY_DURATION_MS=4000;
export const MIN_PLAY_SECONDS=9;
const smooth=(x,a,b)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
// Fully cover every geometry/light switch; reveal the city once it is ready.
export const transitionVeil=t=>smooth(t,.12,.34)*(1-smooth(t,.67,.98));

export const citySnowReady=(now,arrivedAt)=>arrivedAt>0&&now-arrivedAt>=CITY_TITLE_MS;
