import React from "react";
import { X } from "lucide-react";
import { LogOut } from "lucide-react";

interface LogoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-[500px] rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card p-6 shadow-xl animate-in zoom-in-95 duration-200">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-1 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                    <X className="size-4" />
                </button>

                <div className="flex flex-col text-left mt-1 mb-8">
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Logout Confirmation</h2>
                    <p className="text-[15px] text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-[420px]">
                        Are you sure you want to log out?
                    </p>
                </div>

                <div className="flex items-center justify-end gap-3 w-full">
                    <button
                        onClick={onClose}
                        className="py-2 px-6 rounded-lg text-sm font-medium text-neutral-800 dark:text-neutral-200 bg-white dark:bg-transparent border-2 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:ring-2 focus:ring-neutral-200 focus:ring-offset-1"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex items-center gap-2 py-2 px-5 rounded-lg text-sm font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-red-500 hover:text-white dark:hover:bg-red-500 dark:hover:text-white transition-colors"
                    >
                        <LogOut className="size-4" />
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
