// src/AudioWaterShader.jsx
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function AudioWaterShader() {
  const containerRef = useRef(null);
  const audioBtnRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- Renderer & scene (append ONLY to the container) ---
    const scene = new THREE.Scene();
    // full-screen quad uses an orthographic camera
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // ensure no second canvas by cleaning any existing children (helps HMR/dev)
    while (container.firstChild) container.removeChild(container.firstChild);

    // style canvas to fill the container
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none"; // better touch behavior
    container.appendChild(renderer.domElement);

    // Helper to size renderer to container
    

    // --- Audio setup ---
    let isPlaying = false;
    let audioContext = null;
    let analyser = null;
    let dataArray = null;
    let sourceNode = null;

    const audio = new Audio();
    audio.src = "https://assets.codepen.io/7558/xor-is-epic-1446.mp3";
    audio.preload = "auto";
    audio.volume = 1.0;
    audio.crossOrigin = "anonymous";
    audio.addEventListener("ended", () => {
      if (isPlaying) {
        audio.currentTime = 0;
        audio.play();
      }
    });
    audio.load();

    async function initAudioAnalysis() {
      if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        // resume ensures the context works after user gesture
        try { await audioContext.resume(); } catch (e) { /* ignore */ }
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        sourceNode = audioContext.createMediaElementSource(audio);
        sourceNode.connect(analyser);
        analyser.connect(audioContext.destination);
      }
    }

    // --- Water simulation buffers & settings (kept similar to your original) ---
    const waterSettings = {
      resolution: 256,
      rippleRadius: 8,
      spiralIntensity: 0.2,
      waveHeight: 0.01,
      motionDecay: 0.08,
      rippleDecay: 1.0
    };

    const resolution = waterSettings.resolution;
    const waterBuffers = {
      current: new Float32Array(resolution * resolution),
      previous: new Float32Array(resolution * resolution),
      velocity: new Float32Array(resolution * resolution * 2),
      vorticity: new Float32Array(resolution * resolution)
    };
    // zero initialize (already zero but explicit)
    for (let i = 0; i < resolution * resolution; i++) {
      waterBuffers.current[i] = 0;
      waterBuffers.previous[i] = 0;
      waterBuffers.vorticity[i] = 0;
      waterBuffers.velocity[i * 2] = 0;
      waterBuffers.velocity[i * 2 + 1] = 0;
    }

    // DataTexture (FloatType - common in modern browsers). Keep an eye if you need WebGL2.
    const waterTexture = new THREE.DataTexture(
      waterBuffers.current,
      resolution,
      resolution,
      THREE.RedFormat,
      THREE.FloatType
    );
    waterTexture.minFilter = THREE.LinearFilter;
    waterTexture.magFilter = THREE.LinearFilter;
    waterTexture.needsUpdate = true;

    // --- Shaders (kept from your version, trimmed text parts removed) ---
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec3 u_color1;
      uniform vec3 u_color2;
      uniform vec3 u_color3;
      uniform vec3 u_background;
      uniform float u_speed;
      uniform sampler2D u_waterTexture;
      uniform float u_waterStrength;
      uniform float u_ripple_time;
      uniform vec2 u_ripple_position;
      uniform float u_ripple_strength;
      uniform float u_audioLow;
      uniform float u_audioMid;
      uniform float u_audioHigh;
      uniform float u_audioOverall;
      uniform float u_audioReactivity;
      varying vec2 vUv;

      void main() {
        vec2 r = u_resolution;
        vec2 FC = gl_FragCoord.xy;
        vec2 screenP = (FC.xy * 2.0 - r) / r.y;
        vec2 wCoord = vec2(FC.x / r.x, FC.y / r.y);
        float waterHeight = texture2D(u_waterTexture, wCoord).r;
        float waterInfluence = clamp(waterHeight * u_waterStrength, -0.5, 0.5);
        float baseRadius = 0.9;
        float audioPulse = u_audioOverall * u_audioReactivity * 0.1;
        float circleRadius = baseRadius + audioPulse + waterInfluence * 0.3;
        float distFromCenter = length(screenP);
        float inCircle = smoothstep(circleRadius + 0.1, circleRadius - 0.1, distFromCenter);
        vec4 o = vec4(0.0);
        if (inCircle > 0.0) {
          vec2 p = screenP * 1.1;
          float rippleTime = u_time - u_ripple_time;
          vec2 ripplePos = u_ripple_position * r;
          float rippleDist = distance(FC.xy, ripplePos);
          float clickRipple = 0.0;
          if (rippleTime < 3.0 && rippleTime > 0.0) {
            float rippleRadius = rippleTime * 150.0;
            float rippleWidth = 30.0;
            float rippleDecay = 1.0 - rippleTime / 3.0;
            clickRipple = exp(-abs(rippleDist - rippleRadius) / rippleWidth) * rippleDecay * u_ripple_strength;
          }
          float totalWaterInfluence = clamp((waterInfluence + clickRipple * 0.1) * u_waterStrength, -0.8, 0.8);
          float audioInfluence = (u_audioLow * 0.3 + u_audioMid * 0.4 + u_audioHigh * 0.3) * u_audioReactivity;
          float angle = length(p) * 4.0 + audioInfluence * 2.0;
          mat2 R = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
          p *= R;
          float l = length(p) - 0.7 + totalWaterInfluence * 0.5 + audioInfluence * 0.2;
          float t = u_time * u_speed + totalWaterInfluence * 2.0 + audioInfluence * 1.5;
          float enhancedY = p.y + totalWaterInfluence * 0.3 + audioInfluence * 0.2;
          float pattern1 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(l + enhancedY * max(1.0, -l / 0.1) + t));
          float pattern2 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(l + enhancedY * max(1.0, -l / 0.1) + t + 1.0));
          float pattern3 = 0.5 + 0.5 * tanh(0.1 / max(l / 0.1, -l) - sin(l + enhancedY * max(1.0, -l / 0.1) + t + 2.0));
          float intensity = 1.0 + totalWaterInfluence * 0.5 + audioInfluence * 0.3;
          o.r = pattern1 * u_color1.r * intensity;
          o.g = pattern2 * u_color2.g * intensity;
          o.b = pattern3 * u_color3.b * intensity;
          o.a = inCircle;
        }
        vec3 finalColor = mix(u_background, o.rgb, o.a);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // --- Material & geometry ---
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_resolution: { value: new THREE.Vector2(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight) },
        u_speed: { value: 1.3 },
        u_color1: { value: new THREE.Vector3(1.0, 1.0, 1.0) },
        u_color2: { value: new THREE.Vector3(0.9, 0.95, 1.0) },
        u_color3: { value: new THREE.Vector3(0.8, 0.9, 1.0) },
        u_background: { value: new THREE.Vector3(0.02, 0.02, 0.05) },
        u_waterTexture: { value: waterTexture },
        u_waterStrength: { value: 0.55 },
        u_ripple_time: { value: -10.0 },
        u_ripple_position: { value: new THREE.Vector2(0.5, 0.5) },
        u_ripple_strength: { value: 0.5 },
        u_audioLow: { value: 0.0 },
        u_audioMid: { value: 0.0 },
        u_audioHigh: { value: 0.0 },
        u_audioOverall: { value: 0.0 },
        u_audioReactivity: { value: 1.0 }
      }
    });


    function setSizeToContainer() {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      if (material && material.uniforms && material.uniforms.u_resolution) {
        material.uniforms.u_resolution.value.set(width, height);
      }
    }
    setSizeToContainer();

    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    // --- Audio analysis update (update shader uniforms) ---
    function updateAudioAnalysis() {
      if (analyser && dataArray && isPlaying) {
        analyser.getByteFrequencyData(dataArray);
        const bassEnd = Math.floor(dataArray.length * 0.1);
        const midEnd = Math.floor(dataArray.length * 0.5);
        let bass = 0, mid = 0, treble = 0;
        for (let i = 0; i < bassEnd; i++) bass += dataArray[i];
        bass = (bass / Math.max(1, bassEnd) / 255);
        for (let i = bassEnd; i < midEnd; i++) mid += dataArray[i];
        mid = (mid / Math.max(1, midEnd - bassEnd) / 255);
        for (let i = midEnd; i < dataArray.length; i++) treble += dataArray[i];
        treble = (treble / Math.max(1, dataArray.length - midEnd) / 255);
        const overall = (bass + mid + treble) / 3;
        const smoothing = 0.8;
        material.uniforms.u_audioLow.value = material.uniforms.u_audioLow.value * smoothing + bass * (1 - smoothing);
        material.uniforms.u_audioMid.value = material.uniforms.u_audioMid.value * smoothing + mid * (1 - smoothing);
        material.uniforms.u_audioHigh.value = material.uniforms.u_audioHigh.value * smoothing + treble * (1 - smoothing);
        material.uniforms.u_audioOverall.value = material.uniforms.u_audioOverall.value * smoothing + overall * (1 - smoothing);
      }
    }

    // --- Water sim update (simplified but compatible with your code) ---
    function updateWaterSimulation() {
      const { current, previous, velocity, vorticity } = waterBuffers;
      const damping = 0.913;
      const densityDissipation = waterSettings.rippleDecay;
      // small simulation: dissipation on velocity
      for (let i = 0; i < velocity.length; i++) velocity[i] *= (1 - waterSettings.motionDecay);

      // laplacian-like update for height
      for (let y = 1; y < resolution - 1; y++) {
        for (let x = 1; x < resolution - 1; x++) {
          const idx = y * resolution + x;
          const top = previous[idx - resolution];
          const bottom = previous[idx + resolution];
          const left = previous[idx - 1];
          const right = previous[idx + 1];
          let val = (top + bottom + left + right) / 2 - current[idx];
          val = val * damping + previous[idx] * (1 - damping);
          // clamp
          current[idx] = Math.max(-2.0, Math.min(2.0, val * (1 - densityDissipation * 0.01)));
        }
      }

      // boundary zero
      for (let i = 0; i < resolution; i++) {
        current[i] = 0;
        current[(resolution - 1) * resolution + i] = 0;
        current[i * resolution] = 0;
        current[i * resolution + (resolution - 1)] = 0;
      }

      // swap buffers
      const tmp = waterBuffers.previous;
      waterBuffers.previous = waterBuffers.current;
      waterBuffers.current = tmp;
      // update texture
      waterTexture.image.data = waterBuffers.current;
      waterTexture.needsUpdate = true;
    }

    // --- Ripple injection (uses canvas rect so coordinates match) ---
    function addRipple(clientX, clientY, strength = 1.0) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const normalizedX = x / rect.width;
      const normalizedY = 1.0 - y / rect.height;
      const texX = Math.floor(normalizedX * resolution);
      const texY = Math.floor(normalizedY * resolution);
      const radius = Math.max(1, Math.floor(waterSettings.rippleRadius));
      const radiusSq = radius * radius;
      const rippleStrength = strength;
      for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
          const dsq = i * i + j * j;
          if (dsq <= radiusSq) {
            const px = texX + i;
            const py = texY + j;
            if (px >= 0 && px < resolution && py >= 0 && py < resolution) {
              const idx = py * resolution + px;
              const distance = Math.sqrt(dsq);
              const falloff = 1.0 - distance / radius;
              const value = Math.cos((distance / radius) * Math.PI * 0.5) * rippleStrength * falloff;
              waterBuffers.previous[idx] += value;
              const velIdx = idx * 2;
              const angle = Math.atan2(j, i);
              const vstrength = value * waterSettings.spiralIntensity;
              waterBuffers.velocity[velIdx] += Math.cos(angle) * vstrength;
              waterBuffers.velocity[velIdx + 1] += Math.sin(angle) * vstrength;
            }
          }
        }
      }
      // set ripple uniform for visual rings in shader
      const clickX = x / rect.width;
      const clickY = 1.0 - y / rect.height;
      material.uniforms.u_ripple_position.value.set(clickX, clickY);
      material.uniforms.u_ripple_time.value = clock.getElapsedTime();
    }

    // --- Pointer / touch handlers attached to canvas (not window) ---
    let lastPos = { x: 0, y: 0 };
    let lastThrottle = 0;
    function onPointerMove(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();
      if (!lastPos.x && !lastPos.y) { lastPos = { x, y }; }
      if (now - lastThrottle < 8) return;
      lastThrottle = now;
      const dx = x - lastPos.x, dy = y - lastPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const velocityInfluence = Math.min(dist / 80, 2.0);
        const intensity = Math.min(dist / 20, 1.0) * velocityInfluence;
        addRipple(e.clientX, e.clientY, intensity);
        lastPos.x = x; lastPos.y = y;
      }
    }

    function onClick(e) {
      addRipple(e.clientX, e.clientY, 3.0);
    }

    function onTouchMove(e) {
      if (!e.touches || e.touches.length === 0) return;
      e.preventDefault();
      const t = e.touches[0];
      onPointerMove(t);
    }
    function onTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return;
      e.preventDefault();
      const t = e.touches[0];
      addRipple(t.clientX, t.clientY, 3.0);
    }

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);
    renderer.domElement.addEventListener("touchmove", onTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchstart", onTouchStart, { passive: false });

    // --- Animation loop ---
    const clock = new THREE.Clock();
    let rafId = null;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      material.uniforms.u_time.value = t;
      updateAudioAnalysis();
      updateWaterSimulation();
      renderer.render(scene, camera);
    }
    animate();

    // --- Play/pause button ---
    function audioBtnHandler() {
      if (!isPlaying) {
        initAudioAnalysis().catch(() => {});
        audio.play().then(() => {
          isPlaying = true;
          if (audioBtnRef.current) audioBtnRef.current.textContent = "[ stop ]";
        }).catch((e) => {
          console.warn("Play failed:", e);
          if (audioBtnRef.current) audioBtnRef.current.textContent = "[ play (failed) ]";
        });
      } else {
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        if (audioBtnRef.current) audioBtnRef.current.textContent = "[ play ]";
      }
    }
    if (audioBtnRef.current) audioBtnRef.current.addEventListener("click", audioBtnHandler);

    // --- Resize handling (use container size) ---
    function handleResize() {
      setSizeToContainer();
    }
    window.addEventListener("resize", handleResize);

    // expose initial visuals
    material.uniforms.u_color1.value.set(1.0, 1.0, 1.0);
    material.uniforms.u_color2.value.set(0.9, 0.95, 1.0);
    material.uniforms.u_color3.value.set(0.8, 0.9, 1.0);
    material.uniforms.u_background.value.set(0.02, 0.02, 0.05);

    // initial splash ripple
    setTimeout(() => {
      const rect = renderer.domElement.getBoundingClientRect();
      addRipple(rect.width / 2, rect.height / 2, 1.3);
    }, 350);

    // --- Cleanup on unmount ---
    return () => {
      // stop animation
      if (rafId) cancelAnimationFrame(rafId);
      // remove listeners
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);
      if (audioBtnRef.current) audioBtnRef.current.removeEventListener("click", audioBtnHandler);
      // stop audio
      try { audio.pause(); audio.src = ""; } catch (e) {}
      // remove DOM
      try { if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement); } catch (e) {}
      // dispose resources
      try { geometry.dispose(); material.dispose(); waterTexture.dispose(); renderer.dispose(); } catch (e) {}
      // disconnect audio
      try { if (sourceNode) sourceNode.disconnect(); if (analyser) analyser.disconnect(); if (audioContext) audioContext.close(); } catch (e) {}
    };
  }, []); // run once

  // container is fixed to viewport so the canvas fills it
  return (
    <div style={{ width: "100vw", height: "100vh", position: "fixed", inset: 0, margin: 0, padding: 0, overflow: "hidden", background: "#000" }}>
      <div ref={containerRef} style={{ width: "50%", height: "50%" }} />
      <div style={{ position: "absolute", top: 12, left: 12, zIndex: 50 }}>
        <button ref={audioBtnRef} style={{ color: "#fff", background: "transparent", border: "1px solid rgba(255,255,255,0.15)", padding: "6px 8px", fontFamily: "monospace" }}>
          [ play ]
        </button>
      </div>
    </div>
  );
}
