importScripts('engine.js');
onmessage=async e=>{try{const buffer=await e.data.arrayBuffer();let text=new TextDecoder('utf-8',{fatal:true});try{text=text.decode(buffer);}catch(_){text=new TextDecoder('windows-1252').decode(buffer);}postMessage({ok:true,data:TelepEngine.analyze(text)});}catch(error){postMessage({ok:false,error:error.message});}};
