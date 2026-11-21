// Metadata keeps its original PNG coordinates; the lossless rendition has identical pixels.
export function artSource(path:string){
  return path.startsWith('/pet-training/') || ['/exercise-poses/program-basics.png','/exercise-poses/french-press-lying.png'].includes(path)
    ? path.replace(/\.png$/,'.webp') : path
}
