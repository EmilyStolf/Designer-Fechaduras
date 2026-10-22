const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".txt": "text/plain; charset=utf-8"
};

function safePath(urlPath){
  const decoded = decodeURIComponent((urlPath || "/").split("?")[0]);
  const clean = decoded === "/" ? "/index.html" : decoded;
  const target = path.normalize(path.join(ROOT, clean));
  if (!target.startsWith(ROOT)) return null;
  return target;
}

const server = http.createServer((req,res)=>{
  const target = safePath(req.url);
  if(!target){ res.writeHead(403); return res.end("Forbidden"); }
  fs.stat(target,(err,st)=>{
    if(err || !st.isFile()){
      res.writeHead(404,{"Content-Type":"text/plain; charset=utf-8"});
      return res.end("Arquivo não encontrado");
    }
    const type = MIME[path.extname(target).toLowerCase()] || "application/octet-stream";
    res.writeHead(200,{"Content-Type":type,"Cache-Control":"no-cache"});
    fs.createReadStream(target).pipe(res);
  });
});

server.listen(PORT,"127.0.0.1",()=>{
  const url=`http://127.0.0.1:${PORT}`;
  console.log(`Designer Fechaduras aberto em ${url}`);
  if(process.platform === "win32") exec(`start "" "${url}"`);
});

process.on("SIGINT",()=>server.close(()=>process.exit(0)));
