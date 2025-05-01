import { namedColors, predefinedGradients } from './colorData.js';

document.addEventListener("DOMContentLoaded", () => {
  const editor   = document.querySelector(".palette-editor");
  const preview  = document.querySelector(".palette-preview");
  const gradient = document.querySelector(".gradient-preview");
  const themeToggle = document.getElementById("toggleTheme");

  const state = { colors: [], angle: 90 };

  function hexToRgb(hex) {
    const bigint = parseInt(hex.replace("#", ""), 16);
    return { r: (bigint>>16)&255, g: (bigint>>8)&255, b: bigint&255 };
  }

  function rgbToHsv(r,g,b){
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
    let h=0,s=max?d/max:0,v=max;
    if(max!==min){
      switch(max){
        case r: h=(g-b)/d+(g<b?6:0); break;
        case g: h=(b-r)/d+2; break;
        case b: h=(r-g)/d+4; break;
      }
      h/=6;
    }
    return { h:Math.round(h*360), s:Math.round(s*100), v:Math.round(v*100) };
  }

  function rgbToCmyk(r,g,b){
    const c=1-r/255, m=1-g/255, y=1-b/255, k=Math.min(c,m,y);
    if(k===1) return {c:0,m:0,y:0,k:100};
    return {
      c: Math.round((c-k)/(1-k)*100),
      m: Math.round((m-k)/(1-k)*100),
      y: Math.round((y-k)/(1-k)*100),
      k: Math.round(k*100)
    };
  }

  function parseHex8(hex){
    const h=hex.replace("#",""),
          r=parseInt(h.slice(0,2),16),
          g=parseInt(h.slice(2,4),16),
          b=parseInt(h.slice(4,6),16),
          a=h.length===8?parseInt(h.slice(6,8),16)/255:1;
    return {r,g,b,a};
  }

  function renderEditor(){
    editor.innerHTML = `
      <h2>Редактор палитры</h2>
      <div class="color-controls">
        <input type="color" id="colorPicker">
        <button id="addColor">Добавить</button>
        <input type="number" id="angleInput" value="${state.angle}" min="0" max="360">°
      </div>`;
    document.getElementById("addColor").onclick = () => addColor(document.getElementById("colorPicker").value);
    document.getElementById("angleInput").oninput = e=>{ state.angle=+e.target.value; renderGradient(); };
  }

  function renderPreview(){
    preview.innerHTML = `
      <div class="preview-header">
        <h2>Палитра</h2>
         <button id="clearAllPreview" class="clear-btn small" title="Очистить палитру">
           <img src="IMG/Cleaning of equipped paints.png" alt="Очистить палитру" width="24" height="24" class="icon-btn">
         </button>
      </div>
      <div class="color-list">
        ${state.colors.map((hex,i)=>{
          const {r,g,b}=hexToRgb(hex),hsv=rgbToHsv(r,g,b),cmyk=rgbToCmyk(r,g,b);
          return `
            <div class="color-entry">
              <div class="color-box" data-index="${i}" style="background:${hex}"></div>
              <div class="color-info">
                <div class="copy-row"><strong>${hex}</strong><button class="copy-btn" data-copy="${hex}">⧉</button></div>
                <div class="copy-row">RGB:${r},${g},${b}<button class="copy-btn" data-copy="${r},${g},${b}">⧉</button></div>
                <div class="copy-row">RGBA:${r},${g},${b},1<button class="copy-btn" data-copy="${r},${g},${b},1">⧉</button></div>
                <div class="copy-row">HSV:${hsv.h},${hsv.s}%,${hsv.v}%<button class="copy-btn" data-copy="${hsv.h},${hsv.s}%,${hsv.v}%">⧉</button></div>
                <div class="copy-row">CMYK:${cmyk.c}%,${cmyk.m}%,${cmyk.y}%,${cmyk.k}%<button class="copy-btn" data-copy="${cmyk.c}%,${cmyk.m}%,${cmyk.y}%,${cmyk.k}%">⧉</button></div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
    preview.querySelectorAll(".color-box").forEach(b=>b.onclick=()=>removeColor(+b.dataset.index));
    function fallbackCopy(text) {
      const temp = document.createElement("textarea");
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      try {
        document.execCommand("copy");
      } catch (err) {
        console.warn("Fallback copy failed", err);
      }
      document.body.removeChild(temp);
    }
    
    preview.querySelectorAll(".copy-btn").forEach(btn => {
      btn.onclick = () => {
        const text = btn.dataset.copy;
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text)
            .then(() => {
              btn.textContent = "✓";
              setTimeout(() => btn.textContent = "⧉", 500);
            })
            .catch(err => {
              console.warn("Clipboard error:", err);
              fallbackCopy(text);
              btn.textContent = "✓";
              setTimeout(() => btn.textContent = "⧉", 500);
            });
        } else {
          fallbackCopy(text);
          btn.textContent = "✓";
          setTimeout(() => btn.textContent = "⧉", 500);
        }
      };
    });
        const clear=document.getElementById("clearAllPreview");
    if(clear) clear.onclick=()=>{state.colors=[]; renderAll();};
  }

  function renderGradient(){
    gradient.innerHTML = `
      <h2>Градиент / Рисовалка</h2>
      <div class="gradient-box"></div>
    `;
    const box = gradient.querySelector('.gradient-box');
    if (state.colors.length === 1) {
      const {r, g, b, a} = parseHex8(state.colors[0]);
      box.style.background = `radial-gradient(circle at center, rgba(${r},${g},${b},${a}) 0%, rgba(${r},${g},${b},0) 100%)`;
    } else {
      const cs = state.colors.join(', ');
      box.style.background = `linear-gradient(${state.angle}deg, ${cs})`;
    }

    const clearBtn = document.getElementById("clearCanvas");
    if (clearBtn) clearBtn.onclick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }

  function addColor(hex){ state.colors.push(hex); renderAll(); }
  function removeColor(i){ state.colors.splice(i,1); renderAll(); }
  function renderAll(){ renderPreview(); renderGradient(); }

  function renderColorList(){
    const c=document.getElementById('colorList'),q=document.getElementById('colorSearch').value.toLowerCase();
    c.innerHTML='';
    namedColors.forEach(({hex,name,en})=>{
      if(!q||hex.includes(q)||name.toLowerCase().includes(q)||en.toLowerCase().includes(q)){
        const d=document.createElement('div');
        d.className='color-item';
        d.style.background=hex;
        d.title=`${name} / ${en}`;
        d.innerHTML=`<span class='color-name'>${name}</span>`;
        d.onclick=()=>addColor(hex);
        c.appendChild(d);
      }
    });
  }

  function renderGradientList(){
    const c=document.getElementById('gradientList'),q=document.getElementById('gradientSearch').value.toLowerCase();
    c.innerHTML='';
    predefinedGradients.forEach(({colors,name,en})=>{
      const key=(name+' '+en).toLowerCase();
      if(!q||key.includes(q)){
        const d=document.createElement('div');
        d.className='gradient-item';
        d.style.background=`linear-gradient(90deg, ${colors.join(', ')})`;
        d.title=`${name} / ${en}`;
        d.innerHTML=`<span class='color-name'>${name}</span>`;
        d.onclick=()=>colors.forEach(col=>addColor(col));
        c.appendChild(d);
      }
    });
  }

  renderEditor(); renderAll(); renderColorList(); renderGradientList();
  document.getElementById('colorSearch').oninput=renderColorList;
  document.getElementById('gradientSearch').oninput=renderGradientList;
  themeToggle.onclick = () => {
    document.body.classList.toggle('dark');
    const themeIcon = document.getElementById('themeIcon');
    const isDark = document.body.classList.contains('dark');
    themeIcon.src = isDark ? 'IMG/A light theme.png' : 'IMG/Dark theme.png';
  };
  
  const drawArea=document.createElement('div');
  drawArea.id='drawArea';
  drawArea.style.cssText='width:100%;height:200px;border:1px solid var(--border);margin:24px 0;position:relative;';
  document.getElementById('app').appendChild(drawArea);

  const canvas=document.createElement('canvas');
  canvas.id='drawCanvas';
  drawArea.appendChild(canvas);
  const ctx=canvas.getContext('2d');

  let drawing=false,lastX=0,lastY=0;
  function resizeCanvas() {
    // Сохраняем текущее изображение
    const prevImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
    // Меняем размер
    canvas.width = drawArea.clientWidth;
    canvas.height = drawArea.clientHeight;
  
    // Восстанавливаем содержимое (если размер совпадает или просто обрезаем)
    ctx.putImageData(prevImage, 0, 0);
  }
  
  const resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(drawArea);
  resizeCanvas();
  
  window.addEventListener('resize',resizeCanvas);
  resizeCanvas();

  function makeBrushGradient(x, y) {
    const rad = state.angle * Math.PI / 180;
    const size = 30;
    const dx = Math.cos(rad) * size;
    const dy = Math.sin(rad) * size;
  
    const grad = ctx.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
    const n = state.colors.length;
    state.colors.forEach((col, i) => {
      grad.addColorStop(n > 1 ? i / (n - 1) : 0, col); // <--- вот здесь была ошибка раньше
    });
    return grad;
  }
  
  canvas.onmousedown = e => {
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
  };
  
  canvas.onmousemove = e => {
    if (!drawing) return;
    const x = e.offsetX, y = e.offsetY;
  
    ctx.fillStyle = makeBrushGradient(x, y);
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
  
    lastX = x;
    lastY = y;
  };
  
  ['mouseup', 'mouseout'].forEach(ev =>
    canvas.addEventListener(ev, () => drawing = false)
  );
});
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  lastX = touch.clientX - rect.left;
  lastY = touch.clientY - rect.top;
  drawing = true;
});

canvas.addEventListener('touchmove', e => {
  if (!drawing) return;
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  ctx.fillStyle = makeBrushGradient(x, y);
  ctx.beginPath();
  ctx.arc(x, y, 15, 0, Math.PI * 2);
  ctx.fill();

  lastX = x;
  lastY = y;
});

canvas.addEventListener('touchend', () => {
  drawing = false;
});
