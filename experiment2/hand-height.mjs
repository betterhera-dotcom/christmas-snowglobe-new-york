// Height relative to the selected shoulders; independent of camera distance.
export function handLift(y,body){
 if(!body||!Number.isFinite(y)||!Number.isFinite(body.size)||body.size<=0)return 0;
 const shoulders=body.points?.[11]&&body.points?.[12]?(body.points[11].y+body.points[12].y)/2:body.y;
 return Math.max(0,Math.min(1.1,(shoulders+body.size*.8-y)/body.size*1.05));
}
