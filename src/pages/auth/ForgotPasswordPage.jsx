import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        "/api/auth/forgot-password",
        {
          email,
        },
        {
          timeout: 30000, // 30 second timeout
        }
      );

      // Store email for reset password page
      sessionStorage.setItem("resetEmail", email);

      // Store the reset token for display
      if (response.data.devToken) {
        console.log("🔑 Reset Token:", response.data.devToken);
        sessionStorage.setItem("resetToken", response.data.devToken);
      }

      setSuccess(true);
    } catch (err) {
      console.error("Forgot password error:", err);
      if (err.code === "ECONNABORTED") {
        setError(
          "Request timed out. Please check your internet connection and try again."
        );
      } else {
        setError(
          err.response?.data?.message ||
            "Failed to send reset email. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const resetToken = sessionStorage.getItem("resetToken");

    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-xl shadow-lg text-center">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4">
              <span className="material-symbols-outlined !text-4xl">
                check_circle
              </span>
            </div>
          </div>

          <h2 className="text-2xl font-black mb-4">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a 6-digit password reset code to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please check your email inbox (and spam folder) for the reset code.
            The code will expire in 1 hour.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              to="/reset-password"
              className="inline-block w-full bg-primary text-white rounded-lg h-12 px-6 text-base font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary leading-[3rem] text-center"
            >
              Enter Reset Code
            </Link>
            <Link
              to="/login"
              className="inline-block w-full border-2 border-gray-300 text-gray-700 rounded-lg h-12 px-6 text-base font-semibold hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 leading-[2.75rem] text-center"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-xl shadow-lg">
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="material-symbols-outlined !text-4xl">lock</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-3xl font-black">Forgot Password?</p>
          <p className="text-gray-600 text-base mt-2">
            No worries, we'll send you reset instructions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email Address
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white h-12 px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/50"
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white rounded-lg h-12 px-6 text-base font-semibold hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-gray-600 hover:text-primary flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined !text-lg">
              arrow_back
            </span>
            Back to Login
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">Don't have an account?</p>
            <Link
              to="/signup"
              className="text-primary font-medium hover:underline"
            >
              Sign up for free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
