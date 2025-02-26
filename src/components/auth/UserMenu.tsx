"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut, User, ChevronDown } from "lucide-react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="w-full">
      {isAuthenticated ? (
        <div className="flex flex-col w-full relative">
          {/* User info with dropdown toggle */}
          <div 
            className="flex items-center justify-between w-full p-2 rounded-md hover:bg-zinc-800 cursor-pointer"
            onClick={toggleMenu}
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={session?.user?.image || ""}
                  alt={session?.user?.name || "User"}
                />
                <AvatarFallback className="bg-zinc-800 text-white">
                  {session?.user?.name
                    ? session.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                    : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              <div className="text-sm text-gray-200 truncate">
                {session?.user?.name}
              </div>
            </div>
            <ChevronDown className={`h-4 w-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
          </div>

          {isMenuOpen && (
            <div className="w-full rounded-md shadow-lg py-1 bg-zinc-900 ring-1 ring-black ring-opacity-5 absolute bottom-full left-0 mb-1 z-50">
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-zinc-800"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign out
                </span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full">
          <Button asChild variant="ghost" className="w-full text-white hover:bg-zinc-800">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild variant="default" className="w-full bg-zinc-800 text-white hover:bg-zinc-700">
            <Link href="/register">Sign up</Link>
          </Button>
        </div>
      )}
    </div>
  );
} 