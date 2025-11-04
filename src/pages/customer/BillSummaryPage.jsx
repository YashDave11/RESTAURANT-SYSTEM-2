import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Award, Receipt, CreditCard, Gift } from "lucide-react";
import axios from "axios";
import { getImageUrlWithFallback } from "../../utils/imageUrl";
import { useAuth } from "../../context/MultiAuthContext";

const BillSummaryPage = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const { isCustomerAuthenticated, getCustomerSession } = useAuth();
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [cart, setCart] = useState([]);
  const [tableNumber, setTableNumber] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [customerPoints, setCustomerPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    // Get cart from localStorage
    const savedCart = localStorage.getItem(`cart_${restaurantId}`);
    const savedTable = sessionStorage.getItem("tableNumber");
    const savedInstructions =
      localStorage.getItem(`instructions_${restaurantId}`) || "";

    console.log("BillSummaryPage - Loading data:", {
      hasCart: !!savedCart,
      hasTable: !!savedTable,
      isAuthenticated: isCustomerAuthenticated,
      restaurantId,
    });

    if (!savedCart || !savedTable) {
      console.log("Missing cart or table, redirecting to menu");
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
    setSpecialInstructions(savedInstructions);

    fetchRestaurantInfo();
    if (isCustomerAuthenticated) {
      fetchCustomerPoints();
    }
  }, [restaurantId, navigate, isCustomerAuthenticated]);

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

  const fetchCustomerPoints = async () => {
    try {
      const customerSession = getCustomerSession();
      console.log("Fetching customer points for session:", customerSession);

      if (customerSession.isAuthenticated && customerSession.user?.email) {
        const response = await axios.get(
          `/api/feedback/customer/email/${encodeURIComponent(
            customerSession.user.email
          )}/orders`
        );
        console.log("Customer points response:", response.data);
        setCustomerPoints(response.data.totalPoints || 0);
      } else {
        console.log("Customer not authenticated, skipping points fetch");
      }
    } catch (error) {
      console.error("Error fetching customer points:", error);
      setCustomerPoints(0);
    }
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getDiscountAmount = () => {
    // 1 point = ₹1 discount
    return pointsToRedeem;
  };

  const getFinalTotal = () => {
    return Math.max(0, getSubtotal() - getDiscountAmount());
  };

  const getMaxRedeemablePoints = () => {
    // Can't redeem more points than available or more than the bill amount
    return Math.min(customerPoints, Math.floor(getSubtotal()));
  };

  const handlePointsChange = (value) => {
    const maxPoints = getMaxRedeemablePoints();
    const points = Math.max(0, Math.min(maxPoints, parseInt(value) || 0));
    setPointsToRedeem(points);
  };

  const handlePlaceOrder = async () => {
    setPlacing(true);
    try {
      const customerSession = getCustomerSession();

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
        totalAmount: getFinalTotal(),
        originalAmount: getSubtotal(),
        pointsRedeemed: pointsToRedeem,
        discountAmount: getDiscountAmount(),
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

      console.log("Placing order with data:", orderData);
      console.log("Making POST request to:", "/api/orders");
      console.log("Full URL would be:", `${window.location.origin}/api/orders`);

      const { data } = await axios.post("/api/orders", orderData);
      console.log("Order placed successfully:", data);

      // If points were redeemed, update customer points
      if (pointsToRedeem > 0 && customerSession.isAuthenticated) {
        console.log("Redeeming points:", pointsToRedeem);
        await axios.post("/api/feedback/redeem-points", {
          email: customerSession.user.email,
          pointsToRedeem: pointsToRedeem,
        });
        console.log("Points redeemed successfully");
      }

      // Clear cart and instructions
      localStorage.removeItem(`cart_${restaurantId}`);
      localStorage.removeItem(`instructions_${restaurantId}`);

      // Set timestamp for order placement (for showing success message)
      sessionStorage.setItem("lastOrderTime", Date.now().toString());

      // Redirect to order tracking
      navigate(`/order/${data._id}`);
    } catch (error) {
      console.error("Order placement error:", error);
      console.error("Error details:", error.response?.data);
      alert(
        "Error placing order: " +
          (error.response?.data?.message || error.message)
      );
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bill summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/checkout/${restaurantId}`)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Receipt className="w-6 h-6 text-green-600" />
              <div>
                <h1 className="text-xl font-bold">Bill Summary</h1>
                <p className="text-sm text-gray-600">
                  {restaurantInfo?.restaurantName} • Table {tableNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Order Details
          </h2>

          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item._id}
                className="flex justify-between items-start pb-4 border-b last:border-b-0"
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

          {specialInstructions && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-600 mb-1">
                Special Instructions:
              </p>
              <p className="text-sm bg-gray-50 p-3 rounded-lg">
                {specialInstructions}
              </p>
            </div>
          )}
        </div>

        {/* Points Redemption - Only for logged in customers */}
        {isCustomerAuthenticated && customerPoints > 0 && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-purple-100 rounded-full p-2">
                <Award className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-purple-900">
                  Redeem Points
                </h3>
                <p className="text-sm text-purple-700">
                  You have {customerPoints} points available • 1 point = ₹1
                  discount
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-900 mb-2">
                  Points to redeem (max: {getMaxRedeemablePoints()})
                </label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    min="0"
                    max={getMaxRedeemablePoints()}
                    value={pointsToRedeem}
                    onChange={(e) => handlePointsChange(e.target.value)}
                    className="flex-1 px-4 py-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter points to redeem"
                  />
                  <button
                    onClick={() => setPointsToRedeem(getMaxRedeemablePoints())}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                  >
                    Max
                  </button>
                </div>
              </div>

              {pointsToRedeem > 0 && (
                <div className="bg-white rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center gap-2 text-green-600">
                    <Gift className="w-5 h-5" />
                    <span className="font-semibold">
                      You'll save ₹{getDiscountAmount().toFixed(2)} with{" "}
                      {pointsToRedeem} points!
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bill Summary */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Summary
          </h2>

          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal ({getTotalItems()} items)</span>
              <span>₹{getSubtotal().toFixed(2)}</span>
            </div>

            {pointsToRedeem > 0 && (
              <div className="flex justify-between text-purple-600">
                <span>Points Discount ({pointsToRedeem} points)</span>
                <span>-₹{getDiscountAmount().toFixed(2)}</span>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="flex justify-between text-xl font-bold">
                <span>Total Amount</span>
                <span className="text-green-600">
                  ₹{getFinalTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={placing}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {placing
            ? "Placing Order..."
            : `Confirm Order - ₹${getFinalTotal().toFixed(2)}`}
        </button>

        {pointsToRedeem > 0 && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 text-center">
              <strong>Note:</strong> {pointsToRedeem} points will be deducted
              from your account after order confirmation. You can earn new
              points by providing feedback on this order.
            </p>
          </div>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          Your order will be sent to the kitchen immediately after confirmation
        </p>
      </main>
    </div>
  );
};

export default BillSummaryPage;
