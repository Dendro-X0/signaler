"use client"

import React from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, Brain, Smartphone, Search, Accessibility, Zap } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const FEATURES = [
    {
        title: "Performance",
        description: "Deep analysis of Core Web Vitals (LCP, CLS, INP) with simulated throttling. Verify real-world user experience before deploying.",
        icon: Zap,
        color: "blue",
        bg: "bg-blue-100 dark:bg-blue-900/20",
        text: "text-blue-600 dark:text-blue-400",
        glow: "hover:shadow-blue-500/20 dark:hover:shadow-blue-500/10"
    },
    {
        title: "Accessibility",
        description: "Ensure WCAG 2.1/2.2 compliance with integrated axe-core engine. Catch contrast issues, missing labels, and ARIA errors early.",
        icon: Accessibility,
        color: "purple",
        bg: "bg-purple-100 dark:bg-purple-900/20",
        text: "text-purple-600 dark:text-purple-400",
        glow: "hover:shadow-purple-500/20 dark:hover:shadow-purple-500/10"
    },
    {
        title: "Security",
        description: "Audit against OWASP Top 10 vulnerabilities. Verify security headers, cookie attributes, and best practices for a safer web.",
        icon: ShieldCheck,
        color: "red",
        bg: "bg-red-100 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
        glow: "hover:shadow-red-500/20 dark:hover:shadow-red-500/10"
    },
    {
        title: "AI Insights",
        description: "Get smart, prioritized remediation suggestions powered by LLMs. Reduce token usage by 95% with optimized reports.",
        icon: Brain,
        color: "emerald",
        bg: "bg-emerald-100 dark:bg-emerald-900/20",
        text: "text-emerald-600 dark:text-emerald-400",
        glow: "hover:shadow-emerald-500/20 dark:hover:shadow-emerald-500/10"
    },
    {
        title: "SEO Optimization",
        description: "Validate meta tags, structured data, canonical URLs, and heading hierarchy to maximize search engine visibility.",
        icon: Search,
        color: "orange",
        bg: "bg-orange-100 dark:bg-orange-900/20",
        text: "text-orange-600 dark:text-orange-400",
        glow: "hover:shadow-orange-500/20 dark:hover:shadow-orange-500/10"
    },
    {
        title: "Mobile UX",
        description: "Ensure touch targets are sized correctly and viewports are configured for responsive design across all devices.",
        icon: Smartphone,
        color: "cyan",
        bg: "bg-cyan-100 dark:bg-cyan-900/20",
        text: "text-cyan-600 dark:text-cyan-400",
        glow: "hover:shadow-cyan-500/20 dark:hover:shadow-cyan-500/10"
    }
]

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.3
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20, rotateX: -15 },
    visible: {
        opacity: 1,
        y: 0,
        rotateX: 0,
        transition: {
            type: "spring" as const,
            stiffness: 100,
            damping: 12
        }
    }
}

export function SignalerFeatures() {
    return (
        <section className="py-20 px-4">
            <div className="text-center mb-16">
                <h2 className="text-4xl font-bold mb-6">Complete Web Quality Platform</h2>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Signaler combines industry-standard tools with AI insights to give you a 360° view of your web application's health.
                </p>
            </div>

            <motion.div
                className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
            >
                {FEATURES.map((feature) => (
                    <motion.div
                        key={feature.title}
                        variants={itemVariants}
                        whileHover={{
                            scale: 1.03,
                            y: -5,
                            transition: { duration: 0.2 }
                        }}
                        className="h-full"
                    >
                        <Card className={cn(
                            "h-full border border-transparent shadow-lg dark:bg-gray-900/40 backdrop-blur-sm transition-all duration-300 group overflow-hidden",
                            feature.glow
                        )}>
                            <CardHeader className="pb-4">
                                <div className={cn(
                                    "w-14 h-14 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500",
                                    feature.bg,
                                    feature.text
                                )}>
                                    <feature.icon className="h-7 w-7" />
                                </div>
                                <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                                <CardDescription className="text-base leading-relaxed text-muted-foreground group-hover:text-foreground transition-colors">
                                    {feature.description}
                                </CardDescription>
                            </CardHeader>
                            {/* Suble glow effect at the bottom */}
                            <div className={cn(
                                "absolute bottom-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity blur-sm translate-y-1",
                                feature.bg
                            )} />
                        </Card>
                    </motion.div>
                ))}
            </motion.div>
        </section>
    )
}
