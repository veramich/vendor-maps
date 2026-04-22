export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">

        <h1 className="text-2xl font-medium mb-3">
          Check your email
        </h1>

        <p className="text-gray-500 mb-6">
          We sent a verification link to your email address.
          Click the link to activate your account.
        </p>

        <p className="text-sm text-gray-400">
          Did not receive it? Check your spam folder.
        </p>

      </div>
    </div>
  );
}