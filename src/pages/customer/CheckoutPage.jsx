import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/MultiAuthContext";
import { getImageUrlWithFallback } from "../../utils/imageUrl";
import CustomerLoginModal from "../../components/CustomerLoginModal";

const CheckoutPage = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const {
    isCustomerAuthenticated,
    getCustomerSession,
    loading: authLoading,
  } = useAuth();
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before checking
    if (authLoading) {
      console.log("⏳ Waiting for auth to load...");
      return;
    }

    console.log("🔍 CheckoutPage - Auth check:", {
      isCustomerAuthenticated,
      authLoading,
      hasToken: !!localStorage.getItem("customer_token"),
    });

    // Check authentication first - login is REQUIRED
    if (!isCustomerAuthenticated) {
      // Show login modal - must login to proceed
      console.log("❌ Not authenticated, showing login modal");
      setShowLoginModal(true);
      setLoading(false);
      return;
    }

    console.log("✅ User is authenticated, loading cart...");

    // User is authenticated, load cart and proceed
    const savedCart = localStorage.getItem(`cart_${restaurantId}`);
    const savedTable = sessionStorage.getItem("tableNumber");

    if (!savedCart || !savedTable) {
      // Navigate back to QR menu or home
      const qrSlug = sessionStorage.getItem("qrSlug");
      if (qrSlug) {
        navigate(`/t/${qrSlug}`);
      } else {
        navigate("/");
      }
      return;
    }

    setCart(JSON.parse(savedCart));
    setTableNumber(savedTable);
    fetchRestaurantInfo();
  }, [restaurantId, navigate, isCustomerAuthenticated, authLoading]);

  // Listen for auth state changes from login modal
  useEffect(() => {
    const handleAuthStateChange = (event) => {
      console.log("🔔 CheckoutPage - Auth state changed:", event.detail);
      if (event.detail.type === "customer" && event.detail.isAuthenticated) {
        console.log("✅ Customer logged in, closing modal and loading data");
        setShowLoginModal(false);

        // Load cart and restaurant data
        const savedCart = localStorage.getItem(`cart_${restaurantId}`);
        const savedTable = sessionStorage.getItem("tableNumber");

        if (savedCart && savedTable) {
          setCart(JSON.parse(savedCart));
          setTableNumber(savedTable);
          fetchRestaurantInfo();
        }
      }
    };

    window.addEventListener("authStateChanged", handleAuthStateChange);

    return () => {
      window.removeEventListener("authStateChanged", handleAuthStateChange);
    };
  }, [restaurantId]);

  const fetchRestaurantInfo = async () => {
    try {
      const { data } = await axios.get(`/api/restaurant/${restaurantId}`);
      setRestaurantInfo(data);
    } catch (error) {
      console.error("Error fetching restaurant:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const customerSession = getCustomerSession();
      console.log("Customer session:", customerSession);
      console.log("Cart items:", cart);

      const orderData = {
        restaurantId,
        tableNumber,
        items: cart.map((item) => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        specialInstructions,
        totalAmount: getTotalPrice(),
        customerInfo:
          customerSession.isAuthenticated && customerSession.user
            ? {
                userId: customerSession.user._id,
                email: customerSession.user.email,
                name: customerSession.user.name,
                phone: customerSession.user.phone,
              }
            : null,
      };

      console.log("Order data being sent:", orderData);

      const { data } = await axios.post("/api/orders", orderData);

      // Clear cart
      localStorage.removeItem(`cart_${restaurantId}`);

      // Redirect to order tracking
      navigate(`/order/${data._id}`);
    } catch (error) {
      console.error("Order placement error:", error);
      console.error("Error response:", error.response?.data);
      alert(
        "Error placing order: " +
          (error.response?.data?.message || error.message)
      );
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                // Navigate back to QR menu
                const qrSlug = sessionStorage.getItem("qrSlug");

                // Debug logging
                console.log("🔙 Back button clicked");
                console.log("QR Slug:", qrSlug);

                if (qrSlug) {
                  console.log("✅ Navigating to QR menu:", `/t/${qrSlug}`);
                  navigate(`/t/${qrSlug}`);
                } else {
                  console.log("⚠️ No QR slug found, redirecting to home");
                  navigate("/");
                }
              }}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold">Checkout</h1>
              <p className="text-sm text-gray-600">
                {restaurantInfo?.restaurantName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Logged In User Info */}
        {isCustomerAuthenticated && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-4 mb-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">
                  Logged in as
                </p>
                <p className="font-semibold text-green-900">
                  {getCustomerSession().user?.name ||
                    getCustomerSession().user?.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Table Info */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Table Number</p>
              <p className="text-xl font-bold">{tableNumber}</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div
          className="bg-white rounded-lg shadow-md p-4 mb-4 animate-fadeIn"
          style={{ animationDelay: "0.1s" }}
        >
          <h2 className="text-lg font-bold mb-4">Order Summary</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item._id}
                className="flex justify-between items-start pb-3 border-b last:border-b-0"
              >
                <div className="flex gap-3 flex-1">
                  <img
                    src={getImageUrlWithFallback(
                      item.imageUrl,
                      "https://via.placeholder.com/60x60?text=No+Image"
                    )}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-gray-600">
                      ₹{item.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                </div>
                <p className="font-bold text-green-600">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                Subtotal ({getTotalItems()} items)
              </span>
              <span className="font-semibold">
                ₹{getTotalPrice().toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-green-600">
                ₹{getTotalPrice().toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Special Instructions */}
        <div
          className="bg-white rounded-lg shadow-md p-4 mb-4 animate-fadeIn"
          style={{ animationDelay: "0.2s" }}
        >
          <h2 className="text-lg font-bold mb-3">Special Instructions</h2>
          <textarea
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
            rows="3"
            placeholder="Any special requests? (e.g., less spicy, no onions)"
          />
        </div>

        {/* Proceed to Bill Summary Button */}
        <button
          onClick={() => {
            // Save special instructions to localStorage
            localStorage.setItem(
              `instructions_${restaurantId}`,
              specialInstructions
            );
            // Navigate to bill summary page
            navigate(`/bill-summary/${restaurantId}`);
          }}
          className="w-full bg-green-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-green-700 btn-animate animate-fadeIn"
          style={{ animationDelay: "0.3s" }}
        >
          Proceed to Checkout - ₹{getTotalPrice().toFixed(2)}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          Your order will be sent to the kitchen immediately
        </p>
      </main>

      {/* Required Login Modal */}
      {showLoginModal && (
        <CustomerLoginModal
          onClose={() => {
            // Don't allow closing - login is required
            // Navigate back to menu instead
            const qrSlug = sessionStorage.getItem("qrSlug");
            if (qrSlug) {
              navigate(`/t/${qrSlug}`);
            } else {
              navigate("/");
            }
          }}
          onSuccess={() => {
            console.log("🎉 Login successful in CheckoutPage!");
            setShowLoginModal(false);

            // Don't reload - just wait for auth context to update
            // The useEffect will automatically re-run when isCustomerAuthenticated changes
            setTimeout(() => {
              // Force a re-check by updating loading state
              setLoading(true);
              setTimeout(() => {
                const savedCart = localStorage.getItem(`cart_${restaurantId}`);
                const savedTable = sessionStorage.getItem("tableNumber");

                if (savedCart && savedTable) {
                  setCart(JSON.parse(savedCart));
                  setTableNumber(savedTable);
                  fetchRestaurantInfo();
                }
              }, 100);
            }, 300);
          }}
        />
      )}
    </div>
  );
};

export default CheckoutPage;
