import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const EmotionalFractals = () => {
  const canvasRef = useRef(null);
  const [currentState, setCurrentState] = useState('calm');
  const [intensity, setIntensity] = useState(0.5);

  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const fractalRef = useRef(null);
  const particlesRef = useRef(null);
  const particleCountRef = useRef(0);
  const mouseRef = useRef({ x: 0, y: 0 });

  // ====== EINSTELLUNGEN: Partikel-Größe & -Transparenz ======
  const PARTICLE_SIZE_BASE = 0.022;
  const PARTICLE_SIZE_VAR  = 0.020;
  const PARTICLE_OPACITY_BASE = 0.52;
  const PARTICLE_OPACITY_VAR  = 0.22;

  // ====== NEU: Zwei Partikelfarben pro Emotion ======
  // (hier frei anpassen; Hex, rgb oder THREE.Color möglich)
  const particleColors = {
    calm:   { a: new THREE.Color('#9fdcff'), b: new THREE.Color('#c4ffe7') },
    tension:{ a: new THREE.Color('#ff6868'), b: new THREE.Color('#ffb3a1') },
    clarity:{ a: new THREE.Color('#ffffff'), b: new THREE.Color('#cbd7ff') },
    chaos:  { a: new THREE.Color('#ff6fff'), b: new THREE.Color('#ad93ff') },
  };

  // kleine Helpers
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const toRGB = (c) =>
    `${Math.round(c.r * 255)}, ${Math.round(c.g * 255)}, ${Math.round(c.b * 255)}`;

  // --- Deine Ranges unverändert ---
  const emotionStates = {
    calm: {
      color: new THREE.Color(0.60, 0.80, 0.95),
      title: 'Calm',
      subtitle: 'breathe in serenity',

      speed: { min: 0.0004, max: 0.0010 },
      complexity: { min: 3, max: 4 },
      scale: { min: 0.9, max: 1.2 },
      particles: { min: 600, max: 1000 },
      noiseScale: { min: 0.8, max: 1.0 },
      noiseSpeed: { min: 0.2, max: 0.4 },
      sharpness: { min: 0.1, max: 0.2 },
      waviness: { min: 2.0, max: 2.5 },
      shaderIntensityMul: { min: 0.25, max: 0.35 },
      cpuDeformBase: { min: 0.05, max: 0.055 },
      cpuDeformVar: { min: 0.04, max: 0.0 },
    },
    tension: {
      color: new THREE.Color(0.95, 0.30, 0.40),
      title: 'Tension',
      subtitle: 'energy compressed',

      speed: { min: 0.0012, max: 0.0022 },
      complexity: { min: 3.3, max: 4.6 },
      scale: { min: 1.0, max: 1.2 },
      particles: { min: 900, max: 1500 },
      noiseScale: { min: 1.5, max: 1.5 },
      noiseSpeed: { min: 0.6, max: 1.5 },
      sharpness: { min: 0.4, max: 0.5 },
      waviness: { min: 0.1, max: 0.5 },
      shaderIntensityMul: { min: 0.45, max: 0.4 },
      cpuDeformBase: { min: 0.2, max: 0.4 },
      cpuDeformVar: { min: 0.06, max: 0.3 },
    },
    clarity: {
      color: new THREE.Color(0.95, 0.95, 1.00),
      title: 'Clarity',
      subtitle: 'crystallized thought',

      speed: { min: 0.0006, max: 0.0010 },
      complexity: { min: 3, max: 4  },
      scale: { min: 0.75, max: 0.8 },
      particles: { min: 500, max: 900 },
      noiseScale: { min: 4.5, max: 5.0 },
      noiseSpeed: { min: 0.4, max: 0.7 },
      sharpness: { min: 4.0, max: 5.0 },
      waviness: { min: 0.1, max: 0.2 },
      shaderIntensityMul: { min: 0.25, max: 0.35 },
      cpuDeformBase: { min: 0.1, max: 0.1 },
      cpuDeformVar: { min: 0.2, max: 0.2 },
    },
    chaos: {
      color: new THREE.Color(0.80, 0.50, 0.90),
      title: 'Chaos',
      subtitle: 'beautiful disorder',

      speed: { min: 0.0020, max: 0.0030 },
      complexity: { min: 6, max: 8 },
      scale: { min: 1.1, max: 1.4 },
      particles: { min: 1600, max: 2400 },
      noiseScale: { min: 3.0, max: 5.0 },
      noiseSpeed: { min: 1.4, max: 2.0 },
      sharpness: { min: 0.4, max: 0.6 },
      waviness: { min: 0.15, max: 5.0 },
      shaderIntensityMul: { min: 0.25, max: 0.3 },
      cpuDeformBase: { min: 0.02, max: 0.3},
      cpuDeformVar: { min: 0.02, max: 0.3 },
    },
  };

  // mappt Slider (intensity) → effektive Werte pro Emotion
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

      speed: eff('speed'),
      complexity: clamp(Math.round(eff('complexity')), 1, 10),
      scale: eff('scale'),
      particles: eff('particles', true),

      noiseScale: eff('noiseScale'),
      noiseSpeed: eff('noiseSpeed'),
      sharpness: eff('sharpness'),
      waviness: eff('waviness'),

      shaderIntensityMul: eff('shaderIntensityMul'),
      cpuDeformBase: eff('cpuDeformBase'),
      cpuDeformVar: eff('cpuDeformVar'),
    };
  };

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

    // ======= SHADERS =======
    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      uniform float time;
      uniform float intensity;

      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
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
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
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

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;

        vec3 pos = position;

        float timeScale = time * 1.2;
        float noise1 = fbm(normal * 1.2 + vec3(timeScale * 0.6));
        float noise2 = fbm(normal * 2.2 + vec3(timeScale * 0.9 + 100.0));
        float noise3 = snoise(normal * 3.5 + vec3(timeScale * 1.4 + 200.0));

        float combinedNoise = noise1 * 0.7 + noise2 * 0.4 + noise3 * 0.2;

        float deformAmount = 0.15 + intensity * 1.35;

        float pulse = sin(timeScale * 2.0) * 0.5 + 0.5;
        float pulseFactor = 1.0 + (pulse * 0.5 * intensity);

        pos += normal * combinedNoise * deformAmount * pulseFactor;

        float wave = sin(pos.x * 4.0 + timeScale * 3.0) *
                     cos(pos.y * 4.0 + timeScale * 2.5) *
                     sin(pos.z * 3.5 + timeScale * 2.0) *
                     (0.08 + intensity * 0.25);
        pos += normal * wave;

        float twist = sin(pos.y * 3.0 + timeScale) * cos(pos.x * 3.0 - timeScale) *
                      (0.05 + intensity * 0.15);
        vec3 twisted = vec3(
          pos.x + twist * normal.x,
          pos.y + twist * normal.y,
          pos.z + twist * normal.z
        );
        pos = mix(pos, twisted, intensity * 0.6);

        vNormal = normalize(normalMatrix * (normal + combinedNoise * deformAmount * 0.5));
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

    const orbMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        time: { value: 0 },
        color: { value: emotionStates[currentState].color.clone() },
        intensity: { value: intensity },
        glowLimiter: { value: 1.0 },
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

    // === Partikel Texture ===
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

    // === NEU: Partikel mit zwei Farben (per-vertex colors) ===
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
        color: 0xffffff,                 // VertexColors bleiben unverändert
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

    // Start-Partikel (nimmt die 2 Farben der aktuellen Emotion)
    const eff0 = getEffective(currentState, intensity);
    const particles = createParticles(eff0.particles, particleColors[currentState]);
    scene.add(particles);
    particlesRef.current = particles;

    // ====== CPU Noise ======
    const noise3D = (x, y, z) => {
      const p = [x, y, z];
      const floor = (v) => [Math.floor(v[0]), Math.floor(v[1]), Math.floor(v[2])];
      const fract = (v) => [v[0] - Math.floor(v[0]), v[1] - Math.floor(v[1]), v[2] - Math.floor(v[2])];
      const i = floor(p);
      const f = fract(p);
      const u = [f[0]*f[0]*(3-2*f[0]), f[1]*f[1]*(3-2*f[1]), f[2]*f[2]*(3-2*f[2])];
      const hash = (p) => {
        const h = Math.sin(p[0]*127.1 + p[1]*311.7 + p[2]*74.7) * 43758.5453;
        return h - Math.floor(h);
      };
      const mix = (a, b, t) => a * (1 - t) + b * t;
      return (
        mix(
          mix(mix(hash([i[0], i[1], i[2]]), hash([i[0] + 1, i[1], i[2]]), u[0]),
              mix(hash([i[0], i[1] + 1, i[2]]), hash([i[0] + 1, i[1] + 1, i[2]]), u[0]),
              u[1]),
          mix(mix(hash([i[0], i[1], i[2] + 1]), hash([i[0] + 1, i[1], i[2] + 1]), u[0]),
              mix(hash([i[0], i[1] + 1, i[2] + 1]), hash([i[0] + 1, i[1] + 1, i[2] + 1]), u[0]),
              u[1]),
          u[2]
        ) * 2 - 1
      );
    };

    const fbmNoise = (x, y, z, octaves = 4) => {
      let value = 0;
      let amplitude = 1;
      let frequency = 1;
      for (let i = 0; i < octaves; i++) {
        value += amplitude * noise3D(x * frequency, y * frequency, z * frequency);
        frequency *= 2.1;
        amplitude *= 0.5;
      }
      return value;
    };

    // Input
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

        for (let i = 0; i < positions.length; i += 3) {
          const x = originalPos[i];
          const y = originalPos[i + 1];
          const z = originalPos[i + 2];

          const len = Math.sqrt(x * x + y * y + z * z);
          const nx = x / len;
          const ny = y / len;
          const nz = z / len;

          const t = time * 0.001 * noiseSpeed;

          const noise1 = fbmNoise(
            nx * noiseScale * 0.8 + t * 0.5,
            ny * noiseScale * 0.8 + t * 0.5,
            nz * noiseScale * 0.8 + t * 0.5,
            Math.max(2, octaves - 1)
          );
          const noise2 = fbmNoise(
            nx * noiseScale * 1.2 + t * 0.8,
            ny * noiseScale * 1.2 + t * 0.8,
            nz * noiseScale * 1.2 + t * 0.8,
            Math.max(1, octaves - 2)
          );

          const combinedNoise =
            noise1 * (1 - sharpness * 0.5) +
            noise2 * sharpness +
            Math.pow(Math.abs(noise1), 1 + sharpness * 2) *
              Math.sign(noise1) *
              sharpness *
              0.3;

          const pulse = Math.sin(t * 2000.0) * 0.5 + 0.5;
          const pulseFactor = 1 + pulse * 0.08 * intensity;

          const waveAmount = waviness * (0.02 + intensity * 0.04);
          const wave =
            Math.sin(x * 3 + t * 2500) *
            Math.cos(y * 3 + t * 2000) *
            Math.sin(z * 2.5 + t * 1800) *
            waveAmount;

          const displacement = (combinedNoise * baseDeform * pulseFactor + wave) * len;

          positions[i] = x + nx * displacement;
          positions[i + 1] = y + ny * displacement;
          positions[i + 2] = z + nz * displacement;
        }

        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        const targetScale = eff.scale;
        fractalRef.current.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.12
        );
      }

      // Partikel
      if (particlesRef.current) {
        const desired = getEffective(currentState, intensity).particles;

        // Neu erzeugen, wenn Anzahl stark abweicht
        if (Math.abs(desired - particleCountRef.current) > 50) {
          sceneRef.current.remove(particlesRef.current);
          particlesRef.current.geometry.dispose();
          particlesRef.current.material.dispose();

          const repl = createParticles(desired, particleColors[currentState]);
          sceneRef.current.add(repl);
          particlesRef.current = repl;
        }

        // Größe/Opacity dynamisch
        const pm = particlesRef.current.material;
        particlesRef.current.rotation.y = time * 0.1;
        pm.size = PARTICLE_SIZE_BASE + intensity * PARTICLE_SIZE_VAR;
        pm.opacity = clamp(PARTICLE_OPACITY_BASE + intensity * PARTICLE_OPACITY_VAR, 0, 1);

        // leichte Aufwärtsbewegung
        const arr = particlesRef.current.geometry.attributes.position.array;
        for (let i = 0; i < arr.length; i += 3) {
          arr[i + 1] += Math.sin(time + arr[i]) * (0.0008 + intensity * 0.0008);
          if (arr[i + 1] > 5) arr[i + 1] = -5;
          if (arr[i + 1] < -5) arr[i + 1] = 5;
        }
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Kamera
      camera.position.x += (mouseRef.current.x * 0.5 - camera.position.x) * 0.05;
      camera.position.y += (mouseRef.current.y * 0.5 - camera.position.y) * 0.05;
      camera.lookAt(scene.position);

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

  // Emotions-Wechsel: Farbe weich und Partikel sofort anpassen
  useEffect(() => {
    if (!fractalRef.current || !sceneRef.current) return;

    const eff = getEffective(currentState, intensity);

    // Shader-Farbe smooth
    fractalRef.current.material.uniforms.color.value.lerp(eff.color, 0.2);

    // Partikel neu erstellen (mit 2 Farben der aktuellen Emotion)
    if (particlesRef.current) {
      sceneRef.current.remove(particlesRef.current);
      particlesRef.current.geometry.dispose();
      particlesRef.current.material.dispose();
    }

    const geometryCount = eff.particles;

    // lokale Rekonstruktion mit zwei Farben
    const createParticlesLocal = (count, colorsObj) => {
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
        map: (function () {
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

      const pts = new THREE.Points(geometry, mat);
      particleCountRef.current = count;
      return pts;
    };

    const pts = createParticlesLocal(geometryCount, particleColors[currentState]);
    sceneRef.current.add(pts);
    particlesRef.current = pts;
  }, [currentState]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Range CSS: dünner Track & kleiner Thumb */}
      <style>{`
        .ef-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .ef-range::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 9999px;
          background: transparent;
        }
        .ef-range::-moz-range-track {
          height: 4px;
          border-radius: 9999px;
          background: transparent;
        }
        .ef-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px; height: 12px; border-radius: 9999px;
          background: #ffffff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.15);
          margin-top: -4px;
          cursor: pointer;
        }
        .ef-range::-moz-range-thumb {
          width: 12px; height: 12px; border-radius: 9999px;
          background: #ffffff;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.15);
          cursor: pointer;
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-12 left-1/2 -translate-x-1/2 text-center pointer-events-auto">
          <h1
            className="text-7xl font-light tracking-wider mb-2 transition-all duration-1000"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              color: `rgb(${toRGB(getEffective(currentState, intensity).color)})`,
              textShadow: '0 0 20px rgba(255,255,255,0.3)',
              transform:
                currentState === 'chaos'
                  ? 'skew(-2deg)'
                  : currentState === 'tension'
                  ? 'scaleY(1.2)'
                  : 'none',
              letterSpacing:
                currentState === 'clarity'
                  ? '0.3em'
                  : currentState === 'calm'
                  ? '0.1em'
                  : '0.05em',
            }}
          >
            {emotionStates[currentState].title}
          </h1>
          <p
            className="text-xl font-bold tracking-widest uppercase opacity-80"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#ffffff' }}
          >
            {emotionStates[currentState].subtitle}
          </p>
        </div>

        <div className="absolute top-1/2 left-8 -translate-y-1/2 pointer-events-auto">
          <div className="p-2">
            <div className="flex flex-col gap-4">
              {Object.keys(emotionStates).map((state) => {
                const c = emotionStates[state].color;
                const isActive = currentState === state;
                const cStr = toRGB(c);
                return (
                  <button
                    key={state}
                    onClick={() => setCurrentState(state)}
                    className="group relative px-6 py-3 rounded-2xl transition-all duration-300 hover:scale-105"
                    style={{
                      background: isActive ? `rgba(${cStr}, 0.16)` : 'rgba(255,255,255,0.05)',
                      border: isActive
                        ? `2px solid rgba(${cStr}, 0.55)`
                        : '2px solid rgba(255,255,255,0.12)',
                      boxShadow: isActive
                        ? `0 10px 30px rgba(${cStr}, 0.35), inset 0 1px 0 rgba(255,255,255,0.12)`
                        : `0 0 0 rgba(0,0,0,0)`,
                    }}
                  >
                    <div
                      className="absolute -left-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: `rgb(${toRGB(c)})`,
                        boxShadow: `0 0 10px rgba(${toRGB(c)},0.9)`,
                      }}
                    />
                    <span
                      className="text-sm font-semibold uppercase tracking-wider"
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

        {/* SLIDER */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-96 pointer-events-auto">
          <div className="backdrop-blur-sm bg-white/5 rounded-full px-4 py-2.5 border border-white/10">
            <div className="text-center mb-2">
              <span
                className="text-xs font-bold uppercase tracking-widest opacity-70"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: 'white' }}
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
              className="ef-range w-full h-1 rounded-full appearance-none cursor-pointer outline-none"
              style={{
                background: `linear-gradient(to right,
                  rgba(${toRGB(emotionStates[currentState].color)}, 0.18) 0%,
                  rgba(${toRGB(emotionStates[currentState].color)}, 0.9) 100%)`,
              }}
            />
          </div>
        </div>

        <div className="absolute bottom-8 right-8 pointer-events-auto">
          <div className="backdrop-blur-md bg-white/10 rounded-2xl p-4 border border-white/20 max-w-xs">
            <p
              className="text-xs leading-relaxed opacity-80"
              style={{ fontFamily: "'Cormorant Garamond', serif", color: 'white' }}
            >
              Move your cursor to shift perspective. The slider maps each emotion’s min→max ranges
              for speed, complexity, scale, particles and noise characteristics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionalFractals;
