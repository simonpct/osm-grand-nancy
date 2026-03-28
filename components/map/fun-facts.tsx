"use client";

import { useEffect, useRef, useState } from "react";
import { X, ChevronRight, Trophy, MapPin } from "lucide-react";
import type { FactsPayload, StatSection, PieSlice } from "@/lib/facts/compute";
import { factsUrl } from "@/lib/pbf/blob-url";

const ROTATE_INTERVAL = 8000;

interface FunFactsProps {
  onFlyTo?: (lng: number, lat: number) => void;
}

export function FunFacts({ onFlyTo }: FunFactsProps) {
  const [payload, setPayload] = useState<FactsPayload | null>(null);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Fetch data
  useEffect(() => {
    fetch(factsUrl())
      .then((r) => r.json())
      .then((data: FactsPayload) => {
        if (data.facts?.length > 0) {
          // Shuffle facts
          const shuffled = [...data.facts];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          setPayload({ ...data, facts: shuffled });
        }
      })
      .catch(() => {});
  }, []);

  // Auto-rotate facts
  useEffect(() => {
    if (!payload || payload.facts.length <= 1 || drawerOpen) return;
    timerRef.current = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % payload.facts.length);
        setVisible(true);
      }, 300);
    }, ROTATE_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [payload, drawerOpen]);

  // Close drawer on outside click
  useEffect(() => {
    if (!drawerOpen) return;
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [drawerOpen]);

  if (!payload || payload.facts.length === 0) return null;

  const fact = payload.facts[index];

  return (
    <>
      {/* Bottom pill */}
      <button
        onClick={() => setDrawerOpen(true)}
        className="absolute bottom-6 left-1/2 z-10 flex max-w-[90vw] -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm text-gray-700 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl sm:max-w-lg"
      >
        <span className="emoji shrink-0 text-base leading-none">{fact.icon}</span>
        <span
          className={`truncate transition-opacity duration-300 ${visible ? "opacity-100" : "opacity-0"}`}
        >
          {fact.text}
        </span>
        <ChevronRight className="size-3.5 shrink-0 text-gray-400" />
      </button>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setDrawerOpen(false)}
      />

      {/* Right drawer */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:rounded-l-2xl ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Le saviez-vous ?
          </h2>
          <button
            onClick={() => setDrawerOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-6">
            {payload.sections.map((section, i) => (
              <SectionCard key={i} section={section} onFlyTo={onFlyTo} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function SectionCard({ section, onFlyTo }: { section: StatSection; onFlyTo?: (lng: number, lat: number) => void }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
      {/* Section title */}
      <div className="mb-3 flex items-center gap-2">
        <span className="emoji text-lg leading-none">{section.icon}</span>
        <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {section.stats.map((stat, i) => (
          <div
            key={i}
            className={`rounded-lg bg-white px-3 py-2 shadow-sm ${
              i === 0 ? "col-span-2" : ""
            }`}
          >
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className={`font-semibold text-gray-900 ${i === 0 ? "text-xl" : "text-base"}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Pie chart */}
      {section.pie && section.pie.slices.length > 1 && (
        <div className="mt-3">
          <div className="mb-2 text-xs font-medium text-gray-500">{section.pie.title}</div>
          <PieChart slices={section.pie.slices} />
        </div>
      )}

      {/* Top ranking */}
      {section.top && section.top.items.length > 0 && (
        <div className="mt-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Trophy className="size-3" />
            {section.top.title}
          </div>
          <div className="space-y-1">
            {section.top.items.map((item, i) => (
              <button
                key={i}
                disabled={!item.coords || !onFlyTo}
                onClick={() => {
                  if (item.coords && onFlyTo) onFlyTo(item.coords[0], item.coords[1]);
                }}
                className={`flex w-full items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-left shadow-sm transition-colors ${
                  item.coords && onFlyTo ? "cursor-pointer hover:bg-blue-50" : ""
                }`}
              >
                <span
                  className={`flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0
                      ? "bg-yellow-100 text-yellow-700"
                      : i === 1
                        ? "bg-gray-100 text-gray-500"
                        : "bg-orange-50 text-orange-400"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-gray-700">
                  {item.name}
                </span>
                <span className="shrink-0 text-xs font-medium text-gray-500">
                  {item.value}
                </span>
                {item.coords && onFlyTo && (
                  <MapPin className="size-3 shrink-0 text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PieChart({ slices }: { slices: PieSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const size = 120;
  const cx = size / 2;
  const cy = size / 2;
  const r = 45;

  let cumAngle = -Math.PI / 2;
  const paths = slices.map((slice) => {
    const angle = (slice.value / total) * 2 * Math.PI;
    const startX = cx + r * Math.cos(cumAngle);
    const startY = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const endX = cx + r * Math.cos(cumAngle);
    const endY = cy + r * Math.sin(cumAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY} Z`;
    return { d, color: slice.color, label: slice.label, pct: Math.round((slice.value / total) * 100) };
  });

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} stroke="white" strokeWidth={1} />
        ))}
      </svg>
      <div className="space-y-1">
        {paths.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600">{p.label}</span>
            <span className="font-medium text-gray-900">{p.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
