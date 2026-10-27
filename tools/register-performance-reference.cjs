// Replay preserved original modules at their original URLs for Node checks.
const {registerHooks}=require('node:module'),fs=require('node:fs'),path=require('node:path'),{fileURLToPath}=require('node:url');
const sourceRoot=path.resolve('src')+path.sep;
registerHooks({load(url,context,nextLoad){
 if(url.startsWith('file:')){
  const file=fileURLToPath(url),original=path.resolve('docs/performance/original-src',path.basename(file));
  if(file.startsWith(sourceRoot)&&fs.existsSync(original))return {format:'module',source:fs.readFileSync(original,'utf8'),shortCircuit:true};
 }
 return nextLoad(url,context);
}});
