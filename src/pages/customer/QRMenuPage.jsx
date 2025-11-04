import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ItemCustomizationModal from "../../components/ItemCustomizationModal";
import CustomerLoginModal from "../../components/CustomerLoginModal";
import FeedbackHistoryModal from "../../components/FeedbackHistoryModal";
import { useAuth } from "../../context/MultiAuthContext";
import { getImageUrlWithFallback } from "../../utils/imageUrl";

const QRMenuPage = () => {
  const { qrSlug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [tableInfo, setTableInfo] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dietaryFilter, setDietaryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [showFilters, setShowFilters] = useState(false);
  const [customizingItem, setCustomizingItem] = useState(null);
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const [customerPoints, setCustomerPoints] = useState(0);
  const [showFeedbackHistory, setShowFeedbackHistory] = useState(false);
  const [activeOrders, setActiveOrders] = useState([]);

  const {
    isCustomerAuthenticated,
    getCustomerSession,
    logout,
    loading: authLoading,
  } = useAuth();

  // Local state to track if we've checked authentication at least once
  const [authChecked, setAuthChecked] = useState(false);

  // Debug logging for authentication state
  useEffect(() => {
    console.log("🔍 QRMenuPage Auth State:", {
      authLoading,
      isCustomerAuthenticated,
      authChecked,
      tableInfo: !!tableInfo,
      restaurantInfo: !!restaurantInfo,
    });
  }, [
    authLoading,
    isCustomerAuthenticated,
    authChecked,
    tableInfo,
    restaurantInfo,
  ]);

  // Mark auth as checked when loading completes
  useEffect(() => {
    if (!authLoading) {
      setAuthChecked(true);
    }
  }, [authLoading]);

  useEffect(() => {
    fetchTableInfo();
  }, [qrSlug]);

  useEffect(() => {
    if (tableInfo) {
      // Set table number in session storage
      sessionStorage.setItem("tableNumber", tableInfo.tableNumber);
      sessionStorage.setItem("restaurantId", tableInfo.restaurantId);
      // Store the QR slug to remember the entry point
      sessionStorage.setItem("qrSlug", qrSlug);
      sessionStorage.setItem("entryPoint", "qr"); // Mark that user entered via QR

      // Debug logging
      console.log("🎯 QR Menu Entry Point Set:");
      console.log("  - Entry Point: qr");
      console.log("  - QR Slug:", qrSlug);
      console.log("  - Table Number:", tableInfo.tableNumber);
      console.log("  - Restaurant ID:", tableInfo.restaurantId);

      // Load cart from localStorage
      const savedCart = localStorage.getItem(`cart_${tableInfo.restaurantId}`);
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }

      fetchMenuData();
      fetchCustomerPoints();
      fetchActiveOrders(); // Fetch active orders on page load
    }
  }, [tableInfo, qrSlug]);

  // Fetch customer points and active orders whenever authentication state changes
  useEffect(() => {
    if (tableInfo && !authLoading) {
      fetchCustomerPoints();
      fetchActiveOrders();
    }
  }, [isCustomerAuthenticated, authLoading, tableInfo]);

  // Auto-show success message when returning after placing order
  useEffect(() => {
    // Check if user just placed an order (cart was cleared but active orders exist)
    if (activeOrders.length > 0 && cart.length === 0 && tableInfo) {
      // Show a success notification
      const lastOrderTime = sessionStorage.getItem("lastOrderTime");
      const now = Date.now();

      // If order was placed in last 10 seconds, show notification
      if (lastOrderTime && now - parseInt(lastOrderTime) < 10000) {
        console.log("🎉 Order placed successfully! Showing active orders.");
        // Clear the flag
        sessionStorage.removeItem("lastOrderTime");
      }
    }
  }, [activeOrders, cart, tableInfo]);

  // Handle page visibility changes (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && tableInfo && !authLoading) {
        // Page became visible again, refresh authentication state and points
        console.log("🔄 Page became visible, refreshing authentication state");
        fetchCustomerPoints();
        fetchActiveOrders();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Also handle window focus events
    const handleFocus = () => {
      if (tableInfo && !authLoading) {
        console.log("🔄 Window focused, refreshing authentication state");
        fetchCustomerPoints();
        fetchActiveOrders();
      }
    };

    window.addEventListener("focus", handleFocus);

    // Listen for auth state changes from the context
    const handleAuthStateChange = (event) => {
      console.log("🔔 Auth state changed event received:", event.detail);
      if (event.detail.type === "customer" && event.detail.isAuthenticated) {
        console.log("✅ Customer logged in, refreshing data...");
        fetchCustomerPoints();
        fetchActiveOrders();
        // Force re-check auth
        setAuthChecked(false);
        setTimeout(() => setAuthChecked(true), 100);
      }
    };

    window.addEventListener("authStateChanged", handleAuthStateChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("authStateChanged", handleAuthStateChange);
    };
  }, [tableInfo, authLoading]);

  const fetchTableInfo = async () => {
    try {
      console.log("🔍 Fetching table info for QR:", qrSlug);
      const response = await axios.get(`/api/restaurant/qr/${qrSlug}`);
      console.log("✅ Table info received:", response.data);
      setTableInfo(response.data);
    } catch (error) {
      console.error("❌ Error fetching table info:", error);
      // Redirect to error page or show error message
      alert(
        "Invalid QR code. Please scan a valid QR code from the restaurant."
      );
      navigate("/");
    }
  };

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      console.log(
        "🔍 Fetching menu data for restaurant:",
        tableInfo.restaurantId
      );

      // Fetch all data in parallel for faster loading
      const [restaurantResponse, categoriesResponse, itemsResponse] =
        await Promise.all([
          axios.get(`/api/restaurant/${tableInfo.restaurantId}`),
          axios.get(
            `/api/menu/categories?restaurantId=${tableInfo.restaurantId}`
          ),
          axios.get(`/api/menu/items?restaurantId=${tableInfo.restaurantId}`),
        ]);

      console.log("✅ All menu data received");
      setRestaurantInfo(restaurantResponse.data);
      setCategories(categoriesResponse.data);
      setItems(itemsResponse.data.items || []);
    } catch (error) {
      console.error("❌ Error fetching menu data:", error);
      alert("Error loading menu. Please try refreshing the page.");
    } finally {
      setLoading(false);
      console.log("🏁 Menu loading complete");
    }
  };

  const fetchCustomerPoints = async () => {
    try {
      const customerSession = getCustomerSession();
      if (customerSession.isAuthenticated && customerSession.user?.email) {
        // Logged in customer - get their personal points across all restaurants
        const response = await axios.get(
          `/api/feedback/customer/email/${encodeURIComponent(
            customerSession.user.email
          )}/orders`
        );
        setCustomerPoints(response.data.totalPoints || 0);
      } else {
        // Guest customer - get points for this table/restaurant session
        if (tableInfo?.restaurantId && tableInfo?.tableNumber) {
          const sessionId = `${tableInfo.restaurantId}-${tableInfo.tableNumber}`;
          const response = await axios.get(
            `/api/feedback/customer/${sessionId}/orders`
          );
          setCustomerPoints(response.data.totalPoints || 0);
        } else {
          setCustomerPoints(0);
        }
      }
    } catch (error) {
      console.error("Error fetching customer points:", error);
      setCustomerPoints(0);
    }
  };

  const fetchActiveOrders = async () => {
    try {
      if (!tableInfo?.restaurantId || !tableInfo?.tableNumber) return;

      const customerSession = getCustomerSession();
      let customerIdentifier;

      if (customerSession.isAuthenticated && customerSession.user?.email) {
        // Logged in customer - use email
        customerIdentifier = customerSession.user.email;
      } else {
        // Guest customer - use table-based identifier
        customerIdentifier = `guest-${tableInfo.restaurantId}-${tableInfo.tableNumber}@temp.com`;
      }

      // Fetch orders that are still active (not delivered/completed)
      const response = await axios.get(`/api/orders/active`, {
        params: {
          restaurantId: tableInfo.restaurantId,
          tableNumber: tableInfo.tableNumber,
          customerEmail: customerIdentifier,
        },
      });

      console.log("Active orders fetched:", response.data);
      setActiveOrders(response.data || []);
    } catch (error) {
      console.error("Error fetching active orders:", error);
      setActiveOrders([]);
    }
  };

  const addToCart = (item, customizations = {}) => {
    const cartItem = {
      ...item,
      customizations,
      cartId: Date.now() + Math.random(),
      quantity: 1,
    };

    const newCart = [...cart, cartItem];
    setCart(newCart);
    localStorage.setItem(
      `cart_${tableInfo.restaurantId}`,
      JSON.stringify(newCart)
    );
  };

  const updateCartItemQuantity = (cartId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartId);
      return;
    }

    const newCart = cart.map((item) =>
      item.cartId === cartId ? { ...item, quantity: newQuantity } : item
    );
    setCart(newCart);
    localStorage.setItem(
      `cart_${tableInfo.restaurantId}`,
      JSON.stringify(newCart)
    );
  };

  const removeFromCart = (cartId) => {
    const newCart = cart.filter((item) => item.cartId !== cartId);
    setCart(newCart);
    localStorage.setItem(
      `cart_${tableInfo.restaurantId}`,
      JSON.stringify(newCart)
    );
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }
    navigate(`/checkout/${tableInfo.restaurantId}`);
  };

  // Filter and sort items
  const getFilteredItems = () => {
    let filtered = items;

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (item) => item.categoryId._id === selectedCategory
      );
    }

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Dietary filter
    if (dietaryFilter !== "all") {
      filtered = filtered.filter((item) =>
        dietaryFilter === "veg" ? item.isVeg : !item.isVeg
      );
    }

    // Price range filter
    if (priceRange !== "all") {
      filtered = filtered.filter((item) => {
        if (priceRange === "budget") return item.price <= 200;
        if (priceRange === "mid") return item.price > 200 && item.price <= 500;
        if (priceRange === "premium") return item.price > 500;
        return true;
      });
    }

    // Sort
    if (sortBy === "price-low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      filtered.sort((a, b) => b.price - a.price);
    }

    return filtered;
  };

  // Only show loading screen for table info - never block the header
  if (!tableInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            Verifying QR code...
          </p>
          <p className="text-gray-500 text-sm mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  if (!tableInfo || !restaurantInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-600">Error loading restaurant information</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          {/* Three-column layout: Left | Center | Right */}
          <div className="grid grid-cols-3 items-center">
            {/* Left: Restaurant Info */}
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {restaurantInfo.restaurantName}
              </h1>
              <p className="text-sm text-gray-600">
                Table {tableInfo.tableNumber}
                {isCustomerAuthenticated && customerPoints > 0 && (
                  <span className="ml-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    {customerPoints} points
                  </span>
                )}
              </p>
            </div>

            {/* Center: Customer Info */}
            <div className="text-center">
              {authLoading ? (
                <div>
                  <p className="text-lg font-medium text-gray-500">
                    Loading...
                  </p>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto mt-1"></div>
                </div>
              ) : isCustomerAuthenticated ? (
                <div>
                  <p className="text-lg font-semibold text-gray-900">
                    {getCustomerSession().user?.name || "Customer"}
                  </p>
                  {customerPoints > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      {customerPoints} points available
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-lg font-medium text-gray-500">Guest User</p>
              )}
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              {/* Order History Button */}
              <button
                onClick={() => {
                  const customerSession = getCustomerSession();
                  if (customerSession.isAuthenticated) {
                    // Logged in customer - show all their orders across restaurants
                    navigate(`/customer/orders?from=${tableInfo.restaurantId}`);
                  } else {
                    // Guest customer - show orders for this table/restaurant
                    navigate(`/customer/history/${tableInfo.restaurantId}`);
                  }
                }}
                className="bg-blue-500 text-white px-3 py-2 rounded-lg font-medium hover:bg-blue-600 flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span className="hidden sm:inline">Orders</span>
              </button>

              {/* Authentication Button - NAVIGATION RESISTANT */}
              {(() => {
                // Check localStorage directly for immediate auth state
                const hasCustomerToken = localStorage.getItem("customer_token");
                const isAuthenticatedImmediate =
                  hasCustomerToken && isCustomerAuthenticated;

                try {
                  // Only show loading if we haven't checked auth yet AND no token exists
                  if (authLoading && !authChecked && !hasCustomerToken) {
                    return (
                      <button
                        disabled
                        className="bg-gray-400 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 cursor-not-allowed"
                      >
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="hidden sm:inline">Loading...</span>
                      </button>
                    );
                  } else if (
                    isAuthenticatedImmediate ||
                    (hasCustomerToken && authChecked)
                  ) {
                    return (
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to logout?")) {
                            await logout("customer");
                            setCustomerPoints(0);
                            fetchCustomerPoints(); // Refresh points for guest session
                          }
                        }}
                        className="bg-red-500 text-white px-3 py-2 rounded-lg font-medium hover:bg-red-600 flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        <span className="hidden sm:inline">Logout</span>
                      </button>
                    );
                  } else {
                    return (
                      <button
                        onClick={() => setShowCustomerLogin(true)}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                          />
                        </svg>
                        <span className="hidden sm:inline">Login</span>
                      </button>
                    );
                  }
                } catch (error) {
                  // Fallback: Always show login button if there's any error
                  console.error("Auth button error:", error);
                  return (
                    <button
                      onClick={() => setShowCustomerLogin(true)}
                      className="bg-green-600 text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      <span className="hidden sm:inline">Login</span>
                    </button>
                  );
                }
              })()}

              {/* Cart Button */}
              <button
                onClick={() => {
                  setShowCart(true);
                  fetchActiveOrders(); // Refresh active orders when opening cart
                }}
                className="relative bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
              >
                <svg
                  className="w-4 h-4 sm:hidden"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8"
                  />
                </svg>
                <span className="hidden sm:inline">Cart</span>
                {(getTotalItems() > 0 || activeOrders.length > 0) && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                    {getTotalItems() + activeOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Rest of the component - search, filters, categories, items display */}
      {/* This would be similar to the existing MenuPage but without table number input */}

      <main className="container mx-auto px-4 py-6">
        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="bg-white p-4 rounded-lg border mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Preference
                  </label>
                  <select
                    value={dietaryFilter}
                    onChange={(e) => setDietaryFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All</option>
                    <option value="veg">Vegetarian</option>
                    <option value="nonveg">Non-Vegetarian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range
                  </label>
                  <select
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="all">All Prices</option>
                    <option value="budget">Under ₹200</option>
                    <option value="mid">₹200 - ₹500</option>
                    <option value="premium">Above ₹500</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="default">Default</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              All Items
            </button>
            {categories.map((category) => (
              <button
                key={category._id}
                onClick={() => setSelectedCategory(category._id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedCategory === category._id
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {getFilteredItems().map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-xl shadow-lg overflow-hidden"
            >
              <div className="relative">
                <img
                  src={getImageUrlWithFallback(
                    item.imageUrl,
                    "https://via.placeholder.com/300x200?text=No+Image"
                  )}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-3 left-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      item.isVeg
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {item.isVeg ? "Veg" : "Non-Veg"}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-2">{item.name}</h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {item.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold text-green-600">
                    ₹{item.price.toFixed(2)}
                  </span>
                  <button
                    onClick={() => {
                      if (item.enableCustomization) {
                        setCustomizingItem(item);
                      } else {
                        addToCart(item);
                      }
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {getFilteredItems().length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              No items found matching your criteria.
            </p>
          </div>
        )}
      </main>

      {/* Enhanced Cart Modal with Active Orders */}
      {showCart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Your Orders & Cart</h3>
                <button
                  onClick={() => setShowCart(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {/* Debug: Show active orders count */}
              {console.log(
                "🛒 Cart Modal - Active Orders:",
                activeOrders.length,
                activeOrders
              )}

              {/* Debug Section - Remove this after testing */}
              <div className="p-2 bg-yellow-50 border-b text-xs">
                <p>Debug: Active Orders Count: {activeOrders.length}</p>
                <p>
                  Table: {tableInfo?.tableNumber}, Restaurant:{" "}
                  {tableInfo?.restaurantId}
                </p>
                <p>Auth: {isCustomerAuthenticated ? "Logged In" : "Guest"}</p>
              </div>

              {/* Active Orders Section */}
              {activeOrders.length > 0 && (
                <div className="p-4 bg-blue-50 border-b">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Active Orders ({activeOrders.length})
                  </h4>
                  <div className="space-y-3">
                    {activeOrders.map((order) => (
                      <div
                        key={order._id}
                        className="bg-white rounded-lg p-3 border border-blue-200"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-sm">
                              Order #{order._id.slice(-6)}
                            </p>
                            <p className="text-xs text-gray-600">
                              {new Date(order.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.status === "placed"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : order.status === "confirmed"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.status === "preparing"
                                  ? "bg-orange-100 text-orange-800"
                                  : order.status === "ready"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {order.status.charAt(0).toUpperCase() +
                                order.status.slice(1)}
                            </span>
                            <p className="text-sm font-semibold text-gray-900 mt-1">
                              ₹{order.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {order.items.map((item, index) => (
                            <div
                              key={index}
                              className="flex justify-between text-sm"
                            >
                              <span className="text-gray-700">
                                {item.name} × {item.quantity}
                              </span>
                              <span className="text-gray-600">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => navigate(`/order/${order._id}`)}
                          className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Track Order →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Cart Items Section */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h8"
                    />
                  </svg>
                  New Order ({cart.length} items)
                </h4>

                {cart.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Add items to start a new order
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => (
                      <div
                        key={item.cartId}
                        className="flex gap-3 p-3 border rounded-lg"
                      >
                        <img
                          src={getImageUrlWithFallback(
                            item.imageUrl,
                            "https://via.placeholder.com/60x60?text=No+Image"
                          )}
                          alt={item.name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.name}</h4>
                          <p className="text-sm text-gray-600">
                            ₹{item.price.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() =>
                                updateCartItemQuantity(
                                  item.cartId,
                                  item.quantity - 1
                                )
                              }
                              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                            >
                              -
                            </button>
                            <span className="font-semibold">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateCartItemQuantity(
                                  item.cartId,
                                  item.quantity + 1
                                )
                              }
                              className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                            >
                              +
                            </button>
                            <button
                              onClick={() => removeFromCart(item.cartId)}
                              className="ml-auto text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Checkout Section */}
            {cart.length > 0 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-lg font-bold">
                    New Order Total: ₹{getTotalPrice().toFixed(2)}
                  </span>
                  <span className="text-sm text-gray-600">
                    ({getTotalItems()} items)
                  </span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700"
                >
                  Place New Order
                </button>
                {activeOrders.length > 0 && (
                  <p className="text-xs text-gray-600 text-center mt-2">
                    This will be a separate order from your active orders above
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {customizingItem && (
        <ItemCustomizationModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={addToCart}
        />
      )}

      {showCustomerLogin && (
        <CustomerLoginModal
          onClose={() => setShowCustomerLogin(false)}
          onSuccess={() => {
            console.log("🎉 Login successful! Refreshing auth state...");
            setShowCustomerLogin(false);
            // Force a small delay to ensure auth context has updated
            setTimeout(() => {
              fetchCustomerPoints();
              fetchActiveOrders();
              // Force re-render by updating a state
              setAuthChecked(false);
              setTimeout(() => setAuthChecked(true), 100);
            }, 300);
          }}
        />
      )}

      {showFeedbackHistory && (
        <FeedbackHistoryModal
          restaurantId={tableInfo.restaurantId}
          tableNumber={tableInfo.tableNumber}
          onClose={() => setShowFeedbackHistory(false)}
        />
      )}
    </div>
  );
};

export default QRMenuPage;
