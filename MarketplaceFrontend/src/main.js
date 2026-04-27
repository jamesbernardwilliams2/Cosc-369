import './style.css'
import javascriptLogo from './assets/javascript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { getAuth, signInWithPopup, OAuthProvider, signOut, signInWithRedirect, onAuthStateChanged } from "firebase/auth";
import { doc, query, where, setDoc, getFirestore, collection, addDoc, getDocs, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCdKD9XUBGWEuA9Y4wgYNzHra9UHF-E9wc",
  authDomain: "studentmarketplace-c0ef9.firebaseapp.com",
  projectId: "studentmarketplace-c0ef9",
  storageBucket: "studentmarketplace-c0ef9.firebasestorage.app",
  messagingSenderId: "130963446060",
  appId: "1:130963446060:web:15c6a487d5b6a0422c3489",
  measurementId: "G-0PBGGGM2CH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth();
const db = getFirestore();
const provider = new OAuthProvider('microsoft.com');

provider.setCustomParameters({
  prompt: 'select_account',
});
const analytics = getAnalytics(app);

let authSpot = document.querySelector("#authCorner");

onAuthStateChanged(auth, (user) => {
  renderAuthSpot();
  if (user) {
  } else {
  }
});
const login = async () => {
  const result = await signInWithPopup(auth, provider);

  // 1. Get the Firebase User object
  curUser = result.user;

  await registerUserInDb(curUser);
  renderAuthSpot();
}

const logout = () => {
  auth.signOut().then(function () {
    console.log('Signed Out');
  }, function (error) {
    console.error('Sign Out Error', error);
  });
}


// Modal functionality
const listModal = document.querySelector("#listItemModal");
const listItemForm = document.querySelector("#listItemForm");
const closeBtn = document.querySelector(".close-btn");
const cancelBtn = document.querySelector(".btn-cancel");

const openListModal = () => {
  listModal.classList.add("show");
  listItemForm.reset();
}

const closeListModal = () => {
  listModal.classList.remove("show");
  listItemForm.reset();
}

const handleListItemSubmit = async (e) => {
  e.preventDefault();

  const formData = new FormData(listItemForm);
  const imageFile = formData.get("itemImage");

  let imageUrl = null;
  if (imageFile && imageFile.size > 0) {
    const storage = getStorage();
    const storageRef = ref(storage, `Products/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(storageRef);
  }

  const itemData = {
    name: formData.get("itemName"),
    description: formData.get("itemDescription"),
    quantity: parseInt(formData.get("itemQuantity")),
    category: formData.get("itemCategory"),
    imageUrl: imageUrl,
    seller: auth.currentUser.uid,
    createdAt: new Date(),
    price: formData.get("itemPrice")
  };

  // Add to Firestore
  const productsRef = collection(db, "Products");
  await addDoc(productsRef, itemData);

  console.log("Item listed:", itemData);

  // Refresh the product list
  await fetchAndRenderProducts();

  closeListModal();
}

closeBtn.addEventListener("click", closeListModal);
cancelBtn.addEventListener("click", closeListModal);
listModal.addEventListener("click", (e) => {
  if (e.target === listModal) {
    closeListModal();
  }
});

listItemForm.addEventListener("submit", handleListItemSubmit)


// Product Details Modal
const productModal = document.querySelector("#productModal");
const closeProductBtn = document.querySelector("#closeProductModal");
const cancelBuyBtn = document.querySelector("#cancelBuy");
const buyButton = document.querySelector("#buyButton");
const decreaseQtyBtn = document.querySelector("#decreaseQty");
const increaseQtyBtn = document.querySelector("#increaseQty");
const quantityDisplay = document.querySelector("#quantityDisplay");

let currentProductId = null;
let currentQuantity = 1;

const openProductModal = async (productId) => {
  currentProductId = productId;
  const productDoc = await getDoc(doc(db, "Products", productId));
  if (productDoc.exists()) {
    const data = productDoc.data();

    // Fetch seller's full name from Users collection
    let sellerName = data.seller; // fallback to UID if lookup fails
    try {
      const sellerDoc = await getDoc(doc(db, "Users", data.seller));
      if (sellerDoc.exists()) {
        sellerName = sellerDoc.data().fullName || data.seller;
      }
    } catch (error) {
      console.error("Error fetching seller info:", error);
    }

    const imageHtml = data.imageUrl ? `<img src="${data.imageUrl}" alt="${data.name}">` : '<div class="no-image">No Image</div>';
    document.querySelector("#productTitle").textContent = data.name;
    document.querySelector("#productDetails").innerHTML = `
      <div class="product-image-container">
        ${imageHtml}
      </div>
      <div class="product-tags">
        <span class="tag category-tag">${data.category}</span>
        <span class="tag seller-tag">Seller: ${sellerName}</span>
      </div>
      <div class="product-info">
        <p><strong>Description:</strong> ${data.description}</p>
        <p><strong>Price:</strong> $${data.price}</p>
        <p><strong>Available Quantity:</strong> ${data.quantity}</p>
      </div>
    `;
    currentQuantity = 1;
    quantityDisplay.textContent = currentQuantity;
    quantityDisplay.dataset.max = data.quantity;
    productModal.classList.add("show");
  }
}

const closeProductModal = () => {
  productModal.classList.remove("show");
  currentProductId = null;
}

const handleBuy = async () => {
  if (!auth.currentUser) {
    alert("Please log in to make a purchase.");
    return;
  }

  const quantity = currentQuantity;
  if (quantity <= 0 || !currentProductId) return;

  try {
    const productRef = doc(db, "Products", currentProductId);
    const productSnap = await getDoc(productRef);

    if (!productSnap.exists()) {
      alert("Product not found.");
      return;
    }

    const productData = productSnap.data();
    if (productData.quantity < quantity) {
      alert("Not enough items in stock.");
      return;
    }

    // Update product quantity
    const newQuantity = productData.quantity - quantity;
    await updateDoc(productRef, { quantity: newQuantity });

    // Create purchase record
    const purchaseData = {
      buyerUID: auth.currentUser.uid,
      productID: currentProductId,
      purchasedAt: new Date().toISOString(),
      quantity: quantity,
      sellerUID: productData.seller
    };

    const purchasesRef = collection(db, "Purchases");
    await addDoc(purchasesRef, purchaseData);

    alert(`Purchase successful! You bought ${quantity} item(s).`);
    closeProductModal();

    // Refresh products to show updated quantity
    await fetchAndRenderProducts();
  } catch (error) {
    console.error("Error processing purchase:", error);
    alert("An error occurred during purchase. Please try again.");
  }
}

// Event listeners for product modal
closeProductBtn.addEventListener("click", closeProductModal);
cancelBuyBtn.addEventListener("click", closeProductModal);
buyButton.addEventListener("click", handleBuy);

// Quantity control event listeners
decreaseQtyBtn.addEventListener("click", () => {
  if (currentQuantity > 1) {
    currentQuantity--;
    quantityDisplay.textContent = currentQuantity;
  }
});

increaseQtyBtn.addEventListener("click", () => {
  const maxQty = parseInt(quantityDisplay.dataset.max);
  if (currentQuantity < maxQty) {
    currentQuantity++;
    quantityDisplay.textContent = currentQuantity;
  }
});

productModal.addEventListener("click", (e) => {
  if (e.target === productModal) {
    closeProductModal();
  }
});

// Make openProductModal global for onclick
window.openProductModal = openProductModal;

function renderAuthSpot() {
  if (auth.currentUser) {
    authSpot.innerHTML = `<button id="listItem" class="btn-list">List Item</button><button id="logout">Logout</button>`;
    document.querySelector("#logout").addEventListener('click', () => logout());
    document.querySelector("#listItem").addEventListener('click', () => openListModal());
  } else {
    authSpot.innerHTML = `Not Logged In <button class="btn-auth" id="login">Register / Sign In</button>`
    document.querySelector("#login").addEventListener('click', () => login());
  }
}

const registerUserInDb = async (user) => {
  const userRef = doc(db, "Users", user.uid);
  await setDoc(userRef, {
    fullName: user.displayName,
    email: user.email,
    createdAt: new Date()
  }, { merge: true }); // 'merge' prevents overwriting if they log in again
};

// Store all products for filtering
let allProducts = [];

const fetchAndRenderProducts = async () => {
  const productsRef = collection(db, "Products");
  const q = query(productsRef, where("quantity", ">=", 1));
  const querySnapshot = await getDocs(q);
  
  // Store all products with their IDs
  allProducts = [];
  querySnapshot.forEach((doc) => {
    allProducts.push({
      id: doc.id,
      ...doc.data()
    });
  });
  
  renderProducts(allProducts);
};

const renderProducts = (productsToRender) => {
  const itemGrid = document.querySelector("#item-grid");
  let html = "";
  
  if (productsToRender.length === 0) {
    html = '<p class="no-results">No products found</p>';
  } else {
    productsToRender.forEach((product) => {
      const imageHtml = product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}">` : "No Image";
      html += `
        <div class="card" onclick="openProductModal('${product.id}')">
          <div class="card-image">${imageHtml}</div>
          <div class="card-content">
            <div class="item-price">$${product.price}</div>
            <div class="item-title">${product.name}</div>
          </div>
        </div>
      `;
    });
  }
  itemGrid.innerHTML = html;
};

const filterAndRenderProducts = (searchQuery) => {
  const query = searchQuery.toLowerCase().trim();
  
  if (query === "") {
    // If search is empty, show all products
    renderProducts(allProducts);
  } else {
    // Filter products by name or description
    const filteredProducts = allProducts.filter((product) => {
      const nameMatch = product.name.toLowerCase().includes(query);
      const descriptionMatch = product.description.toLowerCase().includes(query);
      const categoryMatch = product.category.toLowerCase().includes(query);
      return nameMatch || descriptionMatch || categoryMatch;
    });
    renderProducts(filteredProducts);
  }
};

// Add search bar event listener
const searchBar = document.querySelector(".search-bar");
searchBar.addEventListener("input", (e) => {
  filterAndRenderProducts(e.target.value);
});

// Call fetchAndRenderProducts on page load
fetchAndRenderProducts();

