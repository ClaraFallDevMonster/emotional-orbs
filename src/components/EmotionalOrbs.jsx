import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

const EmotionalFractals = () => {
  const canvasRef = useRef(null);
  const [currentState, setCurrentState] = useState('calm');
  const [intensity, setIntensity] = useState(0.5);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainNodeRef = useRef(null);
  const audioElementsRef = useRef({});

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const fractalRef = useRef(null);
  const particlesRef = useRef(null);
  const particleCountRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  const PARTICLE_SIZE_BASE = 0.022;
  const PARTICLE_SIZE_VAR = 0.020;
  const PARTICLE_OPACITY_BASE = 0.52;
  const PARTICLE_OPACITY_VAR = 0.22;

  const particleColors = {
    calm:    { a: new THREE.Color('#9fdcff'), b: new THREE.Color('#c4ffe7') },
    tension: { a: new THREE.Color('#ff6868'), b: new THREE.Color('#fff0e2') },
    clarity: { a: new THREE.Color('#ffffff'), b: new THREE.Color('#cbd7ff') },
    chaos:   { a: new THREE.Color('#ff6fff'), b: new THREE.Color('#ffdcfa') }
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const toRGB = (c) => `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;
  const toRGBA = (c, a=1) => `rgba(${toRGB(c)}, ${a})`;

  const emotionAudioFiles = {
    calm: null,
    tension: null,
    clarity: null,
    chaos: null,
  };

  const emotionSounds = {
    calm:    { frequency: 174, detune: 0,  filterFreq:  800, volume: 0.15 },
    tension: { frequency: 440, detune: 20, filterFreq: 2000, volume: 0.20 },
    clarity: { frequency: 528, detune: 0,  filterFreq: 4000, volume: 0.18 },
    chaos:   { frequency: 666, detune: 50, filterFreq: 1500, volume: 0.22 }
  };

  const initSound = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  const startSound = () => {
    const audioFile = emotionAudioFiles[currentState];
    if (audioFile) {
      Object.values(audioElementsRef.current).forEach(audio => {
        if (audio) { audio.pause(); audio.currentTime = 0; }
      });
      if (!audioElementsRef.current[currentState]) {
        const audio = new Audio(audioFile);
        audio.loop = true;
        audio.volume = 0;
        audioElementsRef.current[currentState] = audio;
      }
      const audio = audioElementsRef.current[currentState];
      audio.volume = 0;
      audio.play().catch(e => console.log('Audio play failed:', e));
      let vol = 0;
      const fadeIn = setInterval(() => {
        vol += 0.02;
        if (vol >= intensity * 0.5) {
          clearInterval(fadeIn);
          audio.volume = intensity * 0.5;
        } else {
          audio.volume = vol;
        }
      }, 50);
      return;
    }

    initSound();
    const ctx = audioContextRef.current;
    if (oscillatorRef.current) oscillatorRef.current.stop();
    const config = emotionSounds[currentState];
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);
    oscillator.detune.setValueAtTime(config.detune, ctx.currentTime);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(config.filterFreq, ctx.currentTime);
    filter.Q.setValueAtTime(1, ctx.currentTime);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(config.volume * intensity, ctx.currentTime + 0.5);
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.start();
    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
  };

  const stopSound = () => {
    Object.values(audioElementsRef.current).forEach(audio => {
      if (audio) {
        const fadeOut = () => {
          if (audio.volume > 0.02) {
            audio.volume -= 0.02;
            setTimeout(fadeOut, 50);
          } else {
            audio.pause();
            audio.currentTime = 0;
            audio.volume = 0;
          }
        };
        fadeOut();
      }
    });

    if (oscillatorRef.current && gainNodeRef.current) {
      const ctx = audioContextRef.current;
      gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      setTimeout(() => {
        if (oscillatorRef.current) {
          oscillatorRef.current.stop();
          oscillatorRef.current = null;
        }
      }, 300);
    }
  };

  const toggleSound = () => {
    if (soundEnabled) {
      stopSound();
      setSoundEnabled(false);
    } else {
      startSound();
      setSoundEnabled(true);
    }
  };

  useEffect(() => {
    if (soundEnabled) {
      stopSound();
      setTimeout(() => startSound(), 350);
    }
  }, [currentState]);

  useEffect(() => {
    if (soundEnabled && gainNodeRef.current && audioContextRef.current) {
      const config = emotionSounds[currentState];
      gainNodeRef.current.gain.linearRampToValueAtTime(
        config.volume * intensity,
        audioContextRef.current.currentTime + 0.1
      );
    }
    const audio = audioElementsRef.current[currentState];
    if (audio && soundEnabled) {
      audio.volume = intensity * 0.5;
    }
  }, [intensity, soundEnabled, currentState]);

  const emotionStates = {
    calm: {
      color: new THREE.Color(0.60, 0.80, 0.95), title: 'Calm', subtitle: 'breathe in serenity',
      speed: { min: 0.0004, max: 0.0010 }, complexity: { min: 3, max: 4 }, scale: { min: 0.9, max: 1.3 },
      particles: { min: 600, max: 1000 }, noiseScale: { min: 0.8, max: 1.0 }, noiseSpeed: { min: 0.2, max: 0.4 },
      sharpness: { min: 0.1, max: 0.2 }, waviness: { min: 2.0, max: 2.5 }, shaderIntensityMul: { min: 0.25, max: 0.35 },
      cpuDeformBase: { min: 0.05, max: 0.055 }, cpuDeformVar: { min: 0.04, max: 0.0 },
      noiseAmp:   { min: 0, max: 0 },
      ridge:      { min: 0.00, max: 0.15 },
      warp:       { min: 0.10, max: 0.25 },
      warpScale:  { min: 0.60, max: 1.00 },
      twistAmp:   { min: 0.02, max: 0.08 },
      twistFreq:  { min: 1.2,  max: 1.6 },
      pulseFreq:  { min: 0.6,  max: 1.0 },
      waveAmp:    { min: 0.02, max: 0.07 },
      waveFreq:   { min: 1.2,  max: 2.0 },
      shaderNoiseScale: { min: 1.0, max: 1.4 },
      shaderNoiseSpeed: { min: 0.3, max: 0.6 },
    },
    tension: {
      color: new THREE.Color(0.95, 0.30, 0.40), title: 'Tension', subtitle: 'energy compressed',
      speed: { min: 0.0012, max: 0.0025 }, complexity: { min: 2.5, max: 4.0 }, scale: { min: 1.1, max: 1.3 },
      particles: { min: 900, max: 1500 }, noiseScale: { min: 1.4, max: 3.5 }, noiseSpeed: { min: 1.0, max: 1.7 },
      sharpness: { min: 0.2, max: 0.4 }, waviness: { min: 0.7, max: 7.0 }, shaderIntensityMul: { min: 0.25, max: 0.35 },
      cpuDeformBase: { min: 0.2, max: 0.2 }, cpuDeformVar: { min: 0.1, max: 0.2 },
      noiseAmp:   { min: 0.02, max: 0.10 },
      ridge:      { min: 0.05, max: 0.1 },
      warp:       { min: 1.35, max: 7.0 },
      warpScale:  { min: 1.0,  max: 7.0 },
      twistAmp:   { min: 0.06, max: 0.14 },
      twistFreq:  { min: 2.0,  max: 3.2 },
      pulseFreq:  { min: 3.0,  max: 5.2 },
      waveAmp:    { min: 2.0, max: 3.0 },
      waveFreq:   { min: 2.0,  max: 3.2 },
      shaderNoiseScale: { min: 1.4, max: 2.0 },
      shaderNoiseSpeed: { min: 0.8, max: 1.5 },
    },
    clarity: {
      color: new THREE.Color(0.95, 0.95, 1.00), title: 'Clarity', subtitle: 'crystallized thought',
      speed: { min: 0.0006, max: 0.0010 }, complexity: { min: 3.5, max: 4.5 }, scale: { min: 0.65, max: 0.7 },
      particles: { min: 500, max: 900 }, noiseScale: { min: 4.8, max: 6.0 }, noiseSpeed: { min: 0.4, max: 0.7 },
      sharpness: { min: 2.0, max: 5.0 }, waviness: { min: 0.1, max: 0.2 }, shaderIntensityMul: { min: 0.25, max: 0.35 },
      cpuDeformBase: { min: 0.05, max: 0.1 }, cpuDeformVar: { min: 0.1, max: 0.1 },
      noiseAmp:   { min: 0.02, max: 0.07 },
      ridge:      { min: 2.0, max: 2.0 },
      warp:       { min: 0.05, max: 0.15 },
      warpScale:  { min: 1.4,  max: 2.2 },
      twistAmp:   { min: 0.02, max: 0.06 },
      twistFreq:  { min: 2.4,  max: 3.6 },
      pulseFreq:  { min: 0.8,  max: 1.4 },
      waveAmp:    { min: 0.02, max: 0.06 },
      waveFreq:   { min: 2.6,  max: 4.0 },
      shaderNoiseScale: { min: 1.8, max: 2.6 },
      shaderNoiseSpeed: { min: 0.5, max: 0.9 },
    },
    chaos: {
      color: new THREE.Color(0.80, 0.50, 0.90), title: 'Chaos', subtitle: 'beautiful disorder',
      speed: { min: 0.0020, max: 0.0027 }, complexity: { min: 2.0, max: 2.5 }, scale: { min: 1.0, max: 1.3 },
      particles: { min: 1600, max: 2400 }, noiseScale: { min: 2.0, max: 3.0 }, noiseSpeed: { min: 1.5, max: 1.8 },
      sharpness: { min: 0.4, max: 1.0}, waviness: { min: 5.0, max: 9.0 }, shaderIntensityMul: { min: 0.25, max: 0.35 },
      cpuDeformBase: { min: 0.02, max: 0.1 }, cpuDeformVar: { min: 0.1, max: 0.1 },
      noiseAmp:   { min: 0.20, max: 0.3 },
      ridge:      { min: 1.0, max: 2.0 },
      warp:       { min: 0.25, max: 1.0 },
      warpScale:  { min: 0.9,  max: 1.2 },
      twistAmp:   { min: 0.1, max: 1.0 },
      twistFreq:  { min: 2.6,  max: 3.2 },
      pulseFreq:  { min: 1.8,  max: 3.0 },
      waveAmp:    { min: 0.06, max: 0.16 },
      waveFreq:   { min: 1.0,  max: 1.2 },
      shaderNoiseScale: { min: 1.6, max: 2.0 },
      shaderNoiseSpeed: { min: 1.2, max: 2.0 },
    }
  };

  const getEffective = (stateKey, t) => {
    const s = emotionStates[stateKey];
    const eff = (key, round = false) => {
      const v = lerp(s[key].min, s[key].max, t);
      return round ? Math.round(v) : v;
    };
    return {
      color: s.color, title: s.title, subtitle: s.subtitle, speed: eff('speed'),
      complexity: clamp(Math.round(eff('complexity')), 1, 10), scale: eff('scale'),
      particles: eff('particles', true), noiseScale: eff('noiseScale'), noiseSpeed: eff('noiseSpeed'),
      sharpness: eff('sharpness'), waviness: eff('waviness'), shaderIntensityMul: eff('shaderIntensityMul'),
      cpuDeformBase: eff('cpuDeformBase'), cpuDeformVar: eff('cpuDeformVar'),
      noiseAmp: eff('noiseAmp'),
      ridge: eff('ridge'),
      warp: eff('warp'),
      warpScale: eff('warpScale'),
      twistAmp: eff('twistAmp'),
      twistFreq: eff('twistFreq'),
      pulseFreq: eff('pulseFreq'),
      waveAmp: eff('waveAmp'),
      waveFreq: eff('waveFreq'),
      shaderNoiseScale: eff('shaderNoiseScale'),
      shaderNoiseSpeed: eff('shaderNoiseSpeed'),
    };
  };

  const uiColor = useMemo(() => {
    const c = emotionStates[currentState].color.clone();
    return c;
  }, [currentState]);

  const soundButtonStyle = useMemo(() => {
    const rgb = toRGB(uiColor);
    return soundEnabled
      ? {
          background: `linear-gradient(135deg, rgba(${rgb}, 0.18), rgba(${rgb}, 0.35))`,
          border: `2px solid rgba(${rgb}, 0.55)`,
          boxShadow: `0 0 22px rgba(${rgb}, 0.55), inset 0 0 22px rgba(${rgb}, 0.18)`,
        }
      : {
          background: 'rgba(255, 255, 255, 0.08)',
          border: `2px solid rgba(${rgb}, 0.35)`,
          boxShadow: `0 4px 16px rgba(0,0,0,0.35)`,
        };
  }, [soundEnabled, uiColor]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    rendererRef.current = renderer;

    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;

      uniform float time;
      uniform float intensity;

      uniform float uNoiseAmp;
      uniform float uRidge;
      uniform float uWarp;
      uniform float uWarpScale;
      uniform float uTwistAmp;
      uniform float uTwistFreq;
      uniform float uPulseFreq;
      uniform float uWaveAmp;
      uniform float uWaveFreq;
      uniform float uNoiseScale;
      uniform float uNoiseSpeed;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
          i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3  ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      float fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 1.0;
        float frequency = 1.0;
        for(int i = 0; i < 5; i++) {
          value += amplitude * snoise(p * frequency);
          frequency *= 2.2;
          amplitude *= 0.45;
        }
        return value;
      }

      float ridged(vec3 p) {
        float v = 0.0;
        float a = 0.5;
        float f = 1.0;
        for (int i=0; i<5; i++) {
          float n = 1.0 - abs(snoise(p * f));
          n *= n;
          v += n * a;
          f *= 2.0;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vec3 pos = position;

        float t = time * uNoiseSpeed;
        float pulse = sin(time * uPulseFreq) * 0.5 + 0.5;

        vec3 base = normalize(normal) * uNoiseScale;

        vec3 warpVec = vec3(
          snoise(base + vec3(13.1, 0.0, 0.0) + t),
          snoise(base + vec3(0.0, 7.7, 0.0) + t*1.1),
          snoise(base + vec3(0.0, 0.0, 3.3) + t*0.9)
        );
        vec3 pw = base + uWarp * warpVec * uWarpScale;

        float nSoft = fbm(pw * 1.0);
        float nRidge = ridged(pw * 1.2);
        float nMix = mix(nSoft, nRidge, clamp(uRidge, 0.0, 1.0));

        float deform = uNoiseAmp * (nMix * (0.6 + 0.4 * pulse));
        pos += normal * deform * (1.0 + 0.5 * intensity);

        float w = sin(pos.x * uWaveFreq + time * 1.3) *
                  cos(pos.y * uWaveFreq * 0.9 + time * 1.1) *
                  sin(pos.z * uWaveFreq * 0.8 + time * 0.9);
        pos += normal * (uWaveAmp * w);

        float twist = sin(pos.y * uTwistFreq + time) * cos(pos.x * uTwistFreq - time) * uTwistAmp * (0.6 + 0.4 * intensity);
        vec3 twisted = vec3(
          pos.x + twist * normal.x,
          pos.y + twist * normal.y,
          pos.z + twist * normal.z
        );
        pos = mix(pos, twisted, 0.8);

        vNormal = normalize(normalMatrix * (normal + (deform + w) * 0.5));
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const fragmentShader = `
      precision highp float;
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform vec3 color;
      uniform float time;
      uniform float intensity;
      uniform float glowLimiter;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L1 = normalize(vec3(0.8, 0.9, 0.6));
        vec3 L2 = normalize(vec3(-0.6, 0.2, 0.7));
        vec3 L3 = normalize(vec3(0.0, -0.8, 0.5));

        float lambert = max(dot(N, L1), 0.0) * 0.5 +
                        max(dot(N, L2), 0.0) * 0.3 +
                        max(dot(N, L3), 0.0) * 0.2;

        float fresnel = pow(1.0 - abs(dot(N, vec3(0.0, 0.0, 1.0))), 2.5);
        float pulse = sin(time * 2.5) * 0.5 + 0.5;

        vec3 baseColor = color * (0.2 + 0.8 * lambert);
        float glowStrength = (0.4 + pulse * 0.6) * (0.3 + intensity * 1.7) * glowLimiter;
        vec3 glowColor = color * glowStrength * fresnel;
        float innerGlow = pow(1.0 - length(vPosition) / 1.5, 2.0) * intensity * 0.3 * glowLimiter;

        vec3 finalColor = baseColor + glowColor + color * innerGlow;
        finalColor = finalColor / (finalColor + vec3(1.2));

        float alpha = clamp(0.5 * lambert + 0.85 * fresnel + innerGlow, 0.0, 1.0);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    const eff0 = getEffective(currentState, intensity);

    const orbMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        color: { value: eff0.color.clone() },
        intensity: { value: intensity },
        glowLimiter: { value: 1.0 },
        uNoiseAmp:      { value: eff0.noiseAmp },
        uRidge:         { value: eff0.ridge },
        uWarp:          { value: eff0.warp },
        uWarpScale:     { value: eff0.warpScale },
        uTwistAmp:      { value: eff0.twistAmp },
        uTwistFreq:     { value: eff0.twistFreq },
        uPulseFreq:     { value: eff0.pulseFreq },
        uWaveAmp:       { value: eff0.waveAmp },
        uWaveFreq:      { value: eff0.waveFreq },
        uNoiseScale:    { value: eff0.shaderNoiseScale },
        uNoiseSpeed:    { value: eff0.shaderNoiseSpeed },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });

    const orbGeo = new THREE.SphereGeometry(1.1, 128, 128);
    const originalPositions = orbGeo.attributes.position.array.slice();
    orbGeo.userData.originalPositions = originalPositions;
    const orb = new THREE.Mesh(orbGeo, orbMat);
    scene.add(orb);
    fractalRef.current = orb;

    function makeCircleTexture(size = 64) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, size, size);
      const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.5);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      const tex = new THREE.CanvasTexture(c);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
      return tex;
    }
    const discTexture = makeCircleTexture(64);

    const createParticles = (count, colorsObj) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3]     = (Math.random() - 0.5) * 10;
        positions[i3 + 1] = (Math.random() - 0.5) * 10;
        positions[i3 + 2] = (Math.random() - 0.5) * 10;

        const pickA = Math.random() < 0.5;
        const c = pickA ? colorsObj.a : colorsObj.b;
        colors[i3]     = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: PARTICLE_SIZE_BASE,
        sizeAttenuation: true,
        transparent: true,
        opacity: PARTICLE_OPACITY_BASE,
        vertexColors: true,
        map: discTexture,
        alphaMap: discTexture,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geometry, mat);
      particleCountRef.current = count;
      return points;
    };

    const particles = createParticles(eff0.particles, particleColors[currentState]);
    scene.add(particles);
    particlesRef.current = particles;

    const noise3D = (x, y, z) => {
      const p = [x, y, z];
      const floor = (v) => [Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2])];
      const fract = (v) => [v[0] - Math.floor(v[0]), v[1] - Math.floor(v[1]), v[2] - Math.floor(v[2])];
      const i = floor(p);
      const f = fract(p);
      const u = [f[0] * f[0] * (3 - 2 * f[0]), f[1] * f[1] * (3 - 2 * f[1]), f[2] * f[2] * (3 - 2 * f[2])];
      const hash = (p) => {
        const h = Math.sin(p[0] * 127.1 + p[1] * 311.7 + p[2] * 74.7) * 43758.5453;
        return h - Math.floor(h);
      };
      const mix = (a, b, t) => a * (1 - t) + b * t;
      return (
        mix(
          mix(mix(hash([i[0], i[1], i[2]]), hash([i[0] + 1, i[1], i[2]]), u[0]),
              mix(hash([i[0], i[1] + 1, i[2]]), hash([i[0] + 1, i[1] + 1, i[2]]), u[0]), u[1]),
          mix(mix(hash([i[0], i[1], i[2] + 1]), hash([i[0] + 1, i[1], i[2] + 1]), u[0]),
              mix(hash([i[0], i[1] + 1, i[2] + 1]), hash([i[0] + 1, i[1] + 1, i[2] + 1]), u[0]), u[1]), u[2]
        ) * 2 - 1
      );
    };

    const fbmNoise = (x, y, z, octaves = 4) => {
      let value = 0, amplitude = 1, frequency = 1;
      for (let i = 0; i < octaves; i++) {
        value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
        frequency *= 2.1;
        amplitude *= 0.5;
      }
      return value;
    };

    const handleMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const eff = getEffective(currentState, intensity);
      const time = Date.now() * eff.speed;

      if (fractalRef.current) {
        const rotationSpeed = 0.8 + (intensity * 0.2);
        fractalRef.current.rotation.x = time * 0.45 * rotationSpeed;
        fractalRef.current.rotation.y = time * 0.28 * rotationSpeed;

        const u = fractalRef.current.material.uniforms;
        u.time.value = time;
        u.intensity.value = clamp(intensity * eff.shaderIntensityMul, 0.0, 1.6);

        u.uNoiseAmp.value   = eff.noiseAmp;
        u.uRidge.value      = eff.ridge;
        u.uWarp.value       = eff.warp;
        u.uWarpScale.value  = eff.warpScale;
        u.uTwistAmp.value   = eff.twistAmp;
        u.uTwistFreq.value  = eff.twistFreq;
        u.uPulseFreq.value  = eff.pulseFreq;
        u.uWaveAmp.value    = eff.waveAmp;
        u.uWaveFreq.value   = eff.waveFreq;
        u.uNoiseScale.value = eff.shaderNoiseScale;
        u.uNoiseSpeed.value = eff.shaderNoiseSpeed;

        let limiter = 1.0;
        if ((currentState === 'clarity' || currentState === 'chaos') && intensity > 0.5) {
          limiter = 1.0 - (intensity - 0.5) * 0.4;
        }
        u.glowLimiter.value = clamp(limiter, 0.8, 1.0);

        const geometry = fractalRef.current.geometry;
        const positions = geometry.attributes.position.array;
        const originalPos = geometry.userData.originalPositions;

        const baseDeform = eff.cpuDeformBase + intensity * eff.cpuDeformVar;
        const noiseScale = eff.noiseScale;
        const noiseSpeed = eff.noiseSpeed;
        const sharpness = eff.sharpness;
        const waviness = eff.waviness;
        const octaves = eff.complexity;

        const tCPU = time * 0.001 * noiseSpeed;

        for (let i = 0; i < positions.length; i += 3) {
          const x = originalPos[i];
          const y = originalPos[i + 1];
          const z = originalPos[i + 2];

          const len = Math.sqrt(x * x + y * y + z * z);
          const nx = x / len, ny = y / len, nz = z / len;

          const noise1 = fbmNoise(nx * noiseScale * 0.8 + tCPU * 0.5, ny * noiseScale * 0.8 + tCPU * 0.5, nz * noiseScale * 0.8 + tCPU * 0.5, Math.max(2, octaves - 1));
          const noise2 = fbmNoise(nx * noiseScale * 1.2 + tCPU * 0.8, ny * noiseScale * 1.2 + tCPU * 0.8, nz * noiseScale * 1.2 + tCPU * 0.8, Math.max(1, octaves - 2));

          const combinedNoise =
            noise1 * (1 - sharpness * 0.5) +
            noise2 * sharpness +
            Math.pow(Math.abs(noise1), 1 + sharpness * 2) * Math.sign(noise1) * sharpness * 0.3;

          const pulse = Math.sin(tCPU * 2000.0) * 0.5 + 0.5;
          const pulseFactor = 1 + pulse * 0.08 * intensity;

          const waveAmount = waviness * (0.02 + intensity * 0.04);
          const wave =
            Math.sin(x * 3 + tCPU * 2500) *
            Math.cos(y * 3 + tCPU * 2000) *
            Math.sin(z * 2.5 + tCPU * 1800) *
            waveAmount;

          const displacement = (combinedNoise * baseDeform * pulseFactor + wave) * len;
          positions[i]     = x + nx * displacement;
          positions[i + 1] = y + ny * displacement;
          positions[i + 2] = z + nz * displacement;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const targetScale = eff.scale;
        fractalRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
      }

      if (particlesRef.current) {
        const desired = getEffective(currentState, intensity).particles;

        if (Math.abs(desired - particleCountRef.current) > 50) {
          sceneRef.current.remove(particlesRef.current);
          particlesRef.current.geometry.dispose();
          particlesRef.current.material.dispose();
          const repl = createParticles(desired, particleColors[currentState]);
          sceneRef.current.add(repl);
          particlesRef.current = repl;
        }

        const pm = particlesRef.current.material;
        particlesRef.current.rotation.y = time * 0.10;

        const pulseBreath = 0.5 + 0.5 * Math.sin(time * eff.pulseFreq);
        pm.size = (PARTICLE_SIZE_BASE + intensity * PARTICLE_SIZE_VAR) * (0.92 + 0.16 * pulseBreath);
        pm.opacity = clamp(PARTICLE_OPACITY_BASE + intensity * PARTICLE_OPACITY_VAR, 0, 1);

        const arr = particlesRef.current.geometry.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] += Math.sin(time + arr[i]) * (0.0008 + intensity * 0.0008);
          if (arr[i + 1] > 5)  arr[i + 1] = -5;
          if (arr[i + 1] < -5) arr[i + 1] =  5;
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      const cam = cameraRef.current;
      const floatZ = 0.06 * Math.sin(time * 0.4);
      cam.position.x += (mouseRef.current.x * 0.5 - cam.position.x) * 0.05;
      cam.position.y += (mouseRef.current.y * 0.5 - cam.position.y) * 0.05;
      cam.position.z = 5 + floatZ;
      cam.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      orbGeo.dispose();
      orbMat.dispose();
      if (particlesRef.current) {
        particlesRef.current.geometry.dispose();
        particlesRef.current.material.dispose();
      }
      renderer.dispose();
    };
  }, [currentState, intensity]);

  useEffect(() => {
    if (!fractalRef.current || !sceneRef.current) return;
    const eff = getEffective(currentState, intensity);

    fractalRef.current.material.uniforms.color.value.lerp(eff.color, 0.2);

    const u = fractalRef.current.material.uniforms;
    u.uNoiseAmp.value   = eff.noiseAmp;
    u.uRidge.value      = eff.ridge;
    u.uWarp.value       = eff.warp;
    u.uWarpScale.value  = eff.warpScale;
    u.uTwistAmp.value   = eff.twistAmp;
    u.uTwistFreq.value  = eff.twistFreq;
    u.uPulseFreq.value  = eff.pulseFreq;
    u.uWaveAmp.value    = eff.waveAmp;
    u.uWaveFreq.value   = eff.waveFreq;
    u.uNoiseScale.value = eff.shaderNoiseScale;
    u.uNoiseSpeed.value = eff.shaderNoiseSpeed;

    if (particlesRef.current) {
      sceneRef.current.remove(particlesRef.current);
      particlesRef.current.geometry.dispose();
      particlesRef.current.material.dispose();
    }
    const pts = (() => {
      const geometry = new THREE.BufferGeometry();
      const count = eff.particles;
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3]     = (Math.random() - 0.5) * 10;
        positions[i3 + 1] = (Math.random() - 0.5) * 10;
        positions[i3 + 2] = (Math.random() - 0.5) * 10;
        const pickA = Math.random() < 0.5;
        const c = pickA ? particleColors[currentState].a : particleColors[currentState].b;
        colors[i3]     = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: PARTICLE_SIZE_BASE,
        sizeAttenuation: true,
        transparent: true,
        opacity: PARTICLE_OPACITY_BASE,
        vertexColors: true,
        map: (() => {
          const c = document.createElement('canvas');
          c.width = c.height = 64;
          const ctx = c.getContext('2d');
          const g = ctx.createRadialGradient(32, 32, 6, 32, 32, 32);
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(32, 32, 32, 0, Math.PI * 2);
          ctx.fill();
          const tex = new THREE.CanvasTexture(c);
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
          return tex;
        })(),
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(geometry, mat);
      particleCountRef.current = count;
      return points;
    })();

    sceneRef.current.add(pts);
    particlesRef.current = pts;
  }, [currentState]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="relative max-w-md w-full rounded-3xl p-8 backdrop-blur-xl"
            style={{
              background: 'rgba(15, 15, 25, 0.85)',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              animation: 'borderGlow 3s ease-in-out infinite',
            }}
          >
            <style>{`
              @keyframes borderGlow {
                0%, 100% { box-shadow: 0 0 30px rgba(100, 150, 255, 0.5), inset 0 0 30px rgba(100, 150, 255, 0.1); }
                50% { box-shadow: 0 0 50px rgba(150, 100, 255, 0.7), inset 0 0 50px rgba(150, 100, 255, 0.15); }
              }
            `}</style>

            <div className="text-center mb-6">
              <div className="inline-block p-3 rounded-full bg-white/10 mb-4">
                <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
              <h2 className="text-3xl font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'white' }}>
                Immersive Experience
              </h2>
              <p className="text-sm opacity-70" style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'white' }}>
                This experience is best enjoyed with sound and headphones
              </p>
            </div>

            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-xs leading-relaxed opacity-80 text-center" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'white' }}>
                Each emotion has its own unique soundscape. You can toggle sound anytime using the round button in the bottom right corner.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setSoundEnabled(true);
                  startSound();
                }}
                className="flex-1 py-3 px-6 rounded-xl font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, rgba(100, 150, 255, 0.3), rgba(150, 100, 255, 0.3))',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: 'white',
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: '0 4px 20px rgba(100, 150, 255, 0.3)',
                }}
              >
                Yes, enable sound
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 px-6 rounded-xl font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: "'Space Grotesk', sans-serif",
                }}
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}

      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowInfoModal(false)}>
          <div
            className="relative max-w-md w-full rounded-3xl p-8 backdrop-blur-xl"
            style={{
              background: 'rgba(15, 15, 25, 0.85)',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              animation: 'borderGlow 3s ease-in-out infinite',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes borderGlow {
                0%, 100% { box-shadow: 0 0 30px rgba(100, 150, 255, 0.5), inset 0 0 30px rgba(100, 150, 255, 0.1); }
                50% { box-shadow: 0 0 50px rgba(150, 100, 255, 0.7), inset 0 0 50px rgba(150, 100, 255, 0.15); }
              }
            `}</style>
            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="inline-block p-3 rounded-full bg-white/10 mb-4">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-light mb-4" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'white' }}>
                How to Interact
              </h2>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm leading-relaxed opacity-90" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'white' }}>
                  <span className="font-semibold">Move your cursor</span> to shift the camera perspective and explore the fractal from different angles.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm leading-relaxed opacity-90" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'white' }}>
                  The <span className="font-semibold">intensity slider</span> maps each emotion's min→max ranges for speed, complexity, scale, particles and noise characteristics.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p className="text-sm leading-relaxed opacity-90" style={{ fontFamily: "'Cormorant Garamond', serif", color: 'white' }}>
                  <span className="font-semibold">Select emotions</span> on the left to experience different states, each with unique visual and sonic properties.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ef-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .ef-range::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 9999px;
          background: transparent;
        }
        .ef-range::-moz-range-track {
          height: 8px;
          border-radius: 9999px;
          background: transparent;
        }
        .ef-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px; height: 12px; border-radius: 9999px;
          background: #ffffff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.15);
          margin-top: -2px;
          cursor: pointer;
        }
        .ef-range::-moz-range-thumb {
          width: 12px; height: 12px; border-radius: 9999px;
          background: #ffffff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.15);
          cursor: pointer;
        }
        @keyframes subtitleFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 0.8;
            transform: translateY(0);
          }
        }
        .subtitle-text {
          visibility: hidden;
          animation: subtitleReveal 0.01s 0.15s forwards, subtitleFadeIn 0.8s 0.15s ease-out forwards;
        }
        @keyframes subtitleReveal {
          to {
            visibility: visible;
          }
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center pointer-events-auto px-4">
          <h1
            className="font-light tracking-wider mb-1 transition-all duration-1000 text-5xl md:text-7xl"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: `rgb(${toRGB(getEffective(currentState, intensity).color)})`,
              textShadow: '0 0 20px rgba(255,255,255,0.3)',
              transform:
                currentState === 'chaos' ? 'skew(-2deg)' :
                currentState === 'tension' ? 'scaleY(1.2)' : 'none',
              letterSpacing:
                currentState === 'clarity' ? '0.3em' :
                currentState === 'calm' ? '0.1em' : '0.05em',
            }}
          >
            {emotionStates[currentState].title}
          </h1>

          <p
            key={currentState}
            className="subtitle-text font-bold uppercase opacity-80 mx-auto text-xs md:text-xl tracking-[0.2em] md:tracking-widest whitespace-nowrap"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: '#ffffff',
            }}
          >
            {emotionStates[currentState].subtitle}
          </p>
        </div>

        <div className="absolute top-1/2 left-6 md:left-8 -translate-y-1/2 pointer-events-auto">
          <div className="p-1.5 md:p-2">
            <div className="flex flex-col gap-3 md:gap-4">
              {Object.keys(emotionStates).map((state) => {
                const c = emotionStates[state].color;
                const isActive = currentState === state;
                const cStr = toRGB(c);
                return (
                  <button
                    key={state}
                    onClick={() => setCurrentState(state)}
                    className="group relative rounded-xl md:rounded-2xl transition-all duration-300 hover:scale-105 px-5 py-2.5 md:px-6 md:py-3"
                    style={{
                      background: isActive ? `rgba(${cStr}, 0.16)` : 'rgba(255,255,255,0.05)',
                      border: isActive ? `2px solid rgba(${cStr}, 0.55)` : '2px solid rgba(255,255,255,0.12)',
                      boxShadow: isActive
                        ? `0 10px 30px rgba(${cStr}, 0.35), inset 0 1px 0 rgba(255,255,255,0.12)`
                        : '0 0 0 rgba(0,0,0,0)',
                    }}
                  >
                    <div
                      className="absolute -left-4 md:-left-5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full"
                      style={{
                        backgroundColor: `rgb(${toRGB(c)})`,
                        boxShadow: `0 0 10px rgba(${toRGB(c)},0.9)`,
                      }}
                    />
                    <span
                      className="font-semibold uppercase tracking-wider text-[11px] md:text-sm"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {state}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-full max-w-[calc(100vw-8rem)] md:max-w-96 px-4 md:px-0 pointer-events-auto">
          <div className="backdrop-blur-sm bg-white/5 rounded-full px-4 py-2.5 border border-white/10 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-center mb-1 flex items-center justify-center gap-2">
                <span
                  className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'white' }}
                >
                  Intensity
                </span>
                <button
                  onClick={() => setShowInfoModal(true)}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all hover:scale-110"
                >
                  <svg className="w-3 h-3 text-white opacity-70" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={intensity}
                onChange={(e) => setIntensity(parseFloat(e.target.value))}
                className="ef-range w-full h-2 rounded-full appearance-none cursor-pointer outline-none"
                style={{
                  background: `linear-gradient(to right, rgba(${toRGB(getEffective(currentState, intensity).color)}, 0.18) 0%, rgba(${toRGB(getEffective(currentState, intensity).color)}, 0.9) 100%)`,
                }}
              />
            </div>

            <button
              onClick={toggleSound}
              className="md:hidden flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
              style={soundButtonStyle}
            >
              {soundEnabled ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white opacity-70" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <button
        onClick={toggleSound}
        className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full md:flex items-center justify-center transition-all duration-300 hover:scale-110 hidden"
        style={soundButtonStyle}
      >
        {soundEnabled ? (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white opacity-70" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
          </svg>
        )}
      </button>
    </div>
  );
};

export default EmotionalFractals;