'use client';

import React, { useRef, useEffect, memo } from 'react';
import * as THREE from 'three';
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// ═══ Color Themes ═══
const THEMES: Record<string, {
    frontColor: number;
    frontSpecular: number;
    sideColor: number;
    subFrontColor: number;
    subSpecular: number;
    subSideColor: number;
    bgColor: number;
}> = {
    purple: {
        frontColor: 0x8A2BE2,
        frontSpecular: 0xffffff,
        sideColor: 0x050505,
        subFrontColor: 0x440000,
        subSpecular: 0xff0000,
        subSideColor: 0x220000,
        bgColor: 0x020202,
    },
    gold: {
        frontColor: 0xDAA520,
        frontSpecular: 0xFFD700,
        sideColor: 0x1a1000,
        subFrontColor: 0x8B0000,
        subSpecular: 0xFF4500,
        subSideColor: 0x300000,
        bgColor: 0x030301,
    },
    cyan: {
        frontColor: 0x00CED1,
        frontSpecular: 0x00FFFF,
        sideColor: 0x001515,
        subFrontColor: 0x0000CD,
        subSpecular: 0x4169E1,
        subSideColor: 0x000040,
        bgColor: 0x010505,
    },
    fire: {
        frontColor: 0xFF4500,
        frontSpecular: 0xFFFF00,
        sideColor: 0x200800,
        subFrontColor: 0x8B0000,
        subSpecular: 0xFF0000,
        subSideColor: 0x200000,
        bgColor: 0x050100,
    },
    emerald: {
        frontColor: 0x00C853,
        frontSpecular: 0x69F0AE,
        sideColor: 0x002010,
        subFrontColor: 0x006400,
        subSpecular: 0x00FF7F,
        subSideColor: 0x002200,
        bgColor: 0x010502,
    },
    royal: {
        frontColor: 0x9B30FF,
        frontSpecular: 0xE6E6FA,
        sideColor: 0x0D0020,
        subFrontColor: 0xDAA520,
        subSpecular: 0xFFD700,
        subSideColor: 0x1a1000,
        bgColor: 0x030108,
    },
};

// Cache the font globally so it loads only once
let cachedFont: Font | null = null;
let fontLoadPromise: Promise<Font> | null = null;

function loadFont(): Promise<Font> {
    if (cachedFont) return Promise.resolve(cachedFont);
    if (fontLoadPromise) return fontLoadPromise;
    fontLoadPromise = new Promise((resolve, reject) => {
        const loader = new FontLoader();
        loader.load(
            'https://unpkg.com/three@0.160.0/examples/fonts/helvetiker_bold.typeface.json',
            (font) => { cachedFont = font; resolve(font); },
            undefined,
            reject
        );
    });
    return fontLoadPromise;
}

// ═══ Animation Modes ═══
export const ANIM_MODES = [
    { id: 'oscillate', label: 'Sallanma', icon: '↔️', desc: 'Yatay sallanma (varsayılan)' },
    { id: 'rotate', label: 'Sürekli Dönme', icon: '🔄', desc: 'Y ekseninde sürekli dönüş' },
    { id: 'spin', label: '360° Döndürme', icon: '🌀', desc: 'Tam 360° dönüş' },
    { id: 'bounce', label: 'Zıplama', icon: '⬆️', desc: 'Yukarı-aşağı zıplama' },
    { id: 'wave', label: 'Dalga', icon: '🌊', desc: 'Dalga hareketi' },
    { id: 'float', label: 'Süzülme', icon: '☁️', desc: 'Yavaş yukarı-aşağı süzülme' },
    { id: 'pulse', label: 'Nabız', icon: '💓', desc: 'Büyüme-küçülme efekti' },
    { id: 'tilt', label: 'Yatay Eğilme', icon: '↗️', desc: 'Sağa-sola eğilme' },
] as const;

export type AnimMode = typeof ANIM_MODES[number]['id'];

// ═══ Exported interface for 3D params (used by editor) ═══
export interface ThreeDParams {
    rotationY: number;
    rotationX: number;
    animSpeed: number;
    textDepth: number;
    bevelThickness: number;
    bevelSize: number;
    lightIntensity: number;
    lightX: number;
    lightY: number;
    cameraZ: number;
    shininess: number;
    animMode: AnimMode;
}

export const DEFAULT_3D_PARAMS: ThreeDParams = {
    rotationY: 0.35,
    rotationX: 0.1,
    animSpeed: 0.0015,
    textDepth: 0.8,
    bevelThickness: 0.4,
    bevelSize: 0.2,
    lightIntensity: 1.2,
    lightX: 5,
    lightY: 10,
    cameraZ: 22,
    shininess: 100,
    animMode: 'oscillate',
};

// Serialize 3D params to a compact string for storage
export function serialize3DParams(p: ThreeDParams): string {
    return [p.rotationY, p.rotationX, p.animSpeed, p.textDepth, p.bevelThickness,
    p.bevelSize, p.lightIntensity, p.lightX, p.lightY, p.cameraZ, p.shininess,
    p.animMode].join(',');
}

// Deserialize 3D params from a compact string
export function deserialize3DParams(s: string): ThreeDParams {
    const parts = s.split(',');
    const nums = parts.slice(0, 11).map(Number);
    if (nums.length < 11 || nums.some(isNaN)) return { ...DEFAULT_3D_PARAMS };
    const mode = (parts[11] || 'oscillate') as AnimMode;
    return {
        rotationY: nums[0],
        rotationX: nums[1],
        animSpeed: nums[2],
        textDepth: nums[3],
        bevelThickness: nums[4],
        bevelSize: nums[5],
        lightIntensity: nums[6],
        lightX: nums[7],
        lightY: nums[8],
        cameraZ: nums[9],
        shininess: nums[10],
        animMode: mode,
    };
}

interface ThreeDTextBannerProps {
    mainText: string;
    subText?: string;
    theme?: string;
    width?: number;
    height?: number;
    className?: string;
    style?: React.CSSProperties;
    params?: Partial<ThreeDParams>;
}

function ThreeDTextBannerInner({
    mainText,
    subText = '',
    theme = 'purple',
    width = 280,
    height = 60,
    className = '',
    style = {},
    params,
}: ThreeDTextBannerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const animFrameRef = useRef<number>(0);

    // Merge with defaults
    const p: ThreeDParams = { ...DEFAULT_3D_PARAMS, ...params };

    useEffect(() => {
        if (!containerRef.current) return;

        const t = THEMES[theme] || THEMES.purple;

        // Scene
        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        camera.position.z = p.cameraZ;
        camera.position.y = -0.5;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor(0x000000, 0);
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        rendererRef.current = renderer;

        // Clear previous canvas
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }
        containerRef.current.appendChild(renderer.domElement);

        // Lighting
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, p.lightIntensity);
        dirLight.position.set(p.lightX, p.lightY, 30);
        scene.add(dirLight);

        // Materials
        const frontMaterial = new THREE.MeshPhongMaterial({
            color: t.frontColor, specular: t.frontSpecular, shininess: p.shininess
        });
        const sideMaterial = new THREE.MeshPhongMaterial({
            color: t.sideColor, specular: 0x333333, shininess: 10
        });
        const subFrontMat = new THREE.MeshPhongMaterial({
            color: t.subFrontColor, specular: t.subSpecular, shininess: p.shininess + 20
        });
        const subSideMat = new THREE.MeshPhongMaterial({
            color: t.subSideColor, shininess: 30
        });

        const group = new THREE.Group();
        scene.add(group);

        // Load font and create text
        loadFont().then((font) => {
            const mainSize = Math.min(3.5, width / 80);
            const subSize = mainSize * 0.24;

            // Main text
            const mainGeo = new TextGeometry(mainText, {
                font,
                size: mainSize,
                depth: p.textDepth,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: p.bevelThickness,
                bevelSize: p.bevelSize,
                bevelSegments: 4
            });
            mainGeo.computeBoundingBox();
            const mainWidth = mainGeo.boundingBox!.max.x - mainGeo.boundingBox!.min.x;
            mainGeo.center();

            const mainMesh = new THREE.Mesh(mainGeo, [frontMaterial, sideMaterial]);
            group.add(mainMesh);

            // Sub text
            if (subText) {
                const subGeo = new TextGeometry(subText, {
                    font,
                    size: subSize,
                    depth: 0.2,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.05,
                    bevelSize: 0.02,
                    bevelSegments: 3
                });
                subGeo.computeBoundingBox();
                const subWidth = subGeo.boundingBox!.max.x - subGeo.boundingBox!.min.x;
                subGeo.center();

                const subMesh = new THREE.Mesh(subGeo, [subFrontMat, subSideMat]);
                subMesh.position.x = (mainWidth / 2) - (subWidth / 2);
                subMesh.position.y = -2.2;
                subMesh.position.z = 0.5;
                group.add(subMesh);
            }

            // Animation loop — mode-based
            function animate() {
                animFrameRef.current = requestAnimationFrame(animate);
                const time = Date.now() * p.animSpeed;

                switch (p.animMode) {
                    case 'rotate':
                        group.rotation.y = time * p.rotationY;
                        group.rotation.x = Math.sin(time * 0.3) * p.rotationX * 0.5;
                        break;
                    case 'spin':
                        group.rotation.y = time * 2 * p.rotationY;
                        group.rotation.x = p.rotationX * 0.2;
                        break;
                    case 'bounce':
                        group.rotation.y = Math.sin(time) * p.rotationY * 0.3;
                        group.position.y = Math.abs(Math.sin(time * 1.5)) * p.rotationX * 15;
                        group.rotation.x = 0;
                        break;
                    case 'wave':
                        group.rotation.y = Math.sin(time) * p.rotationY;
                        group.rotation.z = Math.sin(time * 0.7) * p.rotationX * 0.8;
                        group.rotation.x = Math.cos(time * 0.5) * p.rotationX * 0.3;
                        break;
                    case 'float':
                        group.position.y = Math.sin(time * 0.5) * p.rotationX * 8;
                        group.rotation.y = Math.sin(time * 0.3) * p.rotationY * 0.4;
                        group.rotation.x = Math.cos(time * 0.2) * p.rotationX * 0.2;
                        break;
                    case 'pulse':
                        const s = 1 + Math.sin(time * 1.2) * p.rotationX * 0.8;
                        group.scale.set(s, s, s);
                        group.rotation.y = Math.sin(time * 0.4) * p.rotationY * 0.3;
                        group.rotation.x = 0;
                        break;
                    case 'tilt':
                        group.rotation.z = Math.sin(time) * p.rotationY * 0.6;
                        group.rotation.y = Math.cos(time * 0.6) * p.rotationX * 2;
                        group.rotation.x = Math.sin(time * 0.4) * p.rotationX * 0.3;
                        break;
                    case 'oscillate':
                    default:
                        group.rotation.y = Math.sin(time) * p.rotationY;
                        group.rotation.x = Math.cos(time * 0.8) * p.rotationX;
                        break;
                }

                renderer.render(scene, camera);
            }
            animate();
        });

        return () => {
            cancelAnimationFrame(animFrameRef.current);
            renderer.dispose();
            scene.clear();
            if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, [mainText, subText, theme, width, height,
        p.rotationY, p.rotationX, p.animSpeed, p.textDepth,
        p.bevelThickness, p.bevelSize, p.lightIntensity, p.lightX,
        p.lightY, p.cameraZ, p.shininess, p.animMode]);

    return (
        <div
            ref={containerRef}
            className={className}
            style={{
                width: `${width}px`,
                height: `${height}px`,
                overflow: 'hidden',
                borderRadius: '0',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
                background: 'transparent',
                ...style,
            }}
        />
    );
}

// Memo to avoid re-renders
export const ThreeDTextBanner = memo(ThreeDTextBannerInner);
