import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  QrCode,
  Users,
  BarChart3,
  Zap,
  TrendingUp,
  AlertCircle,
  Clock,
  FileText,
  Smartphone,
  Bell,
  Lock,
  Utensils,
  Coffee,
  Wine,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-sm shadow-lg">
                QR
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                MenuFlow
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                How It Works
              </a>
              <a
                href="#faq"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                FAQ
              </a>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/restaurant/login")}
                className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Log in
              </button>
              <button
                onClick={() => navigate("/restaurant/signup")}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold text-sm transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-40 lg:py-48">
        <div className="absolute inset-0 bg-gradient-to-b from-green-50 via-white to-white pointer-events-none" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div className="flex flex-col gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-green-100 px-4 py-2 border border-green-200">
                <Sparkles className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700">
                  No app download required
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight">
                  Transform Your Restaurant with QR Ordering
                </h1>
                <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-lg font-medium">
                  Contactless ordering, real-time tracking, and seamless table
                  service. Reduce wait times by 40% and boost customer
                  satisfaction instantly.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => navigate("/restaurant/signup")}
                  className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all group flex items-center justify-center"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => navigate("/restaurant/login")}
                  className="px-8 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-full font-semibold transition-all"
                >
                  Watch Demo
                </button>
              </div>

              <div className="flex items-center gap-6 pt-4 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-gray-900 font-medium">
                    Works on any device
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span className="text-gray-900 font-medium">
                    No setup required
                  </span>
                </div>
              </div>
            </div>

            <div className="relative h-96 sm:h-[500px] lg:h-[550px]">
              <div className="absolute inset-0 rounded-3xl border border-green-200 shadow-2xl overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop"
                  alt="Customer scanning QR code on phone at restaurant"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-green-900/20 to-transparent"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Say Goodbye to Traditional Menus
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              Modern restaurants need modern solutions. Here's what's holding
              you back.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: FileText,
                title: "Paper Menus Are Outdated",
                desc: "Unhygienic, difficult to update, and bad for the environment",
              },
              {
                icon: Clock,
                title: "Waiting Slows Service",
                desc: "Customers wait for waiters, orders get delayed, tables turn slower",
              },
              {
                icon: AlertCircle,
                title: "Manual Errors Happen",
                desc: "Miscommunication leads to wrong orders and unhappy customers",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="p-8 border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-lg transition-all duration-300 group bg-white"
              >
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors mb-6">
                  <item.icon className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="py-20 sm:py-32 bg-green-50 relative overflow-hidden"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              How It Works
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              Three simple steps to transform your restaurant operations
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "1",
                title: "Scan QR Code",
                desc: "Customer scans table QR code with their phone",
                icon: QrCode,
              },
              {
                num: "2",
                title: "Browse & Order",
                desc: "View menu, add items to cart, place order instantly",
                icon: Users,
              },
              {
                num: "3",
                title: "Track Status",
                desc: "Real-time order progress from placed to ready",
                icon: BarChart3,
              },
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white font-bold text-xl shadow-lg group-hover:shadow-xl transition-shadow">
                    {step.num}
                  </div>
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors">
                    <step.icon className="h-7 w-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 -right-4 text-green-200 text-3xl font-light">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Powerful Features for Everyone
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto font-medium">
              Designed for customers, staff, and admins
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Customers */}
            <div className="p-8 border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-lg transition-all duration-300 bg-white">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-green-100 mb-6">
                <Users className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                For Customers
              </h3>
              <ul className="space-y-4">
                {[
                  "Browse menu by categories",
                  "Search items instantly",
                  "Add custom notes to orders",
                  "No app download needed",
                  "Track order in real-time",
                  "Call waiter with one tap",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-900 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Staff - Highlighted */}
            <div className="p-8 border-2 border-green-500 ring-1 ring-green-200 shadow-xl hover:shadow-2xl transition-all duration-300 relative overflow-hidden bg-white">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-100 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-green-100 mb-6">
                  <Bell className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">
                  For Staff
                </h3>
                <ul className="space-y-4">
                  {[
                    "Live order queue dashboard",
                    "Kanban-style order management",
                    "Sound notifications for new orders",
                    "Search and filter by table/status",
                    "One-click status updates",
                    "Reduce order processing time",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-900 font-medium">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Admins */}
            <div className="p-8 border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-lg transition-all duration-300 bg-white">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-green-100 mb-6">
                <Lock className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                For Admins
              </h3>
              <ul className="space-y-4">
                {[
                  "Complete menu management",
                  "Category organization",
                  "Toggle item availability",
                  "Table management",
                  "Generate & print QR codes",
                  "Analytics & insights",
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-900 font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 sm:py-32 bg-green-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Why Restaurants Love MenuFlow
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: Zap,
                stat: "40%",
                label: "Faster Service",
                desc: "Reduce order time significantly",
              },
              {
                icon: TrendingUp,
                stat: "35%",
                label: "More Revenue",
                desc: "Boost table turnover",
              },
              {
                icon: Check,
                stat: "99%",
                label: "Fewer Errors",
                desc: "Eliminate miscommunication",
              },
              {
                icon: BarChart3,
                stat: "Real-time",
                label: "Better Insights",
                desc: "Track popular items",
              },
            ].map((benefit, i) => (
              <div
                key={i}
                className="p-8 text-center border border-gray-200 rounded-xl hover:border-green-300 hover:shadow-lg transition-all duration-300 group bg-white"
              >
                <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-green-100 group-hover:bg-green-200 transition-colors mb-4 mx-auto">
                  <benefit.icon className="h-7 w-7 text-green-600" />
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {benefit.stat}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">
                  {benefit.label}
                </h3>
                <p className="text-sm text-gray-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 sm:py-32 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900">
              Perfect for Any Restaurant
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Utensils,
                title: "Fast Casual",
                desc: "Quick service restaurants",
              },
              {
                icon: Wine,
                title: "Fine Dining",
                desc: "Upscale table service",
              },
              {
                icon: Coffee,
                title: "Cafés & Bars",
                desc: "Coffee shops and lounges",
              },
            ].map((useCase, i) => (
              <div
                key={i}
                className="p-8 border border-gray-200 rounded-xl text-center hover:border-green-300 hover:shadow-lg transition-all duration-300 group bg-white"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-green-100 group-hover:bg-green-200 transition-colors mb-4 mx-auto">
                  <useCase.icon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {useCase.title}
                </h3>
                <p className="text-gray-600">{useCase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 sm:py-32 bg-green-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Ready to Modernize Your Restaurant?
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto font-medium">
            Join restaurants already using MenuFlow to streamline operations and
            delight customers.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/restaurant/signup")}
              className="px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all group flex items-center justify-center"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/restaurant/login")}
              className="px-8 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 rounded-full font-semibold transition-all"
            >
              Schedule a Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a
                    href="#features"
                    className="hover:text-gray-900 transition-colors font-medium"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors font-medium"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors font-medium"
                  >
                    Demo
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors font-medium"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors font-medium"
                  >
                    Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors font-medium"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors font-medium"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors font-medium"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-gray-900 transition-colors font-medium"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 text-center">
            <p className="text-sm text-gray-600 font-medium">
              © 2025 MenuFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
