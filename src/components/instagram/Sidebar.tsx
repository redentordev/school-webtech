'use client';

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FaHome, FaUser, FaPlus } from "react-icons/fa";
import { UserMenu } from "@/components/auth/UserMenu";
import { useSession } from "next-auth/react";
import { CreatePostModal } from "./CreatePostModal";

export function Sidebar() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="w-64 border-r border-zinc-800 p-4 flex flex-col justify-between h-full overflow-y-auto">
      <div className="flex flex-col gap-2">
        <Link href="/" className="p-4">
          <h1 className="text-2xl font-bold tracking-tight">Picwall</h1>
        </Link>

        <nav className="flex flex-col gap-4 mt-8">
          <Link href="/">
            <Button variant="ghost" className="w-full justify-start gap-4 text-lg">
              <FaHome className="w-5 h-5" />
              Home
            </Button>
          </Link>

          {isAuthenticated && (
            <>
              <Link href="/profile">
                <Button variant="ghost" className="w-full justify-start gap-4 text-lg">
                  <FaUser className="w-5 h-5" />
                  Profile
                </Button>
              </Link>
              
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-4 text-lg"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <FaPlus className="w-5 h-5" />
                Create Post
              </Button>
            </>
          )}
        </nav>
      </div>
      
      <div className="mt-auto pt-4 border-t border-zinc-800">
        <UserMenu />
      </div>

      {/* Create Post Modal */}
      {isAuthenticated && (
        <CreatePostModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
        />
      )}
    </div>
  );
} 