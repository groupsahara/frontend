"use client"

import React, { useState, useRef } from "react"
import { Upload } from "lucide-react"

export default function AiTraining() {
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) setFile(selectedFile)
    }

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        if (!isDragging) setIsDragging(true)
    }

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFile = e.dataTransfer.files?.[0]
        if (droppedFile) setFile(droppedFile)
    }

    const handleFileUpload = () => {
        if (!file) return
        console.log("Training with file:", file)
    }

    const mockTrainingData = React.useMemo(() => [
        { id: 1, summary: 'Q2 Sales script and objection handling', fileName: 'q2-sales-script-v2.xlsx', date: '2026-05-18' },
        { id: 2, summary: 'Competitor feature comparison matrix', fileName: 'competitor_features.csv', date: '2026-05-15' },
        { id: 3, summary: 'Updated pricing tiers and FAQ', fileName: 'pricing_tiers_2026.json', date: '2026-05-10' },
        { id: 4, summary: 'Customer persona definitions', fileName: 'personas_updated.xlsx', date: '2026-05-02' },
    ], [])

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">AI Training Data</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Upload your Excel or JSON file to train the AI Agent</p>
            </div>

            {/* Upload Card */}
            <div className="bg-card border border-border rounded-lg p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Upload Training File</h2>
                <div className="w-full max-w-md">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
                        {/* Drop zone */}
                        <div
                            className={`flex-1 w-full relative border border-dashed rounded-md h-10 sm:h-9 px-3 flex items-center cursor-pointer transition-colors duration-150 ${
                                isDragging
                                    ? 'border-[#a1a1aa] bg-accent/40'
                                    : 'border-border hover:border-border bg-background'
                            }`}
                            onDragOver={onDragOver}
                            onDragLeave={onDragLeave}
                            onDrop={onDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                accept=".xlsx,.xls,.csv,.json"
                            />
                            {file ? (
                                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                    <Upload className="text-muted-foreground shrink-0 text-xs" />
                                    <span className="text-sm text-foreground truncate">{file.name}</span>
                                    <span className="text-xs text-muted-foreground shrink-0">{(file.size / 1024).toFixed(1)} KB</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Upload className="shrink-0 text-xs" />
                                    <span className="text-sm truncate">Click or drag file (.xlsx, .csv, .json)</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleFileUpload}
                            disabled={!file}
                            className={`h-10 sm:h-9 px-4 text-sm font-medium rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1a1aa] w-full sm:w-auto shadow-sm btn-dashboard-primary ${
                                !file ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            Train your data
                        </button>
                    </div>
                    {file && (
                        <button
                            onClick={() => setFile(null)}
                            className="mt-2 text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
                        >
                            Clear file
                        </button>
                    )}
                </div>
            </div>

            {/* Training History Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">Training History</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left md:min-w-[600px]">
                        <thead className="hidden md:table-header-group">
                            <tr className="border-b border-border">
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">S.No</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">File Used</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Training Data Summary</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Training Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border block md:table-row-group">
                            {mockTrainingData.map((data, index) => (
                                <tr key={data.id} className="block md:table-row hover:bg-accent/30 transition-colors p-4 md:p-0">
                                    <td className="block md:table-cell px-0 md:px-5 py-2 md:py-4">
                                        <div className="flex md:block items-center justify-between gap-4">
                                            <span className="md:hidden font-medium text-muted-foreground text-xs uppercase">S.No</span>
                                            <span className="text-sm text-muted-foreground tabular-nums">{index + 1}</span>
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-0 md:px-5 py-2 md:py-4">
                                        <div className="flex md:block items-center justify-between gap-4">
                                            <span className="md:hidden font-medium text-muted-foreground text-xs uppercase">File Used</span>
                                            <span className="text-sm text-muted-foreground font-mono text-right md:text-left">{data.fileName}</span>
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-0 md:px-5 py-3 md:py-4">
                                        <div className="flex flex-col md:block gap-2">
                                            <span className="md:hidden font-medium text-muted-foreground text-xs uppercase">Training Data Summary</span>
                                            <input
                                                type="text"
                                                defaultValue={data.summary}
                                                className="w-full bg-background border border-border text-foreground text-sm rounded-md px-3 py-2 md:py-1.5 focus:outline-none focus:ring-2 focus:ring-[#a1a1aa]/50 focus:border-[#a1a1aa] transition-colors placeholder:text-muted-foreground"
                                                placeholder="Enter training summary..."
                                            />
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-0 md:px-5 py-2 md:py-4">
                                        <div className="flex md:block items-center justify-between gap-4">
                                            <span className="md:hidden font-medium text-muted-foreground text-xs uppercase">Training Date</span>
                                            <span className="text-sm text-muted-foreground tabular-nums">{data.date}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}