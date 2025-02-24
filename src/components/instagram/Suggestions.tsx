'use client';

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function Suggestions() {
  return (
    <div className="w-[350px] p-4 border-l border-zinc-800">
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="w-12 h-12">
          <AvatarImage src="https://picsum.photos/seed/user/200/200" />
          <AvatarFallback>ME</AvatarFallback>
        </Avatar>
        <div>
          <div className="font-semibold">my.username</div>
          <div className="text-zinc-500">My Name</div>
        </div>
        <Button variant="link" className="ml-auto text-blue-500">
          Switch
        </Button>
      </div>

      <div>
        <div className="flex justify-between mb-4">
          <span className="text-zinc-500 font-semibold">Suggested for you</span>
          <Button variant="ghost" size="sm">
            See All
          </Button>
        </div>

        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 mb-4">
            <Avatar className="w-8 h-8">
              <AvatarImage src={`https://picsum.photos/seed/suggested${i}/200/200`} />
              <AvatarFallback>U{i}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold text-sm">suggested_user_{i}</div>
              <div className="text-zinc-500 text-xs">Followed by others</div>
            </div>
            <Button variant="link" className="text-blue-500 text-sm">
              Follow
            </Button>
          </div>
        ))}
      </div>

      <div className="text-xs text-zinc-500 mt-6">
        <div className="flex flex-wrap gap-2">
          <Link href="#">About</Link> •
          <Link href="#">Help</Link> •
          <Link href="#">Press</Link> •
          <Link href="#">API</Link> •
          <Link href="#">Jobs</Link> •
          <Link href="#">Privacy</Link> •
          <Link href="#">Terms</Link>
        </div>
        <div className="mt-4">© 2025 INSTAGRAM FROM META</div>
      </div>
    </div>
  );
} 