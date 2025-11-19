import drone000 from "../assets/audio/BaseCleanDrone.mp3";
import calmBase from "../assets/audio/CalmMain.mp3";
import calmLayer from "../assets/audio/CalmIntensity.mp3";
import tensionBase from "../assets/audio/TensionMain.mp3";
import tensionLayer from "../assets/audio/TensionIntensity.mp3";
import clarityBase from "../assets/audio/ClarityMain.mp3";
import clarityLayer from "../assets/audio/ClarityIntensity.mp3";
import chaosBase from "../assets/audio/ChaosMain.mp3";
import chaosLayer from "../assets/audio/ChaosIntensity.mp3";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";

const EmotionalOrbs = () => {
  const canvasRef = useRef(null);
  const [currentState, setCurrentState] = useState("calm");
  const [intensity, setIntensity] = useState(0.05);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showModal, setShowModal] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const handleEmotionChange = (state) => {
    setIntensity(0.05);
    setCurrentState(state);
  };

  const audioElementsRef = useRef({});

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const fractalRef = useRef(null);
  const particlesRef = useRef(null);
  const particleCountRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const cameraRotationRef = useRef({ theta: 0, phi: Math.PI / 2 });
  const cameraDistanceRef = useRef(5);

  const PARTICLE_SIZE_BASE = 0.022;
  const PARTICLE_SIZE_VAR = 0.02;
  const PARTICLE_OPACITY_BASE = 0.52;
  const PARTICLE_OPACITY_VAR = 0.22;

  const visualIntensityRef = useRef(intensity);
  const intensityRef = useRef(intensity);
  const particleVisibleCountRef = useRef(0);
  const timeAccRef = useRef(0);
  const lastTimestampRef = useRef(0);

  const particleColors = {
    calm: { a: new THREE.Color("#9fdcff"), b: new THREE.Color("#cde0d8") },
    tension: { a: new THREE.Color("#ff6868"), b: new THREE.Color("#fff0e2") },
    clarity: { a: new THREE.Color("#ffffff"), b: new THREE.Color("#cbd7ff") },
    chaos: { a: new THREE.Color("#ff6fff"), b: new THREE.Color("#ffdcfa") },
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const toRGB = (c) =>
    `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(
      c.b * 255
    )}`;
  const toRGBA = (c, a = 1) => `rgba(${toRGB(c)}, ${a})`;

  const audioFiles = {
    drone: drone000,
    calm: {
      base: calmBase,
      layer: calmLayer,
    },
    tension: {
      base: tensionBase,
      layer: tensionLayer,
    },
    clarity: {
      base: clarityBase,
      layer: clarityLayer,
    },
    chaos: {
      base: chaosBase,
      layer: chaosLayer,
    },
  };

  const DRONE_VOLUME = 0.35;
  const BASE_VOLUME = 0.45;
  const LAYER_MAX_VOLUME = 0.7;

  const getOrCreateAudio = (key, src) => {
    if (!src) return null;
    if (!audioElementsRef.current[key]) {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = 0;
      audio.preload = 'auto';
      audioElementsRef.current[key] = audio;
    }
    return audioElementsRef.current[key];
  };

  const playAudioSafely = async (audio) => {
    if (!audio) return;
    
    try {
      if (audio.readyState < 2) {
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplay', resolve, { once: true });
          audio.addEventListener('error', reject, { once: true });
          audio.load();
        });
      }
      
      await audio.play();
    } catch (err) {
      console.warn(`Audio play failed:`, err.message);
    }
  };

  const fadeToVolume = (audio, target, durationMs = 400) => {
    if (!audio) return;
    const steps = 20;
    const stepTime = durationMs / steps;
    const startVolume = audio.volume;
    const delta = (target - startVolume) / steps;
    let currentStep = 0;
    const id = setInterval(() => {
      currentStep += 1;
      audio.volume = Math.max(0, Math.min(1, startVolume + (delta * currentStep)));
      if (currentStep >= steps) {
        clearInterval(id);
        audio.volume = Math.max(0, Math.min(1, target));
        if (audio.volume === 0 && !audio.paused) {
          audio.pause();
          audio.currentTime = 0;
        }
      }
    }, stepTime);
  };

  const startDroneIfNeeded = async () => {
    const drone = getOrCreateAudio("drone", audioFiles.drone);
    if (drone && drone.paused) {
      await playAudioSafely(drone);
      fadeToVolume(drone, DRONE_VOLUME, 600);
    }
  };

  const updateEmotionTracks = async () => {
    const emotions = ["calm", "tension", "clarity", "chaos"];

    emotions.forEach((emotion) => {
      if (emotion === currentState) return;
      ["base", "layer"].forEach((layer) => {
        const key = `${emotion}_${layer}`;
        const a = audioElementsRef.current[key];
        if (a) fadeToVolume(a, 0, 800);
      });
    });

    const conf = audioFiles[currentState] || {};
    const baseAudio = getOrCreateAudio(`${currentState}_base`, conf.base);
    const layerAudio = getOrCreateAudio(`${currentState}_layer`, conf.layer);

    if (baseAudio) {
      await playAudioSafely(baseAudio);
      fadeToVolume(baseAudio, BASE_VOLUME, 1000);
    }

    if (layerAudio) {
      await playAudioSafely(layerAudio);
      const targetLayerVol = LAYER_MAX_VOLUME * intensity;
      fadeToVolume(layerAudio, targetLayerVol, 1000);
    }
  };

  const startSound = async () => {
    await startDroneIfNeeded();
    await updateEmotionTracks();
  };

  const stopSound = () => {
    Object.values(audioElementsRef.current).forEach((audio) => {
      if (audio) fadeToVolume(audio, 0, 400);
    });
  };

  const toggleSound = async () => {
    if (soundEnabled) {
      stopSound();
      setSoundEnabled(false);
    } else {
      await startSound();
      setSoundEnabled(true);
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const preloadAudio = () => {
      getOrCreateAudio("drone", audioFiles.drone);
      
      Object.keys(emotionStates).forEach((emotion) => {
        const conf = audioFiles[emotion];
        if (conf) {
          getOrCreateAudio(`${emotion}_base`, conf.base);
          getOrCreateAudio(`${emotion}_layer`, conf.layer);
        }
      });
    };
    
    preloadAudio();
  }, []);

  useEffect(() => {
    if (soundEnabled) {
      updateEmotionTracks();
    }
  }, [currentState]);

  useEffect(() => {
    if (!soundEnabled) return;
    const conf = audioFiles[currentState];
    if (!conf) return;
    const layerAudio = getOrCreateAudio(`${currentState}_layer`, conf.layer);
    if (layerAudio) {
      const target = LAYER_MAX_VOLUME * intensity;
      layerAudio.volume = clamp(target, 0, 1);
    }
  }, [intensity, soundEnabled, currentState]);

  useEffect(() => {
    intensityRef.current = intensity;
  }, [intensity]);

  const emotionStates = {
    calm: {
      color: new THREE.Color(0.6, 0.8, 0.95),
      title: "Calm",
      subtitle: "breathe in serenity",
      speed: { min: 0.0004, max: 0.001 },
      complexity: { min: 3, max: 4 },
      scale: { min: 0.8, max: 1.3 },
      particles: { min: 600, max: 1000 },
      noiseScale: { min: 0.8, max: 1 },
      noiseSpeed: { min: 0.2, max: 0.4 },
      sharpness: { min: 0.1, max: 0.2 },
      waviness: { min: 2, max: 2.5 },
      shaderIntensityMul: { min: 0.25, max: 0.35 },
      cpuDeformBase: { min: 0.05, max: 0.055 },
      cpuDeformVar: { min: 0.04, max: 0 },
      noiseAmp: { min: 0, max: 0 },
      ridge: { min: 0, max: 0.15 },
      warp: { min: 0.1, max: 0.25 },
      warpScale: { min: 0.6, max: 1 },
      twistAmp: { min: 0.02, max: 0.08 },
      twistFreq: { min: 1.2, max: 1.6 },
      pulseFreq: { min: 0.6, max: 1 },
      waveAmp: { min: 0.02, max: 0.07 },
      waveFreq: { min: 1.2, max: 2 },
      shaderNoiseScale: { min: 1, max: 1.4 },
      shaderNoiseSpeed: { min: 0.3, max: 0.6 },
    },
    tension: {
      color: new THREE.Color(0.95, 0.3, 0.4),
      title: "Tension",
      subtitle: "energy compressed",
      speed: { min: 0.0011, max: 0.0019 },
      complexity: { min: 3.6, max: 4.4 },
      scale: { min: 1, max: 1.2 },
      particles: { min: 900, max: 1500 },
      noiseScale: { min: 1.2, max: 1.6 },
      noiseSpeed: { min: 1, max: 1.6 },
      sharpness: { min: 0.08, max: 0.12 },
      waviness: { min: 3.2, max: 3.8 },
      shaderIntensityMul: { min: 0.25, max: 0.29 },
      cpuDeformBase: { min: 0.1, max: 0.2 },
      cpuDeformVar: { min: 0.1, max: 0.1 },
      noiseAmp: { min: 0.03, max: 0.05 },
      ridge: { min: 0, max: 0 },
      warp: { min: 0.45, max: 0.85 },
      warpScale: { min: 1.2, max: 1.5 },
      twistAmp: { min: 0.04, max: 0.07 },
      twistFreq: { min: 1, max: 2 },
      pulseFreq: { min: 1.6, max: 2 },
      waveAmp: { min: 0.14, max: 0.2 },
      waveFreq: { min: 1, max: 2 },
      shaderNoiseScale: { min: 0.3, max: 0.7 },
      shaderNoiseSpeed: { min: 0.7, max: 1.2 },
    },
    clarity: {
      color: new THREE.Color(0.95, 0.95, 1),
      title: "Clarity",
      subtitle: "crystallized thought",
      speed: { min: 0.0006, max: 0.001 },
      complexity: { min: 3, max: 4 },
      scale: { min: 0.55, max: 0.6 },
      particles: { min: 500, max: 900 },
      noiseScale: { min: 4.8, max: 6.8 },
      noiseSpeed: { min: 0.9, max: 1 },
      sharpness: { min: 3, max: 5 },
      waviness: { min: 2, max: 5 },
      shaderIntensityMul: { min: 0.25, max: 0.35 },
      cpuDeformBase: { min: 0.05, max: 0.2 },
      cpuDeformVar: { min: 0.1, max: 0.1 },
      noiseAmp: { min: 0, max: 0 },
      ridge: { min: 2, max: 2 },
      warp: { min: 0.05, max: 0.15 },
      warpScale: { min: 1, max: 2.2 },
      twistAmp: { min: 0.02, max: 0.06 },
      twistFreq: { min: 2.4, max: 2.6 },
      pulseFreq: { min: 0.8, max: 1.4 },
      waveAmp: { min: 0.02, max: 0.06 },
      waveFreq: { min: 2.6, max: 4 },
      shaderNoiseScale: { min: 1.8, max: 2.6 },
      shaderNoiseSpeed: { min: 0.5, max: 0.9 },
    },
    chaos: {
      color: new THREE.Color(0.8, 0.5, 0.9),
      title: "Chaos",
      subtitle: "beautiful disorder",
      speed: { min: 0.0022, max: 0.0029 },
      complexity: { min: 3, max: 4 },
      scale: { min: 0.8, max: 1.2 },
      particles: { min: 1200, max: 1600 },
      noiseScale: { min: 2.4, max: 3 },
      noiseSpeed: { min: 1.4, max: 1.7 },
      sharpness: { min: 1.2, max: 1.6 },
      waviness: { min: 4, max: 5.5 },
      shaderIntensityMul: { min: 0.04, max: 0.07 },
      cpuDeformBase: { min: 0.04, max: 0.08 },
      cpuDeformVar: { min: 0.04, max: 0.06 },
      noiseAmp: { min: 0.18, max: 0.22 },
      ridge: { min: 0, max: 0 },
      warp: { min: 0.7, max: 1 },
      warpScale: { min: 1.1, max: 1.3 },
      twistAmp: { min: 0.8, max: 1.1 },
      twistFreq: { min: 1.8, max: 2 },
      pulseFreq: { min: 2.2, max: 2.8 },
      waveAmp: { min: 0.06, max: 0.12 },
      waveFreq: { min: 1.2, max: 1.5 },
      shaderNoiseScale: { min: 0.8, max: 1.1 },
      shaderNoiseSpeed: { min: 1.6, max: 2 },
    },
  };

  const getEffective = (stateKey, t) => {
    const s = emotionStates[stateKey];
    const eff = (key, round = false) => {
      const v = lerp(s[key].min, s[key].max, t);
      return round ? Math.round(v) : v;
    };
    return {
      color: s.color,
      title: s.title,
      subtitle: s.subtitle,
      speed: eff("speed"),
      complexity: clamp(Math.round(eff("complexity")), 1, 10),
      scale: eff("scale"),
      particles: eff("particles", true),
      noiseScale: eff("noiseScale"),
      noiseSpeed: eff("noiseSpeed"),
      sharpness: eff("sharpness"),
      waviness: eff("waviness"),
      shaderIntensityMul: eff("shaderIntensityMul"),
      cpuDeformBase: eff("cpuDeformBase"),
      cpuDeformVar: eff("cpuDeformVar"),
      noiseAmp: eff("noiseAmp"),
      ridge: eff("ridge"),
      warp: eff("warp"),
      warpScale: eff("warpScale"),
      twistAmp: eff("twistAmp"),
      twistFreq: eff("twistFreq"),
      pulseFreq: eff("pulseFreq"),
      waveAmp: eff("waveAmp"),
      waveFreq: eff("waveFreq"),
      shaderNoiseScale: eff("shaderNoiseScale"),
      shaderNoiseSpeed: eff("shaderNoiseSpeed"),
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
        background: "rgba(255, 255, 255, 0.08)",
        border: `2px solid rgba(${rgb}, 0.35)`,
        boxShadow: `0 4px 16px rgba(0,0,0,0.35)`,
      };
  }, [soundEnabled, uiColor]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 1);
    rendererRef.current = renderer;

    timeAccRef.current = 0;
    lastTimestampRef.current = performance.now();

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

    const eff0 = getEffective(currentState, intensityRef.current);

    const orbMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        color: { value: eff0.color.clone() },
        intensity: { value: intensityRef.current },
        glowLimiter: { value: 1.0 },
        uNoiseAmp: { value: eff0.noiseAmp },
        uRidge: { value: eff0.ridge },
        uWarp: { value: eff0.warp },
        uWarpScale: { value: eff0.warpScale },
        uTwistAmp: { value: eff0.twistAmp },
        uTwistFreq: { value: eff0.twistFreq },
        uPulseFreq: { value: eff0.pulseFreq },
        uWaveAmp: { value: eff0.waveAmp },
        uWaveFreq: { value: eff0.waveFreq },
        uNoiseScale: { value: eff0.shaderNoiseScale },
        uNoiseSpeed: { value: eff0.shaderNoiseSpeed },
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
      const c = document.createElement("canvas");
      c.width = c.height = size;
      const ctx = c.getContext("2d");
      ctx.clearRect(0, 0, size, size);
      const g = ctx.createRadialGradient(
        size / 2,
        size / 2,
        size * 0.1,
        size / 2,
        size / 2,
        size * 0.5
      );
      g.addColorStop(0, "rgba(255,255,255,1)");
      g.addColorStop(1, "rgba(255,255,255,0)");
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
        positions[i3] = (Math.random() - 0.5) * 10;
        positions[i3 + 1] = (Math.random() - 0.5) * 10;
        positions[i3 + 2] = (Math.random() - 0.5) * 10;

        const pickA = Math.random() < 0.5;
        const c = pickA ? colorsObj.a : colorsObj.b;
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

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
    particleVisibleCountRef.current = eff0.particles;

    const noise3D = (x, y, z) => {
      const p = [x, y, z];
      const floorFn = (v) => [
        Math.floor(v[0]),
        Math.floor(v[1]),
        Math.floor(v[2]),
      ];
      const fract = (v) => [
        v[0] - Math.floor(v[0]),
        v[1] - Math.floor(v[1]),
        v[2] - Math.floor(v[2]),
      ];
      const i = floorFn(p);
      const f = fract(p);
      const u = [
        f[0] * f[0] * (3 - 2 * f[0]),
        f[1] * f[1] * (3 - 2 * f[1]),
        f[2] * f[2] * (3 - 2 * f[2]),
      ];
      const hash = (p2) => {
        const h =
          Math.sin(p2[0] * 127.1 + p2[1] * 311.7 + p2[2] * 74.7) * 43758.5453;
        return h - Math.floor(h);
      };
      const mix = (a, b, t) => a * (1 - t) + b * t;
      return (
        mix(
          mix(
            mix(hash([i[0], i[1], i[2]]), hash([i[0] + 1, i[1], i[2]]), u[0]),
            mix(
              hash([i[0], i[1] + 1, i[2]]),
              hash([i[0] + 1, i[1] + 1, i[2]]),
              u[0]
            ),
            u[1]
          ),
          mix(
            mix(
              hash([i[0], i[1], i[2] + 1]),
              hash([i[0] + 1, i[1], i[2] + 1]),
              u[0]
            ),
            mix(
              hash([i[0], i[1] + 1, i[2] + 1]),
              hash([i[0] + 1, i[1] + 1, i[2] + 1]),
              u[0]
            ),
            u[1]
          ),
          u[2]
        ) * 2 -
        1
      );
    };

    const fbmNoise = (x, y, z, octaves = 4) => {
      let value = 0,
        amplitude = 1,
        frequency = 1;
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
    window.addEventListener("mousemove", handleMouseMove);

    const handleMouseDown = (e) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: e.clientX, y: e.clientY };
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "grabbing";
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = "grab";
      }
    };

    const handleMouseDrag = (e) => {
      if (!isDraggingRef.current) return;

      const deltaX = e.clientX - previousMouseRef.current.x;
      const deltaY = e.clientY - previousMouseRef.current.y;

      cameraRotationRef.current.theta -= deltaX * 0.005;
      cameraRotationRef.current.phi -= deltaY * 0.005;

      cameraRotationRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, cameraRotationRef.current.phi)
      );

      previousMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMouseRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    };

    const handleTouchMove = (e) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      e.preventDefault();

      const deltaX = e.touches[0].clientX - previousMouseRef.current.x;
      const deltaY = e.touches[0].clientY - previousMouseRef.current.y;

      cameraRotationRef.current.theta -= deltaX * 0.005;
      cameraRotationRef.current.phi -= deltaY * 0.005;

      cameraRotationRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, cameraRotationRef.current.phi)
      );

      previousMouseRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    };

    const handleTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e) => {
      e.preventDefault();
      cameraDistanceRef.current += e.deltaY * 0.002;
      cameraDistanceRef.current = Math.max(
        4.5,
        Math.min(6, cameraDistanceRef.current)
      );
    };

    if (canvasRef.current) {
      canvasRef.current.addEventListener("mousedown", handleMouseDown);
      canvasRef.current.addEventListener("touchstart", handleTouchStart, {
        passive: false,
      });
      canvasRef.current.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      canvasRef.current.addEventListener("touchend", handleTouchEnd);
      canvasRef.current.addEventListener("wheel", handleWheel, {
        passive: false,
      });
      canvasRef.current.style.cursor = "grab";
    }

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("mousemove", handleMouseDrag);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const now = performance.now();
      const deltaMs = now - lastTimestampRef.current;
      lastTimestampRef.current = now;
      const deltaSec = deltaMs / 1000;

      visualIntensityRef.current +=
        (intensityRef.current - visualIntensityRef.current) * 0.12;
      const smoothIntensity = visualIntensityRef.current;

      const eff = getEffective(currentState, smoothIntensity);

      timeAccRef.current += deltaSec * eff.speed * 1000;
      const time = timeAccRef.current;

      const mobileCheck = window.innerWidth < 768;

      if (fractalRef.current) {
        const rotationSpeed = 0.8 + smoothIntensity * 0.2;
        fractalRef.current.rotation.x = time * 0.45 * rotationSpeed;
        fractalRef.current.rotation.y = time * 0.28 * rotationSpeed;

        const u = fractalRef.current.material.uniforms;
        u.time.value = time;
        u.intensity.value = clamp(
          smoothIntensity * eff.shaderIntensityMul,
          0.0,
          1.6
        );

        u.uNoiseAmp.value = eff.noiseAmp;
        u.uRidge.value = eff.ridge;
        u.uWarp.value = eff.warp;
        u.uWarpScale.value = eff.warpScale;
        u.uTwistAmp.value = eff.twistAmp;
        u.uTwistFreq.value = eff.twistFreq;
        u.uPulseFreq.value = eff.pulseFreq;
        u.uWaveAmp.value = eff.waveAmp;
        u.uWaveFreq.value = eff.waveFreq;
        u.uNoiseScale.value = eff.shaderNoiseScale;
        u.uNoiseSpeed.value = eff.shaderNoiseSpeed;

        let limiter = 1.0;
        if (
          (currentState === "clarity" || currentState === "chaos") &&
          smoothIntensity > 0.5
        ) {
          limiter = 1.0 - (smoothIntensity - 0.5) * 0.4;
        }
        u.glowLimiter.value = clamp(limiter, 0.8, 1.0);

        const geometry = fractalRef.current.geometry;
        const positions = geometry.attributes.position.array;
        const originalPos = geometry.userData.originalPositions;

        const baseDeform = eff.cpuDeformBase + smoothIntensity * eff.cpuDeformVar;
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
          const nx = x / len,
            ny = y / len,
            nz = z / len;

          const noise1 = fbmNoise(
            nx * noiseScale * 0.8 + tCPU * 0.5,
            ny * noiseScale * 0.8 + tCPU * 0.5,
            nz * noiseScale * 0.8 + tCPU * 0.5,
            Math.max(2, octaves - 1)
          );
          const noise2 = fbmNoise(
            nx * noiseScale * 1.2 + tCPU * 0.8,
            ny * noiseScale * 1.2 + tCPU * 0.8,
            nz * noiseScale * 1.2 + tCPU * 0.8,
            Math.max(1, octaves - 2)
          );

          const combinedNoise =
            noise1 * (1 - sharpness * 0.5) +
            noise2 * sharpness +
            Math.pow(Math.abs(noise1), 1 + sharpness * 2) *
            Math.sign(noise1) *
            sharpness *
            0.3;

          const pulse = Math.sin(tCPU * 2000.0) * 0.5 + 0.5;
          const pulseFactor = 1 + pulse * 0.08 * smoothIntensity;

          const waveAmount = waviness * (0.02 + smoothIntensity * 0.04);
          const wave =
            Math.sin(x * 3 + tCPU * 2500) *
            Math.cos(y * 3 + tCPU * 2000) *
            Math.sin(z * 2.5 + tCPU * 1800) *
            waveAmount;

          const displacement =
            (combinedNoise * baseDeform * pulseFactor + wave) * len;
          positions[i] = x + nx * displacement;
          positions[i + 1] = y + ny * displacement;
          positions[i + 2] = z + nz * displacement;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const mobileScaleMultiplier = mobileCheck ? 0.65 : 1.0;
        const targetScale = eff.scale * mobileScaleMultiplier;
        fractalRef.current.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.12
        );
      }

      if (particlesRef.current) {
        const targetParticles = getEffective(currentState, smoothIntensity)
          .particles;

        if (!particleVisibleCountRef.current) {
          particleVisibleCountRef.current = targetParticles;
        }

        particleVisibleCountRef.current +=
          (targetParticles - particleVisibleCountRef.current) * 0.2;
        const visibleCount = Math.max(
          10,
          Math.floor(particleVisibleCountRef.current)
        );
        particlesRef.current.geometry.setDrawRange(0, visibleCount);

        const pm = particlesRef.current.material;
        particlesRef.current.rotation.y = time * 0.1;

        const pulseBreath = 0.5 + 0.5 * Math.sin(time * eff.pulseFreq);
        pm.size =
          (PARTICLE_SIZE_BASE + smoothIntensity * PARTICLE_SIZE_VAR) *
          (0.92 + 0.16 * pulseBreath);
        pm.opacity = clamp(
          PARTICLE_OPACITY_BASE + smoothIntensity * PARTICLE_OPACITY_VAR,
          0,
          1
        );

        const arr = particlesRef.current.geometry.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] +=
            Math.sin(time + arr[i]) * (0.0008 + smoothIntensity * 0.0008);
          if (arr[i + 1] > 5) arr[i + 1] = -5;
          if (arr[i + 1] < -5) arr[i + 1] = 5;
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      const cam = cameraRef.current;

      if (isDraggingRef.current) {
        const theta = cameraRotationRef.current.theta;
        const phi = cameraRotationRef.current.phi;
        const radius = cameraDistanceRef.current;

        cam.position.x = radius * Math.sin(phi) * Math.cos(theta);
        cam.position.y = radius * Math.cos(phi);
        cam.position.z = radius * Math.sin(phi) * Math.sin(theta);
      } else {
        const floatZ = 0.06 * Math.sin(time * 0.4);
        cam.position.x += (mouseRef.current.x * 0.5 - cam.position.x) * 0.05;
        cam.position.y += (mouseRef.current.y * 0.5 - cam.position.y) * 0.05;
        cam.position.z = cameraDistanceRef.current + floatZ;
      }

      cam.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("mousemove", handleMouseDrag);

      if (canvasRef.current) {
        canvasRef.current.removeEventListener("mousedown", handleMouseDown);
        canvasRef.current.removeEventListener("touchstart", handleTouchStart);
        canvasRef.current.removeEventListener("touchmove", handleTouchMove);
        canvasRef.current.removeEventListener("touchend", handleTouchEnd);
        canvasRef.current.removeEventListener("wheel", handleWheel);
      }

      cancelAnimationFrame(animationId);
      orbGeo.dispose();
      orbMat.dispose();
      if (particlesRef.current) {
        particlesRef.current.geometry.dispose();
        particlesRef.current.material.dispose();
      }
      renderer.dispose();
    };
  }, [currentState, isMobile]);

  useEffect(() => {
    if (!fractalRef.current || !sceneRef.current) return;
    const eff = getEffective(currentState, intensity);

    fractalRef.current.material.uniforms.color.value.lerp(eff.color, 0.2);

    const u = fractalRef.current.material.uniforms;
    u.uNoiseAmp.value = eff.noiseAmp;
    u.uRidge.value = eff.ridge;
    u.uWarp.value = eff.warp;
    u.uWarpScale.value = eff.warpScale;
    u.uTwistAmp.value = eff.twistAmp;
    u.uTwistFreq.value = eff.twistFreq;
    u.uPulseFreq.value = eff.pulseFreq;
    u.uWaveAmp.value = eff.waveAmp;
    u.uWaveFreq.value = eff.waveFreq;
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
        positions[i3] = (Math.random() - 0.5) * 10;
        positions[i3 + 1] = (Math.random() - 0.5) * 10;
        positions[i3 + 2] = (Math.random() - 0.5) * 10;
        const pickA = Math.random() < 0.5;
        const c = pickA
          ? particleColors[currentState].a
          : particleColors[currentState].b;
        colors[i3] = c.r;
        colors[i3 + 1] = c.g;
        colors[i3 + 2] = c.b;
      }
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: PARTICLE_SIZE_BASE,
        sizeAttenuation: true,
        transparent: true,
        opacity: PARTICLE_OPACITY_BASE,
        vertexColors: true,
        map: (() => {
          const c = document.createElement("canvas");
          c.width = c.height = 64;
          const ctx = c.getContext("2d");
          const g = ctx.createRadialGradient(32, 32, 6, 32, 32, 32);
          g.addColorStop(0, "rgba(255,255,255,1)");
          g.addColorStop(1, "rgba(255,255,255,0)");
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
      particleVisibleCountRef.current = count;
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
              background: "rgba(15, 15, 25, 0.90)",
              border: "2px solid transparent",
              backgroundClip: "padding-box",
              animation: "borderGlow 3s ease-in-out infinite",
            }}
          >
            <style>{`
        @keyframes borderGlow {
          0%, 100% {
            box-shadow:
              0 0 30px rgba(153, 204, 242, 0.45),
              inset 0 0 30px rgba(153, 204, 242, 0.12);
          }
          50% {
            box-shadow:
              0 0 50px rgba(153, 204, 242, 0.75),
              inset 0 0 50px rgba(153, 204, 242, 0.20);
          }
        }
      `}</style>

            <div className="text-center mb-6">
              <div
                className="inline-block p-3 rounded-full mb-4"
                style={{
                  background: "rgba(153, 204, 242, 0.16)",
                  border: "1px solid rgba(153, 204, 242, 0.5)",
                  boxShadow: "0 0 18px rgba(153, 204, 242, 0.35)",
                }}
              >
                <svg
                  className="w-12 h-12 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              </div>
              <h2
                className="text-3xl font-light mb-2"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "white",
                }}
              >
                Immersive Experience
              </h2>
              <p
                className="text-sm opacity-70"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "white",
                }}
              >
                This experience is best enjoyed with sound and headphones.
              </p>
            </div>

            <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <p
                className="text-xs leading-relaxed opacity-80 text-center"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "white",
                }}
              >
                Each emotion has its own unique soundscape. You can toggle sound
                anytime using the round button in the bottom right corner.
              </p>
            </div>

            <div
              className="mb-6 p-3 rounded-xl border"
              style={{
                background:
                  "linear-gradient(135deg, rgba(242, 77, 102, 0.18), rgba(242, 77, 102, 0.32))",
                borderColor: "rgba(242, 77, 102, 0.7)",
                boxShadow: "0 0 18px rgba(242, 77, 102, 0.35)",
              }}
            >
              <p
                className="text-xs leading-relaxed text-center"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "white",
                }}
              >
                This site uses advanced real-time WebGL effects. Best
                experienced on desktop. Mobile performance may vary.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setShowModal(false);
                  setSoundEnabled(true);
                  await startSound();
                }}
                className="flex-1 py-3 px-6 rounded-xl font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(153, 204, 242, 0.28), rgba(153, 204, 242, 0.40))",
                  border: "1px solid rgba(153, 204, 242, 0.65)",
                  color: "white",
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: "0 4px 20px rgba(153, 204, 242, 0.45)",
                }}
              >
                Yes, enable sound
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 px-6 rounded-xl font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:scale-105"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(153, 204, 242, 0.45)",
                  color: "rgba(255, 255, 255, 0.75)",
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowInfoModal(false)}
        >
          <div
            className="relative max-w-md w-full rounded-3xl p-8 backdrop-blur-xl max-h-[90vh] overflow-y-auto"
            style={{
              background: "rgba(15, 15, 25, 0.90)",
              border: "2px solid transparent",
              backgroundClip: "padding-box",
              animation: "borderGlow 3s ease-in-out infinite",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
        @keyframes borderGlow {
          0%, 100% {
            box-shadow:
              0 0 30px rgba(153, 204, 242, 0.45),
              inset 0 0 30px rgba(153, 204, 242, 0.12);
          }
          50% {
            box-shadow:
              0 0 50px rgba(153, 204, 242, 0.75),
              inset 0 0 50px rgba(153, 204, 242, 0.20);
          }
        }

        @keyframes pulseGlowBlue {
          0%, 100% {
            box-shadow:
              0 0 15px rgba(153, 204, 242, 0.25),
              inset 0 0 10px rgba(153, 204, 242, 0.12);
          }
          50% {
            box-shadow:
              0 0 25px rgba(153, 204, 242, 0.45),
              inset 0 0 20px rgba(153, 204, 242, 0.18);
          }
        }
      `}</style>

            <button
              onClick={() => setShowInfoModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="text-center mb-4">
              <div
                className="inline-block p-2 rounded-full mb-2"
                style={{
                  background: "rgba(153, 204, 242, 0.16)",
                  border: "1px solid rgba(153, 204, 242, 0.5)",
                  boxShadow: "0 0 18px rgba(153, 204, 242, 0.35)",
                }}
              >
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2
                className="text-2xl font-light mb-6"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  color: "white",
                }}
              >
                How to Interact
              </h2>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p
                  className="text-xs leading-relaxed opacity-80 text-center"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  <span className="font-semibold">
                    Click, hold and move your cursor
                  </span>{" "}
                  to shift the camera perspective. Use your{" "}
                  <span className="font-semibold">mouse wheel</span> to zoom in
                  or out.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p
                  className="text-xs leading-relaxed opacity-80 text-center"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  The{" "}
                  <span className="font-semibold">intensity slider</span> maps
                  each emotion&apos;s min→max ranges for speed, complexity,
                  scale, particles and noise characteristics.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <p
                  className="text-xs leading-relaxed opacity-80 text-center"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  <span className="font-semibold">Select emotions</span> on the
                  left to experience different states, each with unique visual
                  and sonic properties.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowInfoModal(false);
                setShowAboutModal(true);
              }}
              className="w-full py-4 px-6 rounded-xl font-semibold uppercase tracking-widest text-sm transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
              style={{
                background:
                  "linear-gradient(135deg, rgba(153, 204, 242, 0.25), rgba(153, 204, 242, 0.35))",
                border: "2px solid rgba(153, 204, 242, 0.65)",
                color: "white",
                fontFamily: "'Space Grotesk', sans-serif",
                animation: "pulseGlowBlue 3s ease-in-out infinite",
              }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              About This Project
            </button>
          </div>
        </div>
      )}

      {showAboutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="relative max-w-3xl w-full rounded-3xl p-8 md:p-12 backdrop-blur-xl max-h-[90vh] overflow-y-auto"
            style={{
              background: "rgba(15, 15, 25, 0.92)",
              border: "2px solid transparent",
              backgroundClip: "padding-box",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
        @keyframes borderGlow {
          0%, 100% {
            box-shadow:
              0 0 30px rgba(153, 204, 242, 0.45),
              inset 0 0 30px rgba(153, 204, 242, 0.12);
          }
          50% {
            box-shadow:
              0 0 50px rgba(153, 204, 242, 0.75),
              inset 0 0 50px rgba(153, 204, 242, 0.20);
          }
        }

        @keyframes pulseGlowBlue {
          0%, 100% {
            box-shadow:
              0 0 15px rgba(153, 204, 242, 0.25),
              inset 0 0 10px rgba(153, 204, 242, 0.12);
          }
          50% {
            box-shadow:
              0 0 25px rgba(153, 204, 242, 0.45),
              inset 0 0 20px rgba(153, 204, 242, 0.18);
          }
        }

        .headline-orb-wrapper {
          position: relative;
          display: inline-block;
        }

        .headline-particle {
          position: absolute;
          border-radius: 9999px;
          background: radial-gradient(circle, rgba(153, 204, 242, 1) 0%, rgba(153, 204, 242, 0) 70%);
          opacity: 0.8;
          filter: blur(0.5px);
          pointer-events: none;
        }

        .headline-particle.p1 {
          width: 10px;
          height: 10px;
          top: -8px;
          left: -40px;
          animation: floatParticle1 6s ease-in-out infinite;
        }

        .headline-particle.p2 {
          width: 8px;
          height: 8px;
          top: -14px;
          right: -30px;
          animation: floatParticle2 7s ease-in-out infinite;
        }

        .headline-particle.p3 {
          width: 6px;
          height: 6px;
          bottom: -10px;
          left: 10%;
          animation: floatParticle3 5.5s ease-in-out infinite;
        }

        @keyframes floatParticle1 {
          0% {
            transform: translate3d(-10px, 8px, 0) scale(0.9);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          60% {
            transform: translate3d(6px, -4px, 0) scale(1.05);
            opacity: 0.9;
          }
          100% {
            transform: translate3d(18px, -10px, 0) scale(0.8);
            opacity: 0;
          }
        }

        @keyframes floatParticle2 {
          0% {
            transform: translate3d(8px, -4px, 0) scale(0.8);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          55% {
            transform: translate3d(-4px, 6px, 0) scale(1);
            opacity: 0.85;
          }
          100% {
            transform: translate3d(-14px, 10px, 0) scale(0.7);
            opacity: 0;
          }
        }

        @keyframes floatParticle3 {
          0% {
            transform: translate3d(-4px, 6px, 0) scale(0.7);
            opacity: 0;
          }
          30% {
            opacity: 1;
          }
          65% {
            transform: translate3d(6px, -2px, 0) scale(1);
            opacity: 0.9;
          }
          100% {
            transform: translate3d(14px, -6px, 0) scale(0.75);
            opacity: 0;
          }
        }
      `}</style>

            <button
              onClick={() => setShowAboutModal(false)}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all z-10"
            >
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="text-center mb-10">
              <div className="headline-orb-wrapper mb-3">
                <h1
                  className="text-5xl font-light"
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    color: "white",
                    letterSpacing: "0.02em",
                    textShadow: `
          0 0 16px rgba(153, 204, 242, 0.95),
          0 0 32px rgba(153, 204, 242, 0.75),
          0 0 48px rgba(153, 204, 242, 0.55)
        `,
                  }}
                >
                  Emotional Orbs
                </h1>

                <span className="headline-particle p1"></span>
                <span className="headline-particle p2"></span>
                <span className="headline-particle p3"></span>
              </div>

              <p
                className="text-lg opacity-70"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  color: "white",
                  letterSpacing: "0.1em",
                }}
              >
                AN INTERACTIVE AUDIO-VISUAL EXPERIENCE
              </p>
            </div>


            <div className="space-y-8">
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <svg
                    className="w-6 h-6 text-blue-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>

                  <h2
                    className="text-2xl font-light"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: "white",
                    }}
                  >
                    The Vision
                  </h2>
                </div>

                <p
                  className="text-base leading-relaxed opacity-90 mb-4"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  Emotional Orbs is an experimental web experience that
                  translates internal emotional states into dynamic, generative
                  3D art. This project explores the intersection of somatic
                  design, data visualization, and interactive media —
                  questioning how digital interfaces can reflect and respond to
                  human emotion in real-time.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <svg
                    className="w-6 h-6 text-purple-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>

                  <h2
                    className="text-2xl font-light"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: "white",
                    }}
                  >
                    Concept & Intention
                  </h2>
                </div>

                <p
                  className="text-base leading-relaxed opacity-90 mb-4"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  We experience emotions not as static labels, but as fluid,
                  shifting states of being. This project challenges the
                  traditional notion of UI as purely functional, instead
                  treating it as a meta-interface — where visual patterns
                  themselves become the language of interaction.
                </p>

                <p
                  className="text-sm leading-relaxed opacity-80 mb-3"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  Each emotional state (Calm, Tension, Clarity, Chaos) is
                  represented through:
                </p>

                <ul className="space-y-2 mb-4">
                  <li
                    className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                    style={{ alignItems: "baseline" }}
                  >
                    <span className="text-blue-300 text-base leading-none flex-shrink-0">
                      ●
                    </span>
                    <span
                      className="text-sm opacity-90 leading-tight"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: "white",
                      }}
                    >
                      Generative 3D orbs that deform and pulse in real-time
                    </span>
                  </li>
                  <li
                    className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                    style={{ alignItems: "baseline" }}
                  >
                    <span className="text-purple-300 text-base leading-none flex-shrink-0">
                      ●
                    </span>
                    <span
                      className="text-sm opacity-90 leading-tight"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: "white",
                      }}
                    >
                      Emotion-specific soundtracks composed for this project,
                      tightly interwoven with the visual experience
                    </span>
                  </li>
                  <li
                    className="flex gap-3 p-3 rounded-lg bg-white/5 border border-white/10"
                    style={{ alignItems: "baseline" }}
                  >
                    <span className="text-pink-300 text-base leading-none flex-shrink-0">
                      ●
                    </span>
                    <span
                      className="text-sm opacity-90 leading-tight"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: "white",
                      }}
                    >
                      Intensity control that lets users modulate both visual
                      complexity and sonic depth
                    </span>
                  </li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-3 mb-4">
                  <svg
                    className="w-6 h-6 text-teal-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
                    />
                  </svg>

                  <h2
                    className="text-2xl font-light"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: "white",
                    }}
                  >
                    Technical Approach
                  </h2>
                </div>

                <p
                  className="text-base leading-relaxed opacity-90 mb-4"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  Built with React, Three.js and WebGL shaders, the experience
                  runs entirely in the browser. Each emotion has unique
                  algorithmic behaviors:
                </p>

                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-300/20">
                    <h3
                      className="font-semibold mb-2 text-blue-200"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Calm
                    </h3>

                    <p
                      className="text-sm opacity-80"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: "white",
                      }}
                    >
                      Gentle, flowing deformations with subtle warping and
                      smooth wave patterns
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-300/20">
                    <h3
                      className="font-semibold mb-2 text-red-200"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Tension
                    </h3>

                    <p
                      className="text-sm opacity-80"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: "white",
                      }}
                    >
                      Compressed energy with aggressive warping, rapid pulses,
                      and sharp wave frequencies
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-white/10 to-gray-200/10 border border-white/20">
                    <h3
                      className="font-semibold mb-2 text-white"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Clarity
                    </h3>

                    <p
                      className="text-sm opacity-80"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: "white",
                      }}
                    >
                      Crystalline ridged surfaces with high-frequency detail and
                      pristine geometric precision
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-300/20">
                    <h3
                      className="font-semibold mb-2 text-pink-200"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                      }}
                    >
                      Chaos
                    </h3>

                    <p
                      className="text-sm opacity-80"
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        color: "white",
                      }}
                    >
                      Turbulent multi-layered noise with extreme warping,
                      twisting forces, and unpredictable movement
                    </p>
                  </div>
                </div>

                <p
                  className="text-sm leading-relaxed opacity-80"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  The intensity slider acts as a unified control parameter,
                  simultaneously affecting orb deformation amplitude, animation
                  speed, particle density and glow, and audio track intensity.
                </p>
              </section>

              <section className="border-t border-white/10 pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <svg
                    className="w-6 h-6 text-pink-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>

                  <h2
                    className="text-2xl font-light"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color: "white",
                    }}
                  >
                    Why This Matters
                  </h2>
                </div>

                <p
                  className="text-base leading-relaxed opacity-90 mb-4"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  In an era of flat, grid-based interfaces, Emotional Orbs asks:
                  <span className="italic font-semibold">
                    {" "}
                    What if our digital tools could breathe with us?{" "}
                  </span>
                  This project is both a UX experiment and a creative statement
                  — demonstrating how generative systems can create deeply
                  personal, responsive experiences.
                </p>

                <p
                  className="text-sm leading-relaxed opacity-80 mb-3"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  For brands and studios interested in pushing the boundaries of
                  digital storytelling, experiential design, or music
                  visualization, this project highlights:
                </p>

                <div className="grid md:grid-cols-2 gap-2 mb-6">
                  {[
                    "Advanced WebGL shader programming",
                    "Real-time generative art systems",
                    "Audio-reactive design",
                    "Emotional design principles applied to interaction",
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
                    >
                      <svg
                        className="w-4 h-4 text-green-300 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 001-1.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>

                      <span
                        className="text-sm opacity-90"
                        style={{
                          fontFamily: "'Space Grotesk', sans-serif",
                          color: "white",
                        }}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-gradient-to-br from-white/5 to-white/10 border border-white/20 rounded-xl p-6">
                <div
                  className="grid md:grid-cols-3 gap-6 text-sm"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  <div>
                    <p className="opacity-60 mb-1 uppercase tracking-wider text-xs">
                      Role
                    </p>
                    <p className="opacity-90">
                      Concept, UX/UI Design, WebGL Development, Visual Design
                    </p>
                  </div>

                  <div>
                    <p className="opacity-60 mb-1 uppercase tracking-wider text-xs">
                      Tech Stack
                    </p>
                    <p className="opacity-90">
                      React, Three.js, GLSL Shaders, layered audio stems
                    </p>
                  </div>

                  <div>
                    <p className="opacity-60 mb-1 uppercase tracking-wider text-xs">
                      Collaboration
                    </p>
                    <p className="opacity-90">
                      Original soundtracks by Diego Caetano Guerra
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <p
                    className="text-xs opacity-60 text-center"
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      color: "white",
                    }}
                  >
                    © 2025 Clarissa Bilke
                  </p>
                </div>
              </section>
            </div>

            <button
              onClick={() => setShowAboutModal(false)}
              className="mt-8 w-full py-3 px-6 rounded-xl font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:scale-105"
              style={{
                background:
                  "linear-gradient(135deg, rgba(153, 204, 242, 0.25), rgba(153, 204, 242, 0.4))",
                border: "2px solid rgba(153, 204, 242, 0.7)",
                color: "white",
                fontFamily: "'Space Grotesk', sans-serif",
                boxShadow:
                  "0 0 24px rgba(153, 204, 242, 0.6), 0 0 4px rgba(255,255,255,0.8)",
                animation: "pulseGlowBlue 3s ease-in-out infinite",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center pointer-events-auto px-4">
          <h1
            className="font-light tracking-wider mb-1 transition-all duration-1000 text-5xl md:text-7xl"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: `rgb(${toRGB(getEffective(currentState, intensity).color)})`,
              textShadow: "0 0 20px rgba(255,255,255,0.3)",
              transform:
                currentState === "chaos"
                  ? "skew(-2deg)"
                  : currentState === "tension"
                    ? "scaleY(1.2)"
                    : "none",
              letterSpacing:
                currentState === "clarity"
                  ? "0.3em"
                  : currentState === "calm"
                    ? "0.1em"
                    : "0.05em",
            }}
          >
            {emotionStates[currentState].title}
          </h1>

          <p
            key={currentState}
            className="subtitle-text font-bold uppercase opacity-80 mx-auto text-xs md:text-xl tracking-[0.2em] md:tracking-widest whitespace-nowrap"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              color: "#ffffff",
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
                    onClick={() => handleEmotionChange(state)}
                    className="group relative rounded-xl md:rounded-2xl transition-all duration-300 hover:scale-105 px-5 py-2.5 md:px-6 md:py-3"
                    style={{
                      background: isActive
                        ? `rgba(${cStr}, 0.16)`
                        : "rgba(255,255,255,0.05)",
                      border: isActive
                        ? `2px solid rgba(${cStr}, 0.55)`
                        : "2px solid rgba(255,255,255,0.12)",
                      boxShadow: isActive
                        ? `0 10px 30px rgba(${cStr}, 0.35), inset 0 1px 0 rgba(255,255,255,0.12)`
                        : "0 0 0 rgba(0,0,0,0)",
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
                        color: isActive
                          ? "white"
                          : "rgba(255,255,255,0.7)",
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

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[calc(100vw-2.5rem)] md:max-w-96 px-4 md:px-0 pointer-events-auto">
          <div className="backdrop-blur-sm bg-white/5 rounded-full px-4 py-2.5 border border-white/10 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-center mb-0.1 flex items-center justify-center">
                <span
                  className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-70"
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: "white",
                  }}
                >
                  Intensity
                </span>
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
                  background: `linear-gradient(to right, rgba(${toRGB(
                    getEffective(currentState, intensity).color
                  )}, 0.18) 0%, rgba(${toRGB(
                    getEffective(currentState, intensity).color
                  )}, 0.9) 100%)`,
                }}
              />
            </div>

            <div className="md:hidden flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowInfoModal(true)}
                className="w-11 h-11 flex items-center justify-center rounded-full transition-all hover:scale-110 focus:outline-none focus-visible:outline-none"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                }}
              >
                <svg
                  className="w-4 h-4 text-white opacity-80"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </button>

              <button
                onClick={toggleSound}
                className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
                style={soundButtonStyle}
              >
                {soundEnabled ? (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-white opacity-70"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 z-40 hidden md:flex items-center gap-3">
        <button
          onClick={() => setShowInfoModal(true)}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: `2px solid rgba(${toRGB(uiColor)}, 0.5)`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <svg
            className="w-6 h-6 text-white opacity-85"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </button>

        <button
          onClick={toggleSound}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110"
          style={soundButtonStyle}
        >
          {soundEnabled ? (
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 text-white opacity-70"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          )}
        </button>
      </div>

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
    </div>
  );
};

export default EmotionalOrbs;