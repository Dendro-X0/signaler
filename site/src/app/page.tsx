"use client"

import type React from "react"
import { HomeLayout } from "@/components/layout/home/home-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight, Code, Zap, Star, Rocket, Settings, CheckCircle, Search, ShieldCheck, Smartphone, Brain } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { SignalerQuickStart } from "@/components/landing/signaler-quick-start"
import { SignalerFeatures } from "@/components/landing/signaler-features"
import { DemoSection } from "@/components/landing/demo-section"
import { HeroStartCommand } from "@/components/landing/hero-start"
import { LogoWithBadge } from "@/components/landing/logo-with-badge"
import { HeroBackground } from "@/components/landing/hero-background"
import VERSION from "@/lib/version"

interface LogoProps {
  alt: string
  lightSrc: string
  darkSrc: string
  width: number
  height: number
  className?: string
}

/**
 * Render a brand logo in a fixed bounding box that looks visually consistent
 * across different aspect ratios. Automatically swaps light/dark variants.
 */
const Logo: React.FC<LogoProps> = ({ alt, lightSrc, darkSrc, width, height, className }) => {
  // Prefix with base path so images resolve on GitHub Pages subpaths
  const base: string = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim()
  const light: string = `${base}${lightSrc}`
  const dark: string = `${base}${darkSrc}`
  return (
    <div
      className="relative grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label={alt}
    >
      <Image src={light} alt={alt} fill className="object-contain dark:hidden" sizes={`${width}px`} unoptimized />
      <Image src={dark} alt={alt} fill className="hidden object-contain dark:block" sizes={`${width}px`} unoptimized />
    </div>
  )
}

export default function HomePage() {
  return (
    <HomeLayout>
      <div className="flex flex-col min-h-screen">
        {/* Hero Section */}
        <section className="relative text-center py-20 px-4 overflow-hidden">
          <HeroBackground />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative z-10 max-w-4xl mx-auto"
          >
            <Badge variant="secondary" className="mb-6 text-sm px-4 py-2 border-blue-200 bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800">
              <Star className="w-4 h-4 mr-2 text-yellow-500" />
              Signaler CLI • {VERSION.version}
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-[1.1]">
              Master Your <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">Web Quality</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The AI-powered platform for modern web teams. Audit performance, accessibility, security, and SEO in a single CLI command.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button asChild size="lg" className="h-14 px-8 text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-shadow">
                <Link href="/docs/signaler/getting-started">
                  <Rocket className="mr-2 h-5 w-5" />
                  Get Started
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-8 text-base bg-transparent border-2 hover:bg-accent" asChild>
                <Link href="/docs/signaler/overview">
                  View Documentation
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Prominent one-liner: start */}
            <div className="mb-12">
              <HeroStartCommand />
            </div>
          </motion.div>

          {/* Quick Start Commands */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-10"
          >
            <SignalerQuickStart />
          </motion.div>
        </section>

        {/* Demo Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <DemoSection />
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <SignalerFeatures />
        </motion.div>

        {/* Workflow Steps */}
        <section className="py-20 px-4 bg-muted/30">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-6">How Signaler Works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A simple, powerful workflow designed for developers.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { step: 1, title: "Detect", desc: "Auto-detects your framework (Next.js, Nuxt, SvelteKit) and crawls your routes to build a comprehensive audit plan.", color: "bg-blue-600" },
              { step: 2, title: "Audit", desc: "Runs parallel audits using headless Chrome, checking Core Web Vitals, accessibility compliance, and security headers.", color: "bg-purple-600" },
              { step: 3, title: "Improve", desc: "Generates AI-powered remediation guides and visual reports to help you fix issues faster and prevent regressions.", color: "bg-green-600" }
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2, duration: 0.5 }}
                className="relative p-8 rounded-2xl bg-background border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={cn("absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg", item.color)}>{item.step}</div>
                <h3 className="text-xl font-bold mt-4 mb-3">{item.title}</h3>
                <p className="text-muted-foreground">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Supported Frameworks */}
        <section className="py-20 px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="max-w-5xl mx-auto text-center"
          >
            <h3 className="text-3xl font-bold mb-10 text-muted-foreground/80">Works with your favorite tools</h3>

            <div className="flex items-center justify-center gap-10 flex-wrap opacity-80 hover:opacity-100 transition-opacity">
              <Logo alt="Next.js" lightSrc="/logo/Next.js_wordmark_light.svg" darkSrc="/logo/Next.js_wordmark_dark.svg" width={140} height={40} />
              <Logo alt="Astro" lightSrc="/logo/Astro_light.svg" darkSrc="/logo/Astro_dark.svg" width={140} height={40} />
              <Logo alt="SvelteKit" lightSrc="/logo/svelte.svg" darkSrc="/logo/svelte.svg" width={140} height={40} />
              <Logo alt="Nuxt" lightSrc="/logo/Nuxt_wordmark_light.svg" darkSrc="/logo/Nuxt_wordmark_dark.svg" width={140} height={40} />
              <LogoWithBadge alt="Remix" lightSrc="/logo/Remix_wordmark_light.svg" darkSrc="/logo/Remix_wordmark_dark.svg" width={140} height={40} badge="Beta" badgeVariant="yellow" />
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 bg-gradient-to-b from-transparent to-blue-500/5 dark:to-blue-900/10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Ship Better Web Apps?</h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join thousands of developers ensuring quality with Signaler. Open source, free, and powerful.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button asChild size="lg" className="h-14 px-8 text-base rounded-full">
                <Link href="/docs/signaler/getting-started">
                  Get Started Now
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="h-14 px-8 text-base bg-transparent rounded-full" asChild>
                <Link href="https://github.com/Dendro-X0/signaler" target="_blank">
                  View on GitHub
                </Link>
              </Button>
              <Button variant="ghost" size="lg" className="h-14 px-8 text-base" asChild>
                <Link href={`https://github.com/Dendro-X0/signaler/releases/tag/${VERSION.version}`} target="_blank">
                  Latest: {VERSION.version}
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>
      </div>
    </HomeLayout>
  )
}
