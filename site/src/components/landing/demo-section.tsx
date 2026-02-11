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
                        <TabsList className="grid w-full max-w-md grid-cols-3">
                            <TabsTrigger value="init">Init & Audit</TabsTrigger>
                            <TabsTrigger value="report">Interactive Reporting</TabsTrigger>
                            <TabsTrigger value="filetree">File Tree</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="init" className="mt-0">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                            <Image
                                src="https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/init_and_audit.gif"
                                alt="Signaler Init and Audit Demo"
                                width={1200}
                                height={675}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                        <p className="text-center mt-4 text-sm text-muted-foreground">
                            Initializing a project and running an audit in interactive mode
                        </p>
                    </TabsContent>

                    <TabsContent value="report" className="mt-0">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                            <Image
                                src="https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/HTML_report.gif"
                                alt="Signaler HTML Report Demo"
                                width={1200}
                                height={675}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                        <p className="text-center mt-4 text-sm text-muted-foreground">
                            Interactive HTML report with AI insights and deep metrics
                        </p>
                    </TabsContent>

                    <TabsContent value="filetree" className="mt-0">
                        <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-card aspect-video relative flex items-center justify-center">
                            <Image
                                src="https://raw.githubusercontent.com/Dendro-X0/signaler/main/docs/assets/file_tree_report.gif"
                                alt="Signaler File Tree Report Demo"
                                width={1200}
                                height={675}
                                className="w-full h-full object-cover"
                                unoptimized
                            />
                        </div>
                        <p className="text-center mt-4 text-sm text-muted-foreground">
                            Comprehensive file tree generation for project structure analysis
                        </p>
                    </TabsContent>
                </Tabs>
            </div>
        </section>
    )
}
