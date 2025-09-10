// src/AudioWaterShader.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import LightBlocksBackground from "./LightBlockBackground";
import Aurora from "./aurora";

export default function AudioWaterShader() {
  const containerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio('/song.mp3');
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => {
      setCurrentTime(audio.currentTime || 0);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      try { audio.pause(); audio.src = ""; } catch (e) { }
    };
  }, []);



  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const playingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [progress, setProgress] = useState(0);

  // format time helper
  const formatTime = (sec) => {
    if (!sec || isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // ---------- AUDIO: setup listeners for UI (timeupdate / loadedmetadata)
  useEffect(() => {
    const audio = audioRef.current;
    audio.crossOrigin = "anonymous";
    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => {
      setCurrentTime(audio.currentTime || 0);
      setProgress(
        audio.duration ? (audio.currentTime / audio.duration) * 100 : 0
      );
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      try {
        audio.pause();
        audio.src = "";
      } catch (e) { }
    };
  }, []);

  // Play/pause (React handler)
  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!playingRef.current) {
      // initialize audio analysis on first play
      if (!audioCtxRef.current) {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          await ctx.resume();
          audioCtxRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.8;
          analyserRef.current = analyser;
          dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
          sourceNodeRef.current = ctx.createMediaElementSource(audio);
          sourceNodeRef.current.connect(analyser);
          analyser.connect(ctx.destination);
        } catch (e) {
          console.warn("AudioContext init failed:", e);
        }
      }

      try {
        await audio.play();
        playingRef.current = true;
        setIsPlaying(true);
      } catch (e) {
        console.warn("Audio play failed:", e);
      }
    } else {
      audio.pause();
      playingRef.current = false;
      setIsPlaying(false);
    }
  };

  // Seek handler (click on progress bar)
  const progressBarRef = useRef(null);
  const isDraggingRef = useRef(false);

  const updateSeek = (clientX) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct * 100);
    setCurrentTime(audio.currentTime);
  };

  const startDrag = (e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    updateSeek(clientX);

    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", onDrag, { passive: false });
    window.addEventListener("touchend", stopDrag);
  };

  const onDrag = (e) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    updateSeek(clientX);
  };

  const stopDrag = (e) => {
    isDraggingRef.current = false;
    window.removeEventListener("mousemove", onDrag);
    window.removeEventListener("mouseup", stopDrag);
    window.removeEventListener("touchmove", onDrag);
    window.removeEventListener("touchend", stopDrag);
  };


  // ---------- THREE.JS effect (canvas, shader, simulation)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear existing children (solves the double-canvas / HMR problem)
    while (container.firstChild) container.removeChild(container.firstChild);

    // scene + full-screen quad uses orthographic camera (plane shader)
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0); // remove black background
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    container.appendChild(renderer.domElement);


    // Put canvas sizing logic in one place
    function setSizeToContainer() {
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      if (material && material.uniforms && material.uniforms.u_resolution) {
        material.uniforms.u_resolution.value.set(width, height);
      }
    }

    // --- Water buffers (same idea as your port) ---
    const resolution = 256;
    const waterBuffers = {
      current: new Float32Array(resolution * resolution),
      previous: new Float32Array(resolution * resolution),
      velocity: new Float32Array(resolution * resolution * 2),
      vorticity: new Float32Array(resolution * resolution)
    };

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

    // --- shaders (kept similar to yours) ---
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
        gl_FragColor = vec4(finalColor, o.a);
      }
    `;

    // --- material & geometry
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0.0 },
        u_resolution: {
          value: new THREE.Vector2(
            container.clientWidth || window.innerWidth,
            container.clientHeight || window.innerHeight
          )
        },
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

    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    // size initially
    setSizeToContainer();

    // ----- simulation & ripple functions
    function updateWaterSimulation() {
      const { current, previous } = waterBuffers;
      const damping = 0.913;
      const densityDissipation = 1.0;

      for (let y = 1; y < resolution - 1; y++) {
        for (let x = 1; x < resolution - 1; x++) {
          const i = y * resolution + x;
          const top = previous[i - resolution];
          const bottom = previous[i + resolution];
          const left = previous[i - 1];
          const right = previous[i + 1];
          let v = (top + bottom + left + right) / 2 - current[i];
          v = v * damping + previous[i] * (1 - damping);
          current[i] = Math.max(-2.0, Math.min(2.0, v * (1 - densityDissipation * 0.01)));
        }
      }

      // zero boundary
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

      waterTexture.image.data = waterBuffers.current;
      waterTexture.needsUpdate = true;
    }

    function addRipple(clientX, clientY, strength = 1.0) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const nx = x / rect.width;
      const ny = 1.0 - y / rect.height;
      const tx = Math.floor(nx * resolution);
      const ty = Math.floor(ny * resolution);
      const radius = Math.max(1, Math.floor(8));
      const r2 = radius * radius;

      for (let i = -radius; i <= radius; i++) {
        for (let j = -radius; j <= radius; j++) {
          const dsq = i * i + j * j;
          if (dsq <= r2) {
            const px = tx + i;
            const py = ty + j;
            if (px >= 0 && px < resolution && py >= 0 && py < resolution) {
              const idx = py * resolution + px;
              const dist = Math.sqrt(dsq);
              const falloff = 1 - dist / radius;
              const val = Math.cos((dist / radius) * Math.PI * 0.5) * strength * falloff;
              waterBuffers.previous[idx] += val;
            }
          }
        }
      }

      // ripple uniform for shader rings
      const clickX = x / rect.width;
      const clickY = 1.0 - y / rect.height;
      material.uniforms.u_ripple_position.value.set(clickX, clickY);
      material.uniforms.u_ripple_time.value = clock.getElapsedTime();
    }

    // pointer handlers on renderer.domElement (canvas)
    let last = { x: 0, y: 0 };
    let throttle = 0;
    function onPointerMove(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();
      if (!last.x && !last.y) last = { x, y };
      if (now - throttle < 8) return;
      throttle = now;
      const dx = x - last.x;
      const dy = y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        const intensity = Math.min(dist / 20, 1.0) * Math.min(dist / 80, 2.0);
        addRipple(e.clientX, e.clientY, intensity);
        last.x = x;
        last.y = y;
      }
    }
    function onClick(e) {
      addRipple(e.clientX, e.clientY, 3.0);
    }
    function onTouchMove(e) {
      if (!e.touches || e.touches.length === 0) return;
      e.preventDefault();
      onPointerMove(e.touches[0]);
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

    // --- audio analyser update (reads analyserRef)
    function updateAudioAnalysis() {
      const analyser = analyserRef.current;
      const dataArray = dataArrayRef.current;
      if (!analyser || !dataArray || !playingRef.current) return;
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

    // ---- animation loop
    const clock = new THREE.Clock();
    let rafId = null;
    function animate() {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      if (material && material.uniforms) material.uniforms.u_time.value = t;
      updateAudioAnalysis();
      updateWaterSimulation();
      renderer.render(scene, camera);
    }
    animate();

    // resize handling
    function handleResize() {
      setSizeToContainer();
    }
    window.addEventListener("resize", handleResize);

    // little initial splash
    setTimeout(() => {
      const rect = renderer.domElement.getBoundingClientRect();
      addRipple(rect.width / 2, rect.height / 2, 1.2);
    }, 300);

    // cleanup
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.domElement.removeEventListener("touchmove", onTouchMove);
      renderer.domElement.removeEventListener("touchstart", onTouchStart);

      try {
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      } catch (e) { }
      try { geometry.dispose(); material.dispose(); waterTexture.dispose(); renderer.dispose(); } catch (e) { }

      // audio cleanup
      try {
        if (sourceNodeRef.current) sourceNodeRef.current.disconnect();
        if (analyserRef.current) analyserRef.current.disconnect();
        if (audioCtxRef.current) audioCtxRef.current.close();
      } catch (e) { }
    };
  }, []); // run once

  // ========== JSX (controls + container)
  // Change the container size here: style.width and style.height.
  // Example: full-screen canvas -> style={{ width: "100vw", height: "100vh" }}
  // Example: centered smaller -> width: "60vw", height: "60vh", margin: "auto"
  return (
    <div style={{ width: "100vw", height: "100vh", position: "fixed", inset: 0, margin: 0, padding: 0, overflow: "hidden", background: "transparent" }}>
      {/* Container: change its width/height to move/scale the shader */}
{/* 
      <Aurora
        colorStops={["#3A29FF", "#FF94B4", "#FF3232"]}
        blend={0.5}
        amplitude={1.0}
        speed={0.5}
      /> */}
      <div ref={containerRef} style={{ width: "60%", height: "60%", position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }} />

      <div className="w-full flex items-center gap-3 text-sm text-white/80 font-mono">
        <span>{formatTime(currentTime)}</span>
        <button onClick={togglePlay} className="px-3 py-1 border border-white/30 rounded hover:bg-white/10 transition text-white" > {isPlaying ? "⏸️" : "▶️"} </button>
        <div
          className="flex-1 h-1 bg-white/30 rounded-full relative cursor-pointer"
          ref={progressBarRef}
          onMouseDown={startDrag}
          onTouchStart={startDrag}
        >
          <div
            className="h-1 bg-white rounded-full"
            style={{ width: `${progress}%` }}
          />
          {/* draggable handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>

        <span>{formatTime(duration)}</span>
      </div>

    </div>
  );
}
