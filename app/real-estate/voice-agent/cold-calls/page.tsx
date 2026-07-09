'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'

// PhoneInputClient wraps react-phone-input-2 AND its CSS together,
// so neither the component nor its stylesheet block initial page render.
const PhoneInput = dynamic(() => import('@/app/real-estate/components/PhoneInputClient'), {
    ssr: false,
    loading: () => <div className="h-10 sm:h-9 w-full bg-accent animate-pulse rounded-md"></div>
})

const mockUsers = Array.from({ length: 24 }, (_, i) => ({
    id: i + 1,
    name: ['Alice Smith', 'Bob Jones', 'Charlie Brown', 'Diana Prince', 'Ethan Hunt', 'Fiona Gallagher', 'George Costanza', 'Hannah Abbott'][i % 8] + (i > 7 ? ` ${i + 1}` : ''),
    phone: `+1 ${((i * 123) % 900) + 100} ${((i * 456) % 900) + 100} ${((i * 7890) % 9000) + 1000}`,
    lastConversation: ['Interested in SaaS product', 'Call back next week', 'Not interested at the moment', 'Requested a demo', 'Send pricing details'][i % 5]
}))

const Page = () => {
    const [phone, setPhone] = useState('')
    const [manualName, setManualName] = useState('')
    const [url, setUrl] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5

    const totalPages = Math.ceil(mockUsers.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentUsers = mockUsers.slice(startIndex, startIndex + itemsPerPage)

    const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1))
    const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages))
    const handlePageClick = (pageNumber: number) => setCurrentPage(pageNumber)

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const fullNumber = `+${phone}`
        console.log('Manually adding contact:', manualName, fullNumber)
        alert(`Adding ${manualName} (${fullNumber}) to contacts`)
    }

    const handleScrapeSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Scraping URL:', url)
        alert(`Scraping contacts from ${url}...`)
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">Cold Calls Manager</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Import leads via Web Scraping or add them manually for cold outreach.</p>
            </div>

            {/* Lead Generation Tools */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Web Scraper */}
                <div className="bg-card border border-border rounded-lg p-5 flex flex-col h-full relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-all duration-500 group-hover:bg-blue-500/10"></div>
                    <div className="flex items-center gap-3 mb-5 relative">
                        <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Web Scrape Contacts</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Extract phone numbers from any website</p>
                        </div>
                    </div>
                    <form onSubmit={handleScrapeSubmit} className="flex flex-col gap-4 mt-auto relative z-10">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] text-muted-foreground uppercase tracking-[.06em] font-medium">Website URL</label>
                            <input
                                type="url"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com/team"
                                required
                                className="w-full bg-background border border-border text-foreground text-sm rounded-md px-3 py-2 h-10 sm:h-9 focus:outline-none focus:ring-2 focus:ring-[#a1a1aa]/50 focus:border-[#a1a1aa] transition-all placeholder:text-muted-foreground"
                            />
                        </div>
                        <button
                            type="submit"
                            className="h-10 sm:h-9 px-4 btn-dashboard-primary transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1a1aa] w-full rounded-md shadow-sm flex items-center justify-center gap-2"
                        >
                            <span>Scrape Leads</span>
                        </button>
                    </form>
                </div>

                {/* Manual Entry */}
                <div className="bg-card border border-border rounded-lg p-5 flex flex-col h-full relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#4ade80]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-all duration-500 group-hover:bg-[#4ade80]/10"></div>
                    <div className="flex items-center gap-3 mb-5 relative">
                        <div className="w-9 h-9 rounded-full bg-[#4ade80]/10 text-[#4ade80] flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-foreground">Manual Entry</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">Add a single prospect to your list</p>
                        </div>
                    </div>
                    <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 mt-auto relative z-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] text-muted-foreground uppercase tracking-[.06em] font-medium">Name</label>
                                <input
                                    type="text"
                                    value={manualName}
                                    onChange={(e) => setManualName(e.target.value)}
                                    placeholder="John Doe"
                                    required
                                    className="w-full bg-background border border-border text-foreground text-sm rounded-md px-3 py-2 h-10 sm:h-9 focus:outline-none focus:ring-2 focus:ring-[#a1a1aa]/50 focus:border-[#a1a1aa] transition-all placeholder:text-muted-foreground"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[11px] text-muted-foreground uppercase tracking-[.06em] font-medium">Phone</label>
                                <PhoneInput
                                    country={'in'}
                                    value={phone}
                                    onChange={(value) => setPhone(value)}
                                    enableSearch={true}
                                    disableSearchIcon={true}
                                    countryCodeEditable={false}
                                    placeholder="Phone number"
                                    containerClass="!w-full"
                                    inputClass="!w-full !h-10 sm:!h-9 !text-sm"
                                    buttonClass="!border-r-0"
                                    dropdownClass=""
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="h-10 sm:h-9 px-4 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1a1aa] w-full rounded-md shadow-sm flex items-center justify-center gap-2 border border-[#4ade80]/30 text-[#4ade80] bg-[#4ade80]/5 hover:bg-[#4ade80]/10"
                        >
                            <span>Add Contact</span>
                        </button>
                    </form>
                </div>

            </div>

            {/* Contacts Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                    <h2 className="text-sm font-semibold text-foreground">Contacts</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left md:min-w-175">
                        <thead className="hidden md:table-header-group">
                            <tr className="border-b border-border">
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">S.No</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Mobile Number</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Conversation</th>
                                <th className="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border block md:table-row-group">
                            {currentUsers.map((user, index) => (
                                <tr key={user.id} className="block md:table-row hover:bg-accent/30 transition-colors p-4 md:p-0">
                                    <td className="block md:table-cell px-0 md:px-5 py-2 md:py-4">
                                        <div className="flex md:block items-center justify-between gap-4">
                                            <span className="md:hidden font-medium text-muted-foreground text-xs uppercase">S.No</span>
                                            <span className="text-sm text-muted-foreground tabular-nums">{startIndex + index + 1}</span>
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-0 md:px-5 py-2 md:py-4">
                                        <div className="flex md:block items-center justify-between gap-4">
                                            <span className="md:hidden font-medium text-muted-foreground text-xs uppercase">Name</span>
                                            <span className="text-sm font-medium text-foreground text-right md:text-left">{user.name}</span>
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-0 md:px-5 py-2 md:py-4">
                                        <div className="flex md:block items-center justify-between gap-4">
                                            <span className="md:hidden font-medium text-muted-foreground text-xs uppercase">Mobile Number</span>
                                            <span className="text-sm text-muted-foreground font-mono text-right md:text-left">{user.phone}</span>
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-0 md:px-5 py-3 md:py-4">
                                        <div className="flex flex-col md:block gap-2">
                                            <span className="md:hidden font-medium text-muted-foreground text-xs uppercase">Last Conversation</span>
                                            <input
                                                type="text"
                                                defaultValue={user.lastConversation}
                                                className="w-full bg-background border border-border text-foreground text-sm rounded-md px-3 py-2 md:py-1.5 focus:outline-none focus:ring-2 focus:ring-[#a1a1aa]/50 focus:border-[#a1a1aa] transition-all placeholder:text-muted-foreground"
                                                placeholder="Add conversation notes..."
                                            />
                                        </div>
                                    </td>
                                    <td className="block md:table-cell px-0 md:px-5 pt-4 pb-2 md:py-4 border-t border-border md:border-none mt-2 md:mt-0">
                                        <div className="flex flex-col sm:flex-row md:justify-center gap-2">
                                            <button className="h-9 md:h-8 px-3 text-sm md:text-xs font-medium rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors whitespace-nowrap w-full sm:w-auto">
                                                AI Call
                                            </button>
                                            <button className="h-9 md:h-8 px-3 text-sm md:text-xs font-medium rounded-md border border-[#4ade80]/20 text-[#4ade80] bg-[#4ade80]/5 hover:bg-[#4ade80]/10 transition-colors whitespace-nowrap w-full sm:w-auto">
                                                Manual Call
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 border-t border-border text-xs text-muted-foreground gap-3">
                    <span>
                        Showing <span className="text-foreground font-medium">{startIndex + 1}</span> to{' '}
                        <span className="text-foreground font-medium">{Math.min(startIndex + itemsPerPage, mockUsers.length)}</span> of{' '}
                        <span className="text-foreground font-medium">{mockUsers.length}</span> entries
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                            className="h-8 px-3 rounded-md border border-border text-muted-foreground text-xs hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => handlePageClick(page)}
                                className={`h-8 w-8 rounded-md border text-xs transition-colors hidden sm:flex items-center justify-center ${currentPage === page
                                    ? 'btn-pagination-active font-medium'
                                    : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className="h-8 px-3 rounded-md border border-border text-muted-foreground text-xs hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Page