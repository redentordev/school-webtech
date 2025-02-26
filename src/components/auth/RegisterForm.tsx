"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { Loader2 } from "lucide-react";

export function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Register the user
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // If registration is successful, sign in the user
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Registration successful, but sign-in failed. Please try logging in.");
        setIsLoading(false);
        return;
      }

      router.refresh();
      router.push("/");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Registration failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "github" | "google") => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch (error) {
      setError("Failed to connect with provider. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm text-gray-300">
            Full Name
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Full Name"
            required
            value={formData.name}
            onChange={handleChange}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm text-gray-300">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Email"
            required
            value={formData.email}
            onChange={handleChange}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm text-gray-300">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Password (min. 8 characters)"
            required
            minLength={8}
            value={formData.password}
            onChange={handleChange}
            className="bg-zinc-800 border-zinc-700 text-white"
          />
        </div>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        <Button
          className="w-full bg-zinc-800 text-white hover:bg-zinc-700"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Sign Up
        </Button>
      </form>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-700"></div>
        </div>
        <div className="relative px-4 text-sm text-gray-400 bg-zinc-900">
          Or continue with
        </div>
      </div>

      <div className="flex gap-4">
        <Button
          variant="outline"
          className="w-full"
          type="button"
          disabled={isLoading}
          onClick={() => handleOAuthSignIn("github")}
        >
          <FaGithub className="mr-2 h-4 w-4" />
          GitHub
        </Button>
        <Button
          variant="outline"
          className="w-full"
          type="button"
          disabled={isLoading}
          onClick={() => handleOAuthSignIn("google")}
        >
          <FaGoogle className="mr-2 h-4 w-4" />
          Google
        </Button>
      </div>
    </div>
  );
} 