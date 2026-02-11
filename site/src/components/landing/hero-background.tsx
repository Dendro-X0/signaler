"use client"

import React, { useEffect, useState, useMemo } from "react"
import { motion, useScroll, useTransform } from "framer-motion"
import Particles, { initParticlesEngine } from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"
import type { ISourceOptions } from "@tsparticles/engine"

export function HeroBackground() {
    const [init, setInit] = useState(false)
    const { scrollY } = useScroll()

    // Parallax effect for blobs
    const blob1Y = useTransform(scrollY, [0, 500], [0, 100])
    const blob2Y = useTransform(scrollY, [0, 500], [0, -100])

    useEffect(() => {
        console.log("Initializing Particles Engine...")
        initParticlesEngine(async (engine) => {
            await loadSlim(engine)
        }).then(() => {
            console.log("Particles Engine Initialized.")
            setInit(true)
        })
    }, [])

    const options: ISourceOptions = useMemo(
        () => ({
            fpsLimit: 120,
            interactivity: {
                events: {
                    onHover: {
                        enable: true,
                        mode: "grab",
                    },
                },
                modes: {
                    grab: {
                        distance: 140,
                        links: {
                            opacity: 0.5,
                        },
                    },
                },
            },
            particles: {
                color: {
                    value: "#0ea5e9", // cyan-500
                },
                links: {
                    color: "#3b82f6", // blue-500
                    distance: 150,
                    enable: true,
                    opacity: 0.2,
                    width: 1,
                },
                move: {
                    direction: "none",
                    enable: true,
                    outModes: {
                        default: "bounce",
                    },
                    random: true,
                    speed: 0.6,
                    straight: false,
                },
                number: {
                    density: {
                        enable: true,
                    },
                    value: 80,
                },
                opacity: {
                    value: { min: 0.1, max: 0.3 },
                },
                shape: {
                    type: "circle",
                },
                size: {
                    value: { min: 1, max: 3 },
                },
            },
            detectRetina: true,
            fullScreen: {
                enable: false,
            },
        }),
        []
    )

    return (
        <div className="absolute inset-x-0 top-0 z-0 h-[1000px] overflow-hidden pointer-events-none">
            {/* Animated Aurora Blobs */}
            <motion.div
                style={{ y: blob1Y }}
                className="absolute left-1/2 top-[-10%] h-[700px] w-[1200px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-400/50 via-cyan-400/30 to-transparent blur-[120px] dark:from-blue-500/40 dark:via-cyan-600/30"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7],
                }}
                transition={{
                    duration: 12,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            <motion.div
                style={{ y: blob2Y }}
                className="absolute right-[-10%] bottom-[15%] h-[500px] w-[900px] rounded-full bg-gradient-to-tr from-purple-500/30 via-pink-400/15 to-transparent blur-[100px] dark:from-purple-600/35 dark:via-pink-600/20"
                animate={{
                    scale: [1, 1.25, 1],
                    x: [0, 80, 0],
                    opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                    duration: 18,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            />

            {/* Crystal Particles Layer */}
            {init && (
                <Particles
                    id="tsparticles"
                    options={options}
                    className="absolute inset-0 z-0 opacity-70 dark:opacity-85"
                />
            )}

            {/* Bottom transition gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>
    )
}
