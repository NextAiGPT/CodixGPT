// Set this to your deployed Render URL, for example:
// const API = "https://codixgpt-api.onrender.com";
const API = window.CODIXGPT_API || "http://localhost:10000";

async function request(path, options={}) {
  const r = await fetch(API + path, {headers: {"Content-Type":"application/json"}, ...options});
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Request failed");
  return data;
}
function show(id, value){ document.getElementById(id).textContent = value; }

async function minify(type){
  const code = document.getElementById(type + "Input").value;
  try { const d = await request(`/api/minify/${type}`, {method:"POST",body:JSON.stringify({code})}); show(type+"Output",d.result); }
  catch(e){ show(type+"Output","Error: "+e.message); }
}
async function generatePassword(){ try{show("passwordOutput",(await request("/api/password")).password)}catch(e){show("passwordOutput",e.message)} }
async function searchRepos(){
  const q=document.getElementById("repoQuery").value.trim(); const out=document.getElementById("repoOutput");
  if(!q)return;
  try{
    const d=await request("/api/github/search?q="+encodeURIComponent(q));
    out.innerHTML=d.results.map(r=>`<div class="repo"><a href="${r.url}" target="_blank" rel="noreferrer">${escapeHtml(r.name)}</a><p>${escapeHtml(r.description)}</p><small>★ ${r.stars} · ${escapeHtml(r.language)}</small></div>`).join("") || "No repositories found.";
  }catch(e){out.textContent="Error: "+e.message}
}
async function loadPrototype(){try{show("prototypeOutput",(await request("/api/html/prototype")).html)}catch(e){show("prototypeOutput",e.message)}}
async function loadList(path,id){
  try{
    const d=await request(path), items=d.tags;
    document.getElementById(id).innerHTML=items.map(x=>`<div><code>${escapeHtml(x.tag)}</code><br><small>${escapeHtml(x.description)}</small></div>`).join("");
  }catch(e){document.getElementById(id).textContent=e.message}
}
function getImageData(){
  const f=document.getElementById("imageInput").files[0];
  if(!f) throw new Error("Please select an image first.");
  return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({data:r.result,mime:f.type});r.onerror=reject;r.readAsDataURL(f)});
}
async function imageBase64(){try{const x=await getImageData();const d=await request("/api/image/base64",{method:"POST",body:JSON.stringify(x)});show("imageOutput",d.result)}catch(e){show("imageOutput","Error: "+e.message)}}
async function imageColors(){try{const x=await getImageData();const d=await request("/api/image/colors",{method:"POST",body:JSON.stringify({data:x.data})});show("imageOutput",d.colors.join("\n"))}catch(e){show("imageOutput","Error: "+e.message)}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
