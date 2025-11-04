import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import ItemCustomizationManager from "../../components/ItemCustomizationManager";
import { useSessionManagement } from "../../hooks/useSessionManagement";
import { useAuth } from "../../context/MultiAuthContext";

const RestaurantDashboard = () => {
  const navigate = useNavigate();
  const {
    isRestaurantAuthenticated,
    getRestaurantSession,
    getToken,
    loading: authLoading,
  } = useAuth();

  // Use session management hook
  useSessionManagement();

  // Check restaurant authentication - only after loading is complete
  useEffect(() => {
    if (!authLoading && !isRestaurantAuthenticated) {
      console.log("[Dashboard] Not authenticated, redirecting to login");
      navigate("/restaurant/login");
    }
  }, [authLoading, isRestaurantAuthenticated, navigate]);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);

  const [itemFormData, setItemFormData] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    imageFile: null,
    availability: true,
    isVeg: true,
    enableCustomization: false,
  });

  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Set axios authorization header from restaurant token
    const token = getToken("restaurant");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    if (isRestaurantAuthenticated) {
      fetchData();
      fetchNewOrdersCount();

      // Check for new orders every 10 seconds
      const interval = setInterval(fetchNewOrdersCount, 10000);
      return () => clearInterval(interval);
    }
  }, [isRestaurantAuthenticated]);

  const fetchData = async () => {
    try {
      const [categoriesRes, itemsRes, restaurantRes] = await Promise.all([
        axios.get("/api/menu/categories"),
        axios.get("/api/menu/items"),
        axios.get("/api/restaurant/me"),
      ]);
      setCategories(categoriesRes.data);
      setItems(itemsRes.data.items);
      setRestaurantInfo(restaurantRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNewOrdersCount = async () => {
    try {
      const { data } = await axios.get("/api/orders?status=placed");
      setNewOrdersCount(data.length);
    } catch (error) {
      console.error("Error fetching orders count:", error);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setItemFormData({ ...itemFormData, imageFile: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/menu/categories", categoryFormData);
      alert("Category added successfully!");
      setShowAddCategoryModal(false);
      setCategoryFormData({ name: "" });
      fetchData();
    } catch (error) {
      alert(
        "Error adding category: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryFormData({ name: category.name });
    setShowEditCategoryModal(true);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    try {
      await axios.patch(
        `/api/menu/categories/${editingCategory._id}`,
        categoryFormData
      );
      alert("Category updated successfully!");
      setShowEditCategoryModal(false);
      setCategoryFormData({ name: "" });
      setEditingCategory(null);
      fetchData();
    } catch (error) {
      alert(
        "Error updating category: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      await axios.delete(`/api/menu/categories/${categoryId}`);
      alert("Category deleted successfully!");
      fetchData();
    } catch (error) {
      alert(
        "Error deleting category: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = "";

      // Upload image if provided
      if (itemFormData.imageFile) {
        const imageFormData = new FormData();
        imageFormData.append("image", itemFormData.imageFile);

        const uploadRes = await axios.post(
          "/api/upload/menu-image",
          imageFormData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        imageUrl = uploadRes.data.imageUrl;
      }

      // Create menu item
      await axios.post("/api/menu/items", {
        name: itemFormData.name,
        description: itemFormData.description,
        price: parseFloat(itemFormData.price),
        categoryId: itemFormData.categoryId || null,
        imageUrl: imageUrl,
        availability: itemFormData.availability,
        isVeg: itemFormData.isVeg,
        enableCustomization: itemFormData.enableCustomization || false,
        sizes: itemFormData.sizes || [],
        addOns: itemFormData.addOns || [],
        customizationOptions: itemFormData.customizationOptions || [],
        excludableIngredients: itemFormData.excludableIngredients || [],
        allowSpecialInstructions:
          itemFormData.allowSpecialInstructions !== false,
      });

      alert("Menu item added successfully!");
      setShowAddItemModal(false);
      resetItemForm();
      fetchData();
    } catch (error) {
      alert(
        "Error adding item: " + (error.response?.data?.message || error.message)
      );
    } finally {
      setUploading(false);
    }
  };

  const resetItemForm = () => {
    setItemFormData({
      name: "",
      description: "",
      price: "",
      categoryId: "",
      imageFile: null,
      availability: true,
      isVeg: true,
      enableCustomization: false,
      sizes: [],
      addOns: [],
      customizationOptions: [],
      excludableIngredients: [],
      allowSpecialInstructions: true,
    });
    setImagePreview(null);
    setEditingItem(null);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      categoryId: item.categoryId?._id || "",
      imageFile: null,
      availability: item.availability,
      isVeg: item.isVeg !== undefined ? item.isVeg : true,
      enableCustomization: item.enableCustomization || false,
      sizes: item.sizes || [],
      addOns: item.addOns || [],
      customizationOptions: item.customizationOptions || [],
      excludableIngredients: item.excludableIngredients || [],
      allowSpecialInstructions: item.allowSpecialInstructions !== false,
    });
    if (item.imageUrl) {
      setImagePreview(
        item.imageUrl.startsWith("http")
          ? item.imageUrl
          : `${import.meta.env.VITE_API_URL || ""}${item.imageUrl}`
      );
    }
    setShowEditItemModal(true);
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = editingItem.imageUrl;

      // Upload new image if provided
      if (itemFormData.imageFile) {
        const imageFormData = new FormData();
        imageFormData.append("image", itemFormData.imageFile);

        const uploadRes = await axios.post(
          "/api/upload/menu-image",
          imageFormData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );
        imageUrl = uploadRes.data.imageUrl;
      }

      // Update menu item
      await axios.patch(`/api/menu/items/${editingItem._id}`, {
        name: itemFormData.name,
        description: itemFormData.description,
        price: parseFloat(itemFormData.price),
        categoryId: itemFormData.categoryId || null,
        imageUrl: imageUrl,
        availability: itemFormData.availability,
        isVeg: itemFormData.isVeg,
        enableCustomization: itemFormData.enableCustomization || false,
        sizes: itemFormData.sizes || [],
        addOns: itemFormData.addOns || [],
        customizationOptions: itemFormData.customizationOptions || [],
        excludableIngredients: itemFormData.excludableIngredients || [],
        allowSpecialInstructions:
          itemFormData.allowSpecialInstructions !== false,
      });

      alert("Menu item updated successfully!");
      setShowEditItemModal(false);
      resetItemForm();
      fetchData();
    } catch (error) {
      alert(
        "Error updating item: " +
          (error.response?.data?.message || error.message)
      );
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `${
        restaurantInfo?.restaurantName || "restaurant"
      }-menu-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src =
      "data:image/svg+xml;base64," +
      btoa(unescape(encodeURIComponent(svgData)));
  };

  const toggleAvailability = async (itemId, currentStatus) => {
    try {
      await axios.patch(`/api/menu/items/${itemId}`, {
        availability: !currentStatus,
      });
      fetchData();
    } catch (error) {
      console.error("Error updating availability:", error);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await axios.delete(`/api/menu/items/${itemId}`);
      alert("Item deleted successfully!");
      fetchData();
    } catch (error) {
      alert(
        "Error deleting item: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const filteredItems =
    selectedCategory === "all"
      ? items
      : selectedCategory === "uncategorized"
      ? items.filter((item) => !item.categoryId)
      : items.filter((item) => item.categoryId?._id === selectedCategory);

  const uncategorizedCount = items.filter((item) => !item.categoryId).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white">
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
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Restaurant Dashboard</h1>
              <p className="text-sm text-gray-600">Manage your menu</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/restaurant/orders")}
              className="relative flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 btn-animate"
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Orders
              {newOrdersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse animate-wiggle">
                  {newOrdersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate("/restaurant/qr-codes")}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
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
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              Manage QR
            </button>
            <button
              onClick={() => navigate("/restaurant/generate-qr")}
              className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 text-sm"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Generate QR
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Actions Bar */}
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedCategory === "all"
                  ? "bg-green-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              All Items ({items.length})
            </button>

            {uncategorizedCount > 0 && (
              <button
                onClick={() => setSelectedCategory("uncategorized")}
                className={`px-4 py-2 rounded-lg font-medium ${
                  selectedCategory === "uncategorized"
                    ? "bg-green-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                Uncategorized ({uncategorizedCount})
              </button>
            )}

            {categories.map((cat) => (
              <div key={cat._id} className="relative group">
                <button
                  onClick={() => setSelectedCategory(cat._id)}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedCategory === cat._id
                      ? "bg-green-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {cat.name}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCategory(cat);
                  }}
                  className="absolute -top-2 -right-8 bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Edit category"
                >
                  ✎
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat._id);
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete category"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              onClick={() => setShowAddCategoryModal(true)}
              className="px-4 py-2 rounded-lg font-medium bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              + Add Category
            </button>
          </div>

          <button
            onClick={() => setShowAddItemModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Menu Item
          </button>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredItems.map((item, index) => (
            <div
              key={item._id}
              className="bg-white rounded-xl shadow-md overflow-hidden hover-lift animate-fadeIn"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="relative h-48">
                <img
                  src={
                    item.imageUrl
                      ? item.imageUrl.startsWith("http")
                        ? item.imageUrl
                        : `${import.meta.env.VITE_API_URL || ""}${
                            item.imageUrl
                          }`
                      : "https://via.placeholder.com/400x300?text=No+Image"
                  }
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() =>
                      toggleAvailability(item._id, item.availability)
                    }
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.availability
                        ? "bg-green-500 text-white"
                        : "bg-gray-500 text-white"
                    }`}
                  >
                    {item.availability ? "Available" : "Unavailable"}
                  </button>
                </div>
                <button
                  onClick={() => handleEditItem(item)}
                  className="absolute top-2 left-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-blue-600"
                  title="Edit item"
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteItem(item._id)}
                  className="absolute top-12 left-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                  title="Delete item"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold mb-1">{item.name}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {item.description || "No description"}
                </p>
                <div className="flex justify-between items-center">
                  <p className="text-xl font-bold text-green-600">
                    ₹{item.price.toFixed(2)}
                  </p>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {item.categoryId?.name || "Uncategorized"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-gray-600 text-lg font-medium">No items found</p>
            <p className="text-gray-500 text-sm mt-1">
              Add your first menu item to get started!
            </p>
          </div>
        )}
      </main>

      {/* Add Category Modal */}
      {showAddCategoryModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddCategoryModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Add Category</h2>
                <button
                  onClick={() => setShowAddCategoryModal(false)}
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

              <form onSubmit={handleAddCategory} className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryFormData.name}
                    onChange={(e) =>
                      setCategoryFormData({ name: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Starters, Main Course, Desserts"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                  >
                    Add Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowAddItemModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
                <h2 className="text-2xl font-bold">Add Menu Item</h2>
                <button
                  onClick={() => setShowAddItemModal(false)}
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

              <form onSubmit={handleSubmitItem} className="p-6 space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Item Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setItemFormData({
                              ...itemFormData,
                              imageFile: null,
                            });
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          Click to upload image
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemFormData.name}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Butter Chicken"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={itemFormData.description}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Describe your dish..."
                  />
                </div>

                {/* Price and Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={itemFormData.price}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          price: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="299.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Category
                    </label>
                    <select
                      value={itemFormData.categoryId}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          categoryId: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dietary Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dietary Type *
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setItemFormData({ ...itemFormData, isVeg: true })
                      }
                      className={`flex-1 px-4 py-3 rounded-lg font-medium border-2 ${
                        itemFormData.isVeg
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      🟢 Vegetarian
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setItemFormData({ ...itemFormData, isVeg: false })
                      }
                      className={`flex-1 px-4 py-3 rounded-lg font-medium border-2 ${
                        !itemFormData.isVeg
                          ? "border-red-600 bg-red-50 text-red-700"
                          : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      🔴 Non-Vegetarian
                    </button>
                  </div>
                </div>

                {/* Availability */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="availability"
                    checked={itemFormData.availability}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        availability: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <label htmlFor="availability" className="text-sm font-medium">
                    Item is available for ordering
                  </label>
                </div>

                {/* Enable Customization Toggle */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      id="enableCustomization"
                      checked={itemFormData.enableCustomization}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          enableCustomization: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <label
                      htmlFor="enableCustomization"
                      className="text-sm font-semibold"
                    >
                      Enable Customization for this item
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 ml-8">
                    Allow customers to customize this item with sizes, add-ons,
                    and other options
                  </p>
                </div>

                {/* Customization Options - Only show if enabled */}
                {itemFormData.enableCustomization && (
                  <ItemCustomizationManager
                    formData={itemFormData}
                    setFormData={setItemFormData}
                  />
                )}

                {/* Submit Button */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddItemModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    {uploading ? "Adding..." : "Add Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* QR Code Modal */}
      {showQRModal && restaurantInfo && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowQRModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full animate-scaleIn">
              <div className="border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Restaurant Menu QR Code</h2>
                <button
                  onClick={() => setShowQRModal(false)}
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

              <div className="p-6 text-center">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">
                    {restaurantInfo.restaurantName}
                  </h3>
                  <p className="text-gray-600">
                    Scan this QR code to view our menu
                  </p>
                </div>

                <div className="flex justify-center mb-6 bg-white p-6 rounded-lg border-2 border-gray-200">
                  <QRCodeSVG
                    id="qr-code-svg"
                    value={`${window.location.origin}/m/${restaurantInfo._id}`}
                    size={256}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 font-medium mb-2">
                    📱 How it works:
                  </p>
                  <ol className="text-sm text-blue-700 text-left space-y-1">
                    <li>1. Customer scans this QR code</li>
                    <li>2. Customer enters their table number</li>
                    <li>3. Customer browses menu and places order</li>
                    <li>4. You receive the order with table number</li>
                  </ol>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleDownloadQR}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center justify-center gap-2"
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download QR Code
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
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
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Print QR Code
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Menu URL: {window.location.origin}/m/{restaurantInfo._id}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Category Modal */}
      {showEditCategoryModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowEditCategoryModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="border-b px-6 py-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Edit Category</h2>
                <button
                  onClick={() => setShowEditCategoryModal(false)}
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

              <form onSubmit={handleUpdateCategory} className="p-6">
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={categoryFormData.name}
                    onChange={(e) =>
                      setCategoryFormData({ name: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Starters, Main Course, Desserts"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditCategoryModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
                  >
                    Update Category
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Edit Item Modal */}
      {showEditItemModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowEditItemModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8">
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
                <h2 className="text-2xl font-bold">Edit Menu Item</h2>
                <button
                  onClick={() => setShowEditItemModal(false)}
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

              <form onSubmit={handleUpdateItem} className="p-6 space-y-6">
                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Item Image
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    {imagePreview ? (
                      <div className="relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview(null);
                            setItemFormData({
                              ...itemFormData,
                              imageFile: null,
                            });
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
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
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center cursor-pointer">
                        <svg
                          className="w-12 h-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          Click to upload new image
                        </p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={itemFormData.name}
                    onChange={(e) =>
                      setItemFormData({ ...itemFormData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Butter Chicken"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Description
                  </label>
                  <textarea
                    value={itemFormData.description}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        description: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                    rows="3"
                    placeholder="Describe your dish..."
                  />
                </div>

                {/* Price and Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={itemFormData.price}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          price: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="299.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Category
                    </label>
                    <select
                      value={itemFormData.categoryId}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          categoryId: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dietary Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dietary Type *
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setItemFormData({ ...itemFormData, isVeg: true })
                      }
                      className={`flex-1 px-4 py-3 rounded-lg font-medium border-2 ${
                        itemFormData.isVeg
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      🟢 Vegetarian
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setItemFormData({ ...itemFormData, isVeg: false })
                      }
                      className={`flex-1 px-4 py-3 rounded-lg font-medium border-2 ${
                        !itemFormData.isVeg
                          ? "border-red-600 bg-red-50 text-red-700"
                          : "border-gray-300 bg-white text-gray-700"
                      }`}
                    >
                      🔴 Non-Vegetarian
                    </button>
                  </div>
                </div>

                {/* Availability */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="edit-availability"
                    checked={itemFormData.availability}
                    onChange={(e) =>
                      setItemFormData({
                        ...itemFormData,
                        availability: e.target.checked,
                      })
                    }
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                  />
                  <label
                    htmlFor="edit-availability"
                    className="text-sm font-medium"
                  >
                    Item is available for ordering
                  </label>
                </div>

                {/* Enable Customization Toggle */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <input
                      type="checkbox"
                      id="edit-enableCustomization"
                      checked={itemFormData.enableCustomization}
                      onChange={(e) =>
                        setItemFormData({
                          ...itemFormData,
                          enableCustomization: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <label
                      htmlFor="edit-enableCustomization"
                      className="text-sm font-semibold"
                    >
                      Enable Customization for this item
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 ml-8">
                    Allow customers to customize this item with sizes, add-ons,
                    and other options
                  </p>
                </div>

                {/* Customization Options - Only show if enabled */}
                {itemFormData.enableCustomization && (
                  <ItemCustomizationManager
                    formData={itemFormData}
                    setFormData={setItemFormData}
                  />
                )}

                {/* Submit Button */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditItemModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                  >
                    {uploading ? "Updating..." : "Update Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RestaurantDashboard;
