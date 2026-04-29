"use client";

import { useState } from "react";

type HistoryItem = {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  preview: string;
  time: string;
  sources?: number;
  filled?: boolean;
};

const todayItems: HistoryItem[] = [
  {
    id: "1",
    icon: "flight_takeoff",
    iconBg: "bg-secondary-container/50",
    iconColor: "text-secondary",
    title: "Tokyo Trip Itinerary",
    preview:
      "That sounds amazing! Here is a soft and easy 3-day guide to exploring Shinjuku and Shibuya without feeling rushed...",
    time: "2:30 PM",
    filled: true,
  },
  {
    id: "2",
    icon: "draw",
    iconBg: "bg-tertiary-container/50",
    iconColor: "text-tertiary",
    title: "Brainstorming Blog Ideas",
    preview:
      "Let's think about cozy productivity. How about an article on designing a perfectly soft workspace?",
    time: "10:15 AM",
    sources: 2,
    filled: true,
  },
];

const yesterdayItems: HistoryItem[] = [
  {
    id: "3",
    icon: "code",
    iconBg: "bg-primary-container/40",
    iconColor: "text-primary",
    title: "Python Script Debugging",
    preview:
      "Ah, I see the issue! The indent block on line 42 is slightly off. Let's wrap it in a try-except block to keep it safe.",
    time: "Yesterday",
    filled: true,
  },
  {
    id: "4",
    icon: "restaurant",
    iconBg: "bg-surface-container-high",
    iconColor: "text-on-surface-variant",
    title: "Dinner Recipes",
    preview:
      "Here is a warm, comforting recipe for creamy tomato soup that pairs perfectly with a grilled cheese sandwich.",
    time: "Yesterday",
    filled: true,
  },
];

function HistoryCard({ item }: { item: HistoryItem }) {
  return (
    <div className="group bg-surface-container-lowest rounded-[24px] sm:rounded-[28px] p-4 sm:p-5 shadow-[0_12px_30px_-15px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_40px_-15px_rgba(61,102,90,0.12)] border border-transparent hover:border-primary-container/50 transition-all duration-300 cursor-pointer active:scale-[0.98] flex items-start gap-3 sm:gap-5">
      <div
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-[16px] sm:rounded-[18px] ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}
      >
        <span
          className="material-symbols-outlined"
          style={item.filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
        >
          {item.icon}
        </span>
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex justify-between items-start gap-2 sm:gap-4">
          <h3 className="text-[15px] sm:text-[16px] leading-[1.5] font-semibold text-on-surface truncate">
            {item.title}
          </h3>
          <span className="text-[10px] sm:text-[11px] leading-none tracking-[0.06em] font-semibold uppercase text-outline shrink-0 mt-1 font-[family-name:var(--font-lexend)]">
            {item.time}
          </span>
        </div>
        <p className="text-[13px] sm:text-[14px] leading-[1.5] text-on-surface-variant line-clamp-2 sm:truncate mt-1">
          {item.preview}
        </p>
        {item.sources && (
          <div className="flex gap-2 mt-3">
            <span className="inline-flex items-center gap-1 bg-surface-container py-1 px-3 rounded-full text-[11px] leading-none tracking-[0.06em] font-semibold uppercase text-on-surface-variant font-[family-name:var(--font-lexend)]">
              <span className="material-symbols-outlined text-[14px]">description</span>{" "}
              {item.sources} Sources
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function HistorySection({
  title,
  items,
}: {
  title: string;
  items: HistoryItem[];
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[11px] leading-none tracking-[0.06em] font-semibold uppercase text-on-surface-variant ml-4 font-[family-name:var(--font-lexend)]">
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <HistoryCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

export function HistoryContent() {
  const [searchQuery, setSearchQuery] = useState("");

  const filterItems = (items: HistoryItem[]) =>
    items.filter(
      (item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.preview.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const filteredToday = filterItems(todayItems);
  const filteredYesterday = filterItems(yesterdayItems);

  return (
    <>
      {/* Content Area */}
      <div className="flex-1 w-full flex justify-center px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-10 overflow-y-auto">
        <div className="w-full max-w-[800px] flex flex-col gap-6 sm:gap-8">
          {/* Header */}
          <header className="pt-2 sm:pt-4 pb-2">
            <h2 className="text-[28px] sm:text-[36px] leading-[1.2] tracking-[-0.02em] font-[800] text-on-surface">
              Chat History
            </h2>
            <p className="text-[16px] sm:text-[18px] leading-[1.6] font-medium text-on-surface-variant mt-2">
              Pick up right where you left off with your squishy companion.
            </p>
          </header>

          {/* Search Bar */}
          <div className="relative bg-surface-container-lowest rounded-[24px] sm:rounded-[28px] p-1.5 sm:p-2 shadow-[0_12px_24px_-12px_rgba(0,0,0,0.05)] border border-surface-variant/30 flex items-center">
            <span className="material-symbols-outlined text-outline ml-3 sm:ml-4 mr-1 sm:mr-2 text-[20px] sm:text-[24px]">search</span>
            <input
              className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] leading-[1.5] text-on-surface placeholder:text-outline-variant p-2 outline-none"
              placeholder="Search past conversations..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Today Section */}
          {filteredToday.length > 0 && (
            <HistorySection title="Today" items={filteredToday} />
          )}

          {/* Yesterday Section */}
          {filteredYesterday.length > 0 && (
            <div className="mt-4">
              <HistorySection title="Yesterday" items={filteredYesterday} />
            </div>
          )}

          {/* Empty State */}
          {filteredToday.length === 0 && filteredYesterday.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-outline">
                  search_off
                </span>
              </div>
              <p className="text-on-surface-variant font-medium">No conversations found</p>
              <p className="text-outline text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
