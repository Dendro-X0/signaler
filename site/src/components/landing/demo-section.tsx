"use client"

import React from "react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DemoSection() {
    return (
        <section className="py-20 px-4 bg-muted/30">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold mb-4">See Signaler in Action</h2>
                    <p className="text-lg text-muted-foreground">
                        From zero to full audit report in seconds.
                    </p>
                </div>

                <Tabs defaultValue="init" className="w-full">
                    <div className="flex justify-center mb-8">
                        <TabsList className="grid w-full max-w-2xl grid-cols-4">
                            <TabsTrigger value="init">Init</TabsTrigger>
                            <TabsTrigger value="audit">Audit</TabsTrigger>
                            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
                            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="init" className="mt-0">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                            <Image
                                src="https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/init.gif"
                                alt="Signaler init demo"
                                width={1200}
                                height={675}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                        <p className="text-center mt-4 text-sm text-muted-foreground">
                            Initialize a project with `signaler discover`
                        </p>
                    </TabsContent>

                    <TabsContent value="audit" className="mt-0">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                            <Image
                                src="https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/audit.gif"
                                alt="Signaler audit demo"
                                width={1200}
                                height={675}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                        <p className="text-center mt-4 text-sm text-muted-foreground">
                            One command: discover → run → analyze with `signaler audit`
                        </p>
                    </TabsContent>

                    <TabsContent value="artifacts" className="mt-0">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                            <Image
                                src="https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/artifacts.gif"
                                alt="Signaler artifacts demo"
                                width={1200}
                                height={675}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                        <p className="text-center mt-4 text-sm text-muted-foreground">
                            Tree layout artifacts under `.signaler/` (start at `INDEX.md`)
                        </p>
                    </TabsContent>

                    <TabsContent value="dashboard" className="mt-0">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                            <Image
                                src="https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/analytics_dashboard.gif"
                                alt="Signaler dashboard demo"
                                width={1200}
                                height={675}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                        <p className="text-center mt-4 text-sm text-muted-foreground">
                            Developer dashboard triage: KPI strip + issue-count performance view
                        </p>
                    </TabsContent>
                </Tabs>
            </div>
        </section>
    )
}
