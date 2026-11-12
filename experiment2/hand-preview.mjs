import {HAND_HOLD_SECONDS,RESULT_MAX_AGE_MS} from './tracking-policy.mjs';
// Display-only evidence. Never authorizes input or changes the controlled hand.
export function getHandPreview(packet,audience,now){
 if(!packet||packet.kind!=='hand'||now<packet.timestamp||now-packet.timestamp>HAND_HOLD_SECONDS*1000)return null;
 const hands=packet.result.landmarks||[];
 const index=audience.handIndex(hands,now/1000,{remember:false}),hand=hands[index];
 if(!hand||hand.length!==21||hand.some(p=>!p||!Number.isFinite(p.x+p.y)))return null;
 return {hand,timestamp:packet.timestamp,delayed:packet.stale||now-packet.timestamp>RESULT_MAX_AGE_MS.hand};
}
