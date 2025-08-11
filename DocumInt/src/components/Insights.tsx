import React, { useMemo, useState } from 'react';
import FlippableCards, { type FlippableCardItem } from './FlippableCards';
import { Sparkles, Search, FileText, ListChecks, Plus } from 'lucide-react';

const accentPalette = [
  { cls: 'bg-indigo-50 border-indigo-200', icon: <Sparkles size={20} /> },
  { cls: 'bg-emerald-50 border-emerald-200', icon: <Search size={20} /> },
  { cls: 'bg-amber-50 border-amber-200', icon: <FileText size={20} /> },
  { cls: 'bg-sky-50 border-sky-200', icon: <ListChecks size={20} /> },
];

const Insights: React.FC = () => {
  // Start with zero cards
  const seed = useMemo<FlippableCardItem[]>(() => [], []);
  const [items, setItems] = useState<FlippableCardItem[]>(seed);
  const [counter, setCounter] = useState(seed.length);

  const addCard = () => {
    const idx = counter % accentPalette.length;
    const id = crypto.randomUUID();
    const n = counter + 1;
    const newItem: FlippableCardItem = {
      id,
      frontTitle: `Insight ${n}`,
      frontSubtitle: 'Custom note',
      frontIcon: accentPalette[idx].icon,
      accentColor: accentPalette[idx].cls,
      frontExpandedContent: (
        <div className="text-sm space-y-2">
          <div className="font-medium text-gray-700">Details</div>
          <ul className="list-disc ml-4">
            <li>Describe the insight here</li>
            <li>Add links or references</li>
          </ul>
        </div>
      ),
      backContent: (
        <div className="text-xs">
          Use the Flip button to view more or add instructions.
        </div>
      ),
      backExpandedContent: (
        <div className="text-xs space-y-2">
          <div>Expanded back content for Insight {n}.</div>
          <ul className="list-disc ml-4">
            <li>Action items</li>
            <li>Next steps</li>
          </ul>
        </div>
      ),
    };
    // Append to the end (bottom)
    setItems(prev => [...prev, newItem]);
    setCounter(n);
  };

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold text-gray-700">Insights</div>
        {/* Add button moved to bottom */}
      </div>

      {/* Scroll region with add button at the bottom */}
      <div className="max-h-155 overflow-y-auto pr-1">
        <div className="flex flex-col gap-3">
          <FlippableCards
            items={items}
            className=""
            collapsedHeightClass="h-28"
            expandedHeightClass="h-155"
          />

          <button
            type="button"
            onClick={addCard}
            className="h-28 w-full rounded-lg border-2 border-dashed border-gray-300 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 transition-colors flex items-center justify-center text-sm text-gray-600 shadow-sm"
          >
            <span className="inline-flex items-center gap-2">
              <Plus size={16} />
              Add insight
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Insights;