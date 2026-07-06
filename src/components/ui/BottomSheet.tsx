"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Mobile drawer: frosted sheet sliding up from the bottom edge, dismissible by
 * tapping the backdrop, the close button, or dragging it down past a
 * velocity/distance threshold. No title bar of its own — the content
 * (StatsPanelBody / TrackedPanelBody) already carries its own PanelHeading.
 */
export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[75vh] flex-col rounded-t-lg border border-b-0 border-line bg-panel-solid shadow-[0_-10px_40px_-8px_rgba(0,0,0,0.35)] backdrop-blur-2xl backdrop-saturate-150"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) onClose();
            }}
          >
            <div className="relative flex shrink-0 items-center justify-center pb-2 pt-2">
              <div className="h-1 w-9 rounded-full bg-grid" />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-1 grid h-7 w-7 place-items-center rounded-md text-mute transition-colors hover:bg-panel-2 hover:text-ink"
              >
                <svg
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="scroll-thin overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
