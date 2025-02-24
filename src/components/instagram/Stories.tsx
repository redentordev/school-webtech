'use client';

import Image from "next/image";

export function Stories() {
  return (
    <div className="border-b border-zinc-800 p-4">
      <div className="flex gap-4 overflow-x-auto">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
              <div className="w-full h-full rounded-full overflow-hidden">
                <Image
                  src={`https://picsum.photos/seed/${i}/200/200`}
                  alt={`Story ${i + 1}`}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <span className="text-xs">user_{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 