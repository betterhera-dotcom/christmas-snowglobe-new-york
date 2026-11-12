// Align the photographed tabletop to the resting globe, without stretching it.
// The contact line is inside the marble top, above its front trim.
export function counterBackdrop(width, height, contactY) {
 const imageWidth=1280,imageHeight=724,anchor=.805;
 const y=Math.max(height*.05,Math.min(height*.95,contactY));
 const scale=Math.max(width/imageWidth,y/(imageHeight*anchor),(height-y)/(imageHeight*(1-anchor)));
 return {width:imageWidth*scale,height:imageHeight*scale,top:y-imageHeight*scale*anchor};
}
