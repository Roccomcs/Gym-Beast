/** Paint fabric on the visible body; never paste a limb from another illustration. */
export function paintFittedBottom(target:Uint8ClampedArray, fabric:Uint8ClampedArray, upper:Uint8ClampedArray|null, primary:number[], secondary:number[], width:number){
 const output=new Uint8ClampedArray(target)
 const allowed=(i:number)=>i>=0&&i<target.length&&target[i+3]>=128&&fabric[i+3]>=64&&!(upper&&upper[i+3]>32)&&Math.max(target[i],target[i+1],target[i+2])>28
 let total=0,count=0
 for(let i=0;i<target.length;i+=4)if(allowed(i)){total+=.2126*target[i]+.7152*target[i+1]+.0722*target[i+2];count++}
 const average=total/Math.max(1,count)
 for(let i=0;i<target.length;i+=4){
  if(!allowed(i))continue
  const luminance=.2126*target[i]+.7152*target[i+1]+.0722*target[i+2]
  const color=fabric[i+1]>128?secondary:primary
  let shade=Math.max(.32,Math.min(1.35,(fabric[i]/127)*(.55+.45*luminance/Math.max(1,average))))
  const x=i/4%width
  const neighbors=[...(x>0?[i-4]:[]),...(x<width-1?[i+4]:[]),i-width*4,i+width*4]
  // A restrained seam follows the actual visible garment edge. The body's
  // existing outside contour and foreground shirt remain untouched.
  if(neighbors.some(j=>j>=0&&j<fabric.length&&fabric[j+3]<64&&target[j+3]>128))shade*=.72
  for(let channel=0;channel<3;channel++)output[i+channel]=shade<=1?color[channel]*shade:color[channel]+(255-color[channel])*(shade-1)*.44
 }
 return output
}

export function bodyBounds(pixels:Uint8ClampedArray,width:number){
 let left=width,top=width,right=0,bottom=0
 for(let i=0;i<pixels.length;i+=4)if(pixels[i+3]>=128){const x=i/4%width,y=Math.floor(i/4/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 return {left,top,right,bottom}
}
/** Match fabric proportions to this drawing before clipping to its own limbs. */
export function fitFabricMask(mask:Uint8ClampedArray,reference:Uint8ClampedArray,target:Uint8ClampedArray,width:number){
 const a=bodyBounds(reference,width),b=bodyBounds(target,width)
 const output=new Uint8ClampedArray(mask.length)
 const sx=(a.right-a.left)/Math.max(1,b.right-b.left),sy=(a.bottom-a.top)/Math.max(1,b.bottom-b.top)
 for(let y=0;y<width;y++)for(let x=0;x<width;x++){
  const sourceX=Math.round(a.left+(x-b.left)*sx),sourceY=Math.round(a.top+(y-b.top)*sy)
  if(sourceX<0||sourceX>=width||sourceY<0||sourceY>=width)continue
  const from=(sourceY*width+sourceX)*4,to=(y*width+x)*4
  for(let c=0;c<4;c++)output[to+c]=mask[from+c]
 }
 return output
}

/** Baby legs need a rounded hip and short cuff, not an adult rectangle. */
export function babyTrouserMask(mask:Uint8ClampedArray,width:number){
 const b=bodyBounds(mask,width),output=new Uint8ClampedArray(mask.length)
 for(let y=b.top;y<width;y++)for(let x=b.left;x<=b.right;x++){
  const sourceY=Math.floor(b.top+(y-b.top)/1.18)
  if(sourceY>b.bottom)continue
  const from=(sourceY*width+x)*4,to=(y*width+x)*4
  for(let c=0;c<4;c++)output[to+c]=mask[from+c]
 }
 return output
}
