"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data.count ?? 0);
    } catch {
      // Silent — badge just won't update.
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications ?? []);
      }
    } catch {
      // Silent.
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll the unread count while logged in. The initial fetch is
  // deferred to a microtask so it doesn't set state synchronously
  // inside the effect body.
  useEffect(() => {
    if (!session) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadUnreadCount();
    });
    const interval = setInterval(loadUnreadCount, 60_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session, loadUnreadCount]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await loadList();
      // Mark everything read when the panel is opened.
      if (unread > 0) {
        setUnread(0);
        try {
          await fetch("/api/notifications/read", { method: "POST" });
        } catch {
          // If it fails, the next poll restores the real count.
          loadUnreadCount();
        }
      }
    }
  };

  // Only show the bell to logged-in users.
  if (!session) return null;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-orange-600 transition text-white"
        aria-label="Notifications"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-semibold leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-gray-800 text-sm">Notifications</span>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                Loading…
              </div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                You&apos;re all caught up.
              </div>
            ) : (
              items.map((n) => {
                const row = (
                  <div
                    className={`px-4 py-3 border-b border-gray-50 transition ${
                      n.read_at ? "" : "bg-orange-50"
                    } ${n.link ? "hover:bg-gray-50 cursor-pointer" : ""}`}
                  >
                    <p className="text-sm font-medium text-gray-800">{n.title}</p>
                    {n.body && (
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1">
                      {formatTime(n.created_at)}
                    </p>
                  </div>
                );

                return n.link ? (
                  <Link key={n.id} href={n.link} onClick={() => setOpen(false)}>
                    {row}
                  </Link>
                ) : (
                  <div key={n.id}>{row}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
