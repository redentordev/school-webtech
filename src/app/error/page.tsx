'use client';

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  if (error === "OAuthAccountNotLinked") {
    return (
      <div className="max-w-md mx-auto p-6 rounded-md bg-white shadow-md">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Account Linking Required</h1>
        <div className="text-gray-700 space-y-4">
          <p>
            It seems that an account with this email address already exists, but with a different sign-in method.
          </p>
          <p>
            For security reasons, we require you to sign in using your original method first and then link your accounts in the profile settings.
          </p>
          <div className="bg-blue-50 p-4 rounded-md mt-4">
            <h3 className="font-semibold text-blue-800">What should I do?</h3>
            <ol className="list-decimal ml-5 mt-2 text-blue-800">
              <li>
                Sign in using your original method (email/password or the OAuth provider you used before)
              </li>
              <li>
                Go to your account settings
              </li>
              <li>
                Link your accounts in the "Connected Accounts" section
              </li>
            </ol>
          </div>
        </div>
        <div className="mt-8 flex space-x-4">
          <Link 
            href="/login" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 rounded-md bg-white shadow-md">
      <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
      <p className="text-gray-700 mb-4">
        {error || "An unexpected error occurred. Please try again."}
      </p>
      <Link 
        href="/login" 
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Back to Login
      </Link>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ErrorContent />
      </Suspense>
    </div>
  );
} 