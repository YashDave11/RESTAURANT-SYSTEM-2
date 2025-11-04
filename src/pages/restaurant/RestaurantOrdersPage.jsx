import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../context/MultiAuthContext";

const RestaurantOrdersPage = () => {
  const navigate = useNavigate();
  const {
    isRestaurantAuthenticated,
    getToken,
    loading: authLoading,
  } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showWaitTimeModal, setShowWaitTimeModal] = useState(false);
  const [waitTime, setWaitTime] = useState("");
  const [showTotalOrdersModal, setShowTotalOrdersModal] = useState(false);
  const [totalOrdersData, setTotalOrdersData] = useState(null);
  const [totalOrdersLoading, setTotalOrdersLoading] = useState(false);

  // Check restaurant authentication - only after loading is complete
  useEffect(() => {
    if (!authLoading && !isRestaurantAuthenticated) {
      console.log("[Orders] Not authenticated, redirecting to login");
      navigate("/restaurant/login");
    }
  }, [authLoading, isRestaurantAuthenticated, navigate]);

  useEffect(() => {
    // Set axios authorization header - use restaurant token
    const token = getToken("restaurant");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      console.log("[Orders] Set restaurant token for API calls");
    } else {
      console.error("[Orders] No restaurant token found!");
    }

    if (isRestaurantAuthenticated) {
      fetchOrders();
      // Auto-refresh every 10 seconds
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [isRestaurantAuthenticated]);

  const fetchOrders = async () => {
    try {
      console.log("[Orders] Fetching orders...");
      const { data } = await axios.get(
        "/api/orders?status=placed,preparing,ready"
      );
      console.log("[Orders] Received orders:", data);
      setOrders(data);
    } catch (error) {
      console.error("[Orders] Error fetching orders:", error);
      console.error("[Orders] Error response:", error.response?.data);
      console.error("[Orders] Error status:", error.response?.status);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = (order) => {
    setSelectedOrder(order);
    setShowWaitTimeModal(true);
  };

  const handleSetWaitTime = async () => {
    if (!waitTime || !selectedOrder) return;

    try {
      const readyTime = new Date();
      readyTime.setMinutes(readyTime.getMinutes() + parseInt(waitTime));

      await axios.patch(`/api/orders/${selectedOrder._id}/status`, {
        status: "preparing",
        estimatedWaitTime: parseInt(waitTime),
        estimatedReadyTime: readyTime.toISOString(),
      });

      setShowWaitTimeModal(false);
      setWaitTime("");
      setSelectedOrder(null);
      fetchOrders();
    } catch (error) {
      alert(
        "Error updating order: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleMarkReady = async (orderId) => {
    try {
      await axios.patch(`/api/orders/${orderId}/status`, {
        status: "ready",
      });
      fetchOrders();
    } catch (error) {
      alert(
        "Error updating order: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleMarkDelivered = async (orderId) => {
    if (!confirm("Mark this order as delivered?")) return;

    try {
      await axios.patch(`/api/orders/${orderId}/status`, {
        status: "delivered",
      });
      fetchOrders();
    } catch (error) {
      alert(
        "Error updating order: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const getOrdersByStatus = (status) => {
    return orders.filter((o) => o.status === status);
  };

  const getNewOrdersCount = () => {
    return getOrdersByStatus("placed").length;
  };

  const fetchTotalOrders = async () => {
    try {
      setTotalOrdersLoading(true);
      console.log("Fetching total orders with feedback...");

      // Check if we have the right token
      const token = getToken("restaurant");
      console.log("Restaurant token available:", !!token);

      // First test the debug endpoint
      try {
        const debugResponse = await axios.get("/api/orders/debug");
        console.log("Debug endpoint response:", debugResponse.data);
      } catch (debugError) {
        console.error("Debug endpoint failed:", debugError.response?.data);
        throw new Error(
          `Authentication failed: ${
            debugError.response?.data?.message || debugError.message
          }`
        );
      }

      // Now fetch the actual data
      const { data } = await axios.get("/api/orders/all-with-feedback");
      console.log("Total orders response:", data);
      setTotalOrdersData(data);
    } catch (error) {
      console.error("Error fetching total orders:", error);
      console.error("Error details:", error.response?.data);
      console.error("Error status:", error.response?.status);
      alert(
        `Failed to fetch order history: ${
          error.response?.data?.message || error.message
        }`
      );
    } finally {
      setTotalOrdersLoading(false);
    }
  };

  const handleShowTotalOrders = () => {
    setShowTotalOrdersModal(true);
    fetchTotalOrders();
  };

  const renderStars = (rating) => {
    if (!rating)
      return <span className="text-gray-400 text-sm">No rating</span>;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            }`}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    );
  };

  const OrderCard = ({ order }) => {
    const getReadyByTime = () => {
      if (order.estimatedReadyTime) {
        return new Date(order.estimatedReadyTime).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      return null;
    };

    return (
      <div className="bg-white rounded-xl shadow-md p-4 hover:shadow-xl hover:scale-105 transition-all duration-300 animate-fadeIn">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="font-bold text-xl">Table {order.tableNumber}</p>
            <p className="text-xs text-gray-500">
              Order #{order._id.slice(-6).toUpperCase()}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {new Date(order.createdAt).toLocaleTimeString()}
            </p>
          </div>
          {order.status === "placed" && (
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded animate-bounce">
              NEW
            </span>
          )}
        </div>

        <div className="mb-3">
          <p className="text-sm font-semibold text-gray-700 mb-2">Items:</p>
          <ul className="text-sm space-y-1">
            {order.items.map((item, idx) => (
              <li key={idx} className="flex justify-between">
                <span>
                  <span className="font-semibold">{item.quantity}x</span>{" "}
                  {item.name}
                </span>
                <span className="text-gray-600">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {order.specialInstructions && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-xs font-semibold text-yellow-800 mb-1">
              Special Instructions:
            </p>
            <p className="text-sm text-yellow-900">
              {order.specialInstructions}
            </p>
          </div>
        )}

        <div className="flex justify-between items-center pt-3 border-t">
          <div>
            {order.pointsRedeemed > 0 ? (
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  ₹
                  {order.originalAmount?.toFixed(2) ||
                    order.totalAmount.toFixed(2)}{" "}
                  - ({order.pointsRedeemed} points)
                </p>
                <p className="font-bold text-lg text-green-600">
                  ₹{order.totalAmount.toFixed(2)}
                </p>
              </div>
            ) : (
              <p className="font-bold text-lg text-green-600">
                ₹{order.totalAmount.toFixed(2)}
              </p>
            )}
          </div>

          {order.status === "placed" && (
            <button
              onClick={() => handleAcceptOrder(order)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700"
            >
              Accept Order
            </button>
          )}

          {order.status === "preparing" && (
            <div className="text-right">
              {getReadyByTime() && (
                <p className="text-sm text-gray-600 mb-2">
                  Ready by:{" "}
                  <span className="font-semibold">{getReadyByTime()}</span>
                </p>
              )}
              <button
                onClick={() => handleMarkReady(order._id)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                Mark as Ready
              </button>
            </div>
          )}

          {order.status === "ready" && (
            <button
              onClick={() => handleMarkDelivered(order._id)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700"
            >
              Delivered
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/restaurant/dashboard")}
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
                <h1 className="text-xl font-bold">Orders</h1>
                <p className="text-sm text-gray-600">Manage incoming orders</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleShowTotalOrders}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2"
              >
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
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Total Orders
              </button>
              {getNewOrdersCount() > 0 && (
                <div className="bg-red-500 text-white px-4 py-2 rounded-full font-bold animate-pulse">
                  {getNewOrdersCount()} New Order
                  {getNewOrdersCount() > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Placed Orders */}
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-lg bg-white border-l-4 border-blue-500 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                New Orders
                <span className="text-base font-medium text-gray-500">
                  ({getOrdersByStatus("placed").length})
                </span>
              </h3>
            </div>
            <div className="flex flex-col gap-4">
              {getOrdersByStatus("placed").length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                  <svg
                    className="w-16 h-16 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">
                    No new orders
                  </p>
                </div>
              ) : (
                getOrdersByStatus("placed").map((order) => (
                  <OrderCard key={order._id} order={order} />
                ))
              )}
            </div>
          </div>

          {/* Preparing Orders */}
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-lg bg-white border-l-4 border-orange-500 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                Preparing
                <span className="text-base font-medium text-gray-500">
                  ({getOrdersByStatus("preparing").length})
                </span>
              </h3>
            </div>
            <div className="flex flex-col gap-4">
              {getOrdersByStatus("preparing").length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                  <svg
                    className="w-16 h-16 text-gray-400 mb-4"
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
                  <p className="text-sm font-medium text-gray-500">
                    No orders in preparation
                  </p>
                </div>
              ) : (
                getOrdersByStatus("preparing").map((order) => (
                  <OrderCard key={order._id} order={order} />
                ))
              )}
            </div>
          </div>

          {/* Ready Orders */}
          <div className="flex flex-col gap-4">
            <div className="p-4 rounded-lg bg-white border-l-4 border-green-500 shadow-sm">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                Ready for Pickup
                <span className="text-base font-medium text-gray-500">
                  ({getOrdersByStatus("ready").length})
                </span>
              </h3>
            </div>
            <div className="flex flex-col gap-4">
              {getOrdersByStatus("ready").length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-white">
                  <svg
                    className="w-16 h-16 text-gray-400 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-500">
                    No orders ready
                  </p>
                </div>
              ) : (
                getOrdersByStatus("ready").map((order) => (
                  <OrderCard key={order._id} order={order} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Total Orders Modal */}
      {showTotalOrdersModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowTotalOrdersModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
                <div>
                  <h2 className="text-2xl font-bold">All Orders & Feedback</h2>
                  <p className="text-sm text-gray-600">
                    Complete order history with customer feedback
                  </p>
                </div>
                <button
                  onClick={() => setShowTotalOrdersModal(false)}
                  className="text-gray-500 hover:text-gray-700"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {totalOrdersLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading order history...</p>
                  </div>
                ) : totalOrdersData ? (
                  <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-2xl font-bold text-blue-600">
                          {totalOrdersData.summary.totalOrders}
                        </h3>
                        <p className="text-sm text-blue-700">Total Orders</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="text-2xl font-bold text-green-600">
                          {totalOrdersData.summary.ordersWithFeedback}
                        </h3>
                        <p className="text-sm text-green-700">
                          Orders with Feedback
                        </p>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h3 className="text-2xl font-bold text-yellow-600">
                          {totalOrdersData.summary.totalFeedbackPoints}
                        </h3>
                        <p className="text-sm text-yellow-700">
                          Total Points Given
                        </p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h3 className="text-2xl font-bold text-purple-600">
                          {totalOrdersData.summary.averageRating}★
                        </h3>
                        <p className="text-sm text-purple-700">
                          Average Rating
                        </p>
                      </div>
                    </div>

                    {/* Orders List */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        Order History ({totalOrdersData.orders.length})
                      </h3>
                      {totalOrdersData.orders.map((order, orderIndex) => (
                        <div
                          key={orderIndex}
                          className="border border-gray-200 rounded-lg overflow-hidden"
                        >
                          {/* Order Header */}
                          <div className="bg-gray-50 px-4 py-3 border-b">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-4">
                                <div>
                                  <p className="font-semibold">
                                    Order #
                                    {order.orderId
                                      .toString()
                                      .slice(-6)
                                      .toUpperCase()}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {new Date(
                                      order.orderDate
                                    ).toLocaleDateString()}{" "}
                                    •{" "}
                                    {new Date(
                                      order.orderDate
                                    ).toLocaleTimeString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-600">
                                    Table {order.tableNumber}
                                  </span>
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      order.status === "delivered"
                                        ? "bg-green-100 text-green-700"
                                        : order.status === "ready"
                                        ? "bg-blue-100 text-blue-700"
                                        : order.status === "preparing"
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-gray-100 text-gray-700"
                                    }`}
                                  >
                                    {order.status.charAt(0).toUpperCase() +
                                      order.status.slice(1)}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                {order.pointsRedeemed > 0 ? (
                                  <div>
                                    <p className="text-xs text-gray-500">
                                      ₹
                                      {order.originalAmount?.toFixed(2) ||
                                        order.totalAmount.toFixed(2)}{" "}
                                      - ({order.pointsRedeemed} pts)
                                    </p>
                                    <p className="font-semibold">
                                      ₹{order.totalAmount.toFixed(2)}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="font-semibold">
                                    ₹{order.totalAmount.toFixed(2)}
                                  </p>
                                )}
                                {order.feedbackSubmitted ? (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-green-600 font-medium">
                                      +{order.totalFeedbackPoints} pts
                                    </span>
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                      Feedback Given
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500 mt-1 block">
                                    No feedback
                                  </span>
                                )}
                              </div>
                            </div>
                            {order.customerEmail && (
                              <p className="text-sm text-gray-600 mt-1">
                                Customer: {order.customerEmail}
                              </p>
                            )}
                          </div>

                          {/* Order Items */}
                          <div className="p-4">
                            <div className="space-y-3">
                              {order.items.map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                                >
                                  <img
                                    src={
                                      item.imageUrl
                                        ? item.imageUrl.startsWith("http")
                                          ? item.imageUrl
                                          : `${
                                              import.meta.env.VITE_API_URL || ""
                                            }${item.imageUrl}`
                                        : "https://via.placeholder.com/60x60?text=No+Image"
                                    }
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
                                  />
                                  <div className="flex-1">
                                    <h4 className="font-semibold">
                                      {item.name}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      Qty: {item.quantity} • ₹
                                      {(item.price * item.quantity).toFixed(2)}
                                    </p>

                                    {/* Rating & Feedback */}
                                    {item.rating ? (
                                      <div className="mt-2">
                                        <div className="flex items-center gap-2 mb-1">
                                          {renderStars(item.rating)}
                                          <span className="text-sm text-gray-600">
                                            ({item.rating}/5)
                                          </span>
                                          <span className="text-sm font-medium text-green-600">
                                            +{item.points} pts
                                          </span>
                                        </div>
                                        {item.description && (
                                          <div className="mt-2 p-2 bg-white border border-gray-200 rounded">
                                            <p className="text-sm text-gray-700 italic">
                                              "{item.description}"
                                            </p>
                                          </div>
                                        )}
                                        {item.feedbackDate && (
                                          <p className="text-xs text-gray-500 mt-1">
                                            Reviewed on{" "}
                                            {new Date(
                                              item.feedbackDate
                                            ).toLocaleDateString()}
                                          </p>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-gray-500 mt-1">
                                        No rating given
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            {order.specialInstructions && (
                              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm font-semibold text-yellow-800 mb-1">
                                  Special Instructions:
                                </p>
                                <p className="text-sm text-yellow-900">
                                  {order.specialInstructions}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      Failed to load order history
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Wait Time Modal */}
      {showWaitTimeModal && selectedOrder && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowWaitTimeModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold mb-4">Set Preparation Time</h2>
              <p className="text-gray-600 mb-6">
                Table {selectedOrder.tableNumber} - Order #
                {selectedOrder._id.slice(-6).toUpperCase()}
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Estimated wait time (minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={waitTime}
                  onChange={(e) => setWaitTime(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="15"
                  autoFocus
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  {waitTime &&
                    `Ready by: ${new Date(
                      Date.now() + parseInt(waitTime) * 60000
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWaitTimeModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetWaitTime}
                  disabled={!waitTime || parseInt(waitTime) < 1}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Preparing
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RestaurantOrdersPage;
