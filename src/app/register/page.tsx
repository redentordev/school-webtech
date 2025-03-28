import Image from "next/image";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../api/auth/[...nextauth]/route";

export default async function RegisterPage() {
  // Check if user is already logged in
  const session = await getServerSession(authOptions);
  
  if (session) {
    redirect("/");
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <div className="flex flex-col md:flex-row items-center max-w-3xl">
        <div className="hidden md:block md:w-1/2 px-8">
          <Image
            src="/placeholder.svg?height=600&width=600"
            alt="Picwall App"
            width={600}
            height={600}
            className="object-cover"
          />
        </div>
        <div className="w-full md:w-1/2 bg-zinc-900 p-8 rounded-lg border border-zinc-800">
          <div className="text-4xl font-bold text-center mb-8 text-white">Picwall</div>
          <RegisterForm />
          <div className="mt-4 text-sm text-center text-gray-400">
            Already have an account?{" "}
            <a href="/login" className="text-zinc-400 hover:text-white hover:underline">
              Log in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 