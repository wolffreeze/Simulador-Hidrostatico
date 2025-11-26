(function(){
  // DOM y variables de inicialización (sin cambios)
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');
  const rhoIn = document.getElementById('rho');
  const gIn = document.getElementById('g');
  const hIn = document.getElementById('h');
  const areaIn = document.getElementById('area');
  const stepsIn = document.getElementById('steps');
  const btnUpdate = document.getElementById('btnUpdate');
  const btnDownload = document.getElementById('btnDownload');
  const btnCopy = document.getElementById('btnCopy');
  const resP = document.getElementById('resP');
  const resF = document.getElementById('resF');
  const resHc = document.getElementById('resHc');
  const resParams = document.getElementById('resParams');
  const interpretation = document.getElementById('interpretation');
  const DPR = window.devicePixelRatio || 1;

  function resizeCanvas(){
    const rect = canvas.getBoundingClientRect();
    // Aseguramos que el Canvas tenga un ancho mínimo para las visualizaciones
    canvas.width = Math.max(800, rect.width * DPR); 
    canvas.height = Math.max(300, rect.height * DPR);
    draw();
  }

  window.addEventListener('resize', resizeCanvas);
  setTimeout(resizeCanvas,60);

  function formatNumber(x, unit){
    if(Math.abs(x) >= 1000){
      // Usamos 'k' para kilo (kPa, kN)
      return (x/1000).toFixed(2) + ' k' + (unit||''); 
    }
    return (Math.round(x*100)/100) + ' ' + (unit||'');
  }

  function draw(){
    // read inputs
    const rho = parseFloat(rhoIn.value) || 0;
    const g = parseFloat(gIn.value) || 9.81;
    const h = parseFloat(hIn.value) || 0;
    const A = parseFloat(areaIn.value) || 0;
    const steps = parseInt(stepsIn.value) || 30;

    const P0 = 101325;
    const pressureAt = (depth)=> P0 + rho * g * depth;

    // derived
    const hc = h/2; // centroid depth (yc)
    const F = rho * g * hc * A;
    const Pbase = pressureAt(h);
    
    // *** CÁLCULO DEL CENTRO DE PRESIÓN (yp) ***
    let yp = hc; 
    if (h > 0 && A > 0 && hc > 0) { // Añadir chequeo hc > 0 para evitar división por cero si h=0
        const I_xx_c = (A * Math.pow(h, 2)) / 12;
        yp = hc + I_xx_c / (hc * A);
    }

    // results UI
    resP.textContent = formatNumber(Math.round(Pbase), 'Pa');
    resF.textContent = formatNumber(Math.round(F), 'N');
    resHc.textContent = formatNumber(yp, 'm'); 
    resParams.textContent = `ρ=${rho} kg/m³ · g=${g} m/s² · h=${h} m · A=${A} m²`;

    interpretation.textContent = `La presión en la base es ${Math.round(Pbase)} Pa. La fuerza total resultante sobre la superficie es ${Math.round(F)} N, aplicada en el Centro de Presión (y_p) a ${formatNumber(yp)} m.`;

    // drawing area
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0,0,W,H);

    // visual layout
    const pad = 32 * DPR;
    const fluidLeft = pad;
    const fluidTop = pad;
    const fluidWidth = Math.round(W * 0.40); // Reducir un poco el fluido para más espacio
    const fluidHeight = Math.round(H - pad*2);
    
    // --- NUEVO CÁLCULO DEL ESPACIO DE PRESIÓN ---
    // Usamos la regla de la tipografía para determinar el espacio horizontal necesario.
    ctx.font = `${12 * DPR}px sans-serif`;
    
    // Calculamos el ancho del texto de presión MÁS GRANDE (máximo a Pbase)
    const maxPText = `${Math.round(Pbase)} Pa`;
    const maxPWidth = ctx.measureText(maxPText).width; 
    
    // Máximo ancho de la barra (constante)
    const maxBarWidth = 100 * DPR; 
    
    // Margen para las barras: 10 * DPR (entre fluido y barra) + maxBarWidth (ancho barra) + 16 * DPR (margen hasta texto)
    const barMargin = 10 * DPR + maxBarWidth; 
    
    // Ancho total de la visualización de presión (barra + texto Pa + margen final)
    const pressureVisWidth = barMargin + maxPWidth + 20 * DPR; // 20 DPR: margen extra
    
    // POSICIÓN X DE LA PARED: fluidEnd + pressureVisWidth
    const wallX = fluidLeft + fluidWidth + pressureVisWidth;
    const wallW = 30 * DPR; // Ancho de pared fijo y delgado
    // ---------------------------------------------
    

    // background
    // gradient for fluid
    const grad = ctx.createLinearGradient(0, fluidTop, 0, fluidTop + fluidHeight);
    grad.addColorStop(0, '#bfe8ff');
    grad.addColorStop(1, '#1e90ff');
    ctx.fillStyle = grad;
    ctx.fillRect(fluidLeft, fluidTop, fluidWidth, fluidHeight);

    // subtle overlay grid
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    const lines = Math.min(80, Math.max(10, steps));
    for(let i=0;i<lines;i++){
      const y = fluidTop + (i/lines) * fluidHeight;
      ctx.fillRect(fluidLeft, y, fluidWidth, 1); // thin line
    }

    // pressure bars to the right of fluid
    ctx.textBaseline = 'middle';
    for(let i=0;i<=steps;i++){
      const frac = i/steps;
      const y = fluidTop + frac * fluidHeight;
      const depth = frac * h;
      const P = pressureAt(depth);
      const rel = (P - P0) / (rho * g * h || 1); // normalize 0..1
      const barW = Math.max(4 * DPR, rel * maxBarWidth);

      // bar shadow
      // Posición X de la barra: fluidLeft + fluidWidth + 10 * DPR
      const barX = fluidLeft + fluidWidth + 10 * DPR;
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(barX, y-4*DPR, barW, 8*DPR);

      if(i % Math.ceil(steps / 6) === 0){
        ctx.fillStyle = '#032';
        ctx.font = `${12 * DPR}px sans-serif`;
        
        // Texto de Profundidad (m)
        ctx.fillText(`${depth.toFixed(2)} m`, barX + barW + 6 * DPR, y); 
        
        // Texto de Presión (Pa)
        // Posición X: barX + barW + 6 * DPR (Texto anterior) + 40 * DPR (Desplazamiento manual)
        // Mejor usar el ancho total de la visualización
        ctx.fillText(`${Math.round(P)} Pa`, wallX - wallW - maxPWidth - 10 * DPR, y);
      }
    }

    // wall
    ctx.fillStyle = '#eee';
    ctx.fillRect(wallX, fluidTop, wallW, fluidHeight);
    ctx.strokeStyle = '#cfcfcf';
    ctx.strokeRect(wallX, fluidTop, wallW, fluidHeight);

    // center of pressure (yp)
    const yHp = fluidTop + (yp / (h || 1)) * fluidHeight; 
    // vector of force
    const maxVis = 220 * DPR;
    // La escala visual de la fuerza debe ser constante para que la longitud sea comparable
    const forceScale = Math.min(maxVis, (F / 100000) * 100 * DPR); // Escala F/100kN

    // arrow
    ctx.strokeStyle = '#ff4500';
    ctx.lineWidth = 3 * DPR;
    ctx.beginPath();
    // La flecha empieza en la pared y va a la derecha
    ctx.moveTo(wallX + wallW, yHp);
    ctx.lineTo(wallX + wallW + forceScale, yHp);
    ctx.stroke();

    // arrow head
    ctx.fillStyle = '#ff4500';
    ctx.beginPath();
    ctx.moveTo(wallX + wallW + forceScale, yHp);
    ctx.lineTo(wallX + wallW + forceScale - 8*DPR, yHp - 6*DPR);
    ctx.lineTo(wallX + wallW + forceScale - 8*DPR, yHp + 6*DPR);
    ctx.closePath();
    ctx.fill();

    // label (Ajustamos la posición X para que esté a la derecha de la flecha)
    ctx.fillStyle = '#031d3a';
    ctx.font = `${13 * DPR}px sans-serif`;
    ctx.fillText(`F = ${formatNumber(Math.round(F), 'N')}`, wallX + wallW + forceScale + 6 * DPR, yHp - 10 * DPR);

    // titles (sin cambios)
    ctx.fillStyle = '#032';
    ctx.font = `${14 * DPR}px sans-serif`;
    ctx.fillText(`h = ${h} m`, fluidLeft, fluidTop - 12 * DPR);
    ctx.fillText(`ρ = ${rho} kg/m³`, fluidLeft + 120 * DPR, fluidTop - 12 * DPR);
  }

  // events (sin cambios)
  btnUpdate.addEventListener('click', draw);
  btnCopy.addEventListener('click', ()=>{
    const params = `rho=${rhoIn.value}, g=${gIn.value}, h=${hIn.value}, A=${areaIn.value}`;
    navigator.clipboard.writeText(params).then(()=> {
      btnCopy.textContent = 'Copiado ✓';
      setTimeout(()=> btnCopy.textContent = 'Copiar parámetros', 1200);
    });
  });

  btnDownload.addEventListener('click', ()=>{
    const data = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = data;
    a.download = 'simulator_hydrostatic.png';
    a.click();
  });

  // draw initially and whenever inputs change (with small debounce)
  let t;
  const inputs = [rhoIn,gIn,hIn,areaIn,stepsIn];
  inputs.forEach(inp => inp.addEventListener('input', ()=>{
    clearTimeout(t);
    t = setTimeout(draw, 150);
  }));

  // initial draw
  draw();
})();
