"use client";

type MonthOption = { year: number; month: number; label: string };

export default function MonthSelector({
  months,
  current,
}: {
  months: MonthOption[];
  current: string; // "YYYY-M"
}) {
  return (
    <select
      value={current}
      onChange={(e) => {
        window.location.href = `/admin?period=${e.target.value}`;
      }}
      className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-500/40 cursor-pointer"
    >
      {months.map((m) => (
        <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
