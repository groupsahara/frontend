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
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 5

    const totalPages = Math.ceil(mockUsers.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentUsers = mockUsers.slice(startIndex, startIndex + itemsPerPage)

    const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1))
    const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages))
    const handlePageClick = (pageNumber: number) => setCurrentPage(pageNumber)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const fullNumber = `+${phone}`
        console.log('Initiating call to:', fullNumber)
        alert(`Calling ${fullNumber}`)
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Page Header */}
            <div>
                <h1 className="text-xl font-semibold text-foreground tracking-tight">AI Sales Caller</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Enter a number to initiate an AI-powered call</p>
            </div>

            {/* Initiate Call Form */}
            <div className="bg-card border border-border rounded-lg p-5">
                <h2 className="text-sm font-semibold text-foreground mb-4">Initiate a Call</h2>
                <form onSubmit={handleSubmit} className="w-full max-w-md">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
                        <div className="flex-1 w-full">
                            <PhoneInput
                                country={'in'}
                                value={phone}
                                onChange={(value) => setPhone(value)}
                                enableSearch={true}
                                disableSearchIcon={true}
                                countryCodeEditable={false}
                                placeholder="Enter phone number"
                                containerClass="!w-full"
                                inputClass="!w-full !h-10 sm:!h-9 !text-sm"
                                buttonClass="!border-r-0"
                                dropdownClass=""
                            />
                        </div>
                        <button
                            type="submit"
                            className="h-10 sm:h-9 px-4 btn-dashboard-primary transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a1a1aa] w-full sm:w-auto rounded-md shadow-sm"
                        >
                            Initiate Call
                        </button>
                    </div>
                </form>
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