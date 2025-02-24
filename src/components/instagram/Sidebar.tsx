'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FaHome, FaImage } from "react-icons/fa";
import { CreatePost } from "./CreatePost";

export function Sidebar() {
  return (
    <div className="w-64 border-r border-zinc-800 p-4 flex flex-col gap-2">
      <Link href="/" className="p-4">
        <h1 className="text-2xl font-bold tracking-tight">picwall</h1>
      </Link>

      <nav className="flex flex-col gap-4 mt-8">
        <Link href="/">
          <Button variant="ghost" className="w-full justify-start gap-4 text-lg">
            <FaHome className="w-5 h-5" />
            Home
          </Button>
        </Link>

        {/* <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-4 text-lg">
              <FaImage className="w-5 h-5" />
              Create
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create new post</DialogTitle>
            </DialogHeader>
            <CreatePost />
          </DialogContent>
        </Dialog> */}
      </nav>
    </div>
  );
} 