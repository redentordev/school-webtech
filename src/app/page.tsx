import { Sidebar } from "@/components/instagram/Sidebar";
import { Feed } from "@/components/instagram/Feed";

export default function Home() {
  return (
    <div className="flex h-screen bg-black text-white">
      <Sidebar />
      <Feed />
    </div>
  );
}
