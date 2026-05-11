import './style.css'
import javascriptLogo from './assets/javascript.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { getAuth, signInWithPopup, OAuthProvider, signOut, signInWithRedirect, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
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
let currentUserProfile = null;
let shouldPromptProfileCompletion = false;
const authMethodModal = document.querySelector("#authMethodModal");
const closeAuthMethodBtn = document.querySelector("#closeAuthMethodModal");
const cancelAuthMethodBtn = document.querySelector("#cancelAuthMethod");
const microsoftLoginBtn = document.querySelector("#microsoftLoginBtn");
const microsoftRegisterBtn = document.querySelector("#microsoftRegisterBtn");
const emailSignInForm = document.querySelector("#emailSignInForm");
const emailRegisterForm = document.querySelector("#emailRegisterForm");
const authErrorMessage = document.querySelector("#authErrorMessage");
const signInScreen = document.querySelector("#signInScreen");
const registerScreen = document.querySelector("#registerScreen");
const authModalTitle = document.querySelector("#authModalTitle");
const showRegisterScreenBtn = document.querySelector("#showRegisterScreen");
const showSignInScreenBtn = document.querySelector("#showSignInScreen");
const registerPasswordInput = document.querySelector("#registerPassword");
const passwordLengthHint = document.querySelector("#passwordLengthHint");
const passwordSpecialHint = document.querySelector("#passwordSpecialHint");

const updatePasswordHints = () => {
  const password = registerPasswordInput?.value || "";
  const hasMinLength = password.length >= 6;
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  passwordLengthHint?.classList.toggle("fulfilled", hasMinLength);
  passwordSpecialHint?.classList.toggle("fulfilled", hasSpecial);
};

const setAuthScreen = (screen) => {
  const isSignIn = screen === "signin";
  signInScreen?.classList.toggle("active", isSignIn);
  registerScreen?.classList.toggle("active", !isSignIn);
  if (authModalTitle) authModalTitle.textContent = isSignIn ? "Sign In" : "Register";
  if (authErrorMessage) authErrorMessage.textContent = "";
};

onAuthStateChanged(auth, (user) => {
  renderAuthSpot();
  if (user) {
    loadCurrentUserProfile();
  } else {
    currentUserProfile = null;
  }
});
const login = async () => {
  const result = await signInWithPopup(auth, provider);

  // 1. Get the Firebase User object
  const curUser = result.user;

  const isNewUser = await registerUserInDb(curUser);
  shouldPromptProfileCompletion = isNewUser;
  renderAuthSpot();

  if (isNewUser) {
    await openProfileModal({ showPrompt: true });
  }
}

const openAuthMethodModal = () => {
  setAuthScreen("signin");
  if (emailSignInForm) emailSignInForm.reset();
  if (emailRegisterForm) emailRegisterForm.reset();
  updatePasswordHints();
  authMethodModal.classList.add("show");
};

const closeAuthMethodModal = () => {
  if (authErrorMessage) authErrorMessage.textContent = "";
  authMethodModal.classList.remove("show");
};

const showAuthError = (error) => {
  if (!authErrorMessage) return;
  const rawMessage = error?.message || "Authentication failed.";
  if (typeof rawMessage === "string" && rawMessage.includes("auth/email-already-in-use")) {
    authErrorMessage.textContent = "Email is already in use.";
    return;
  }
  if (typeof rawMessage === "string" && rawMessage.includes("auth/password-does-not-meet-requirements")) {
    const bracketMatch = rawMessage.match(/\[([^\]]+)\]/);
    authErrorMessage.textContent = bracketMatch ? bracketMatch[1] : "Password does not meet requirements.";
    return;
  }
  authErrorMessage.textContent = rawMessage;
};

const signInWithMicrosoft = async () => {
  try {
    await login();
    closeAuthMethodModal();
  } catch (error) {
    showAuthError(error);
  }
};

const handleEmailSignIn = async (e) => {
  e.preventDefault();
  const formData = new FormData(emailSignInForm);
  const email = formData.get("signInEmail")?.toString().trim();
  const password = formData.get("signInPassword")?.toString();

  if (!email || !password) {
    showAuthError({ message: "Email and password are required." });
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    closeAuthMethodModal();
  } catch (error) {
    showAuthError(error);
  }
};

const handleEmailRegister = async (e) => {
  e.preventDefault();
  const formData = new FormData(emailRegisterForm);
  const email = formData.get("registerEmail")?.toString().trim();
  const password = formData.get("registerPassword")?.toString();
  const confirmPassword = formData.get("registerPasswordConfirm")?.toString();

  if (!email || !password || !confirmPassword) {
    showAuthError({ message: "All registration fields are required." });
    return;
  }

  if (password !== confirmPassword) {
    showAuthError({ message: "Passwords do not match." });
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const isNewUser = await registerUserInDb(result.user);
    shouldPromptProfileCompletion = isNewUser;
    closeAuthMethodModal();
    renderAuthSpot();

    if (isNewUser) {
      await openProfileModal({ showPrompt: true });
    }
  } catch (error) {
    showAuthError(error);
  }
};

const logout = () => {
  auth.signOut().then(function () {
    console.log('Signed Out');
  }, function (error) {
    console.error('Sign Out Error', error);
  });
}

closeAuthMethodBtn?.addEventListener("click", closeAuthMethodModal);
cancelAuthMethodBtn?.addEventListener("click", closeAuthMethodModal);
microsoftLoginBtn?.addEventListener("click", signInWithMicrosoft);
microsoftRegisterBtn?.addEventListener("click", signInWithMicrosoft);
emailSignInForm?.addEventListener("submit", handleEmailSignIn);
emailRegisterForm?.addEventListener("submit", handleEmailRegister);
registerPasswordInput?.addEventListener("input", updatePasswordHints);
showRegisterScreenBtn?.addEventListener("click", () => setAuthScreen("register"));
showSignInScreenBtn?.addEventListener("click", () => setAuthScreen("signin"));
authMethodModal?.addEventListener("click", (e) => {
  if (e.target === authMethodModal) {
    closeAuthMethodModal();
  }
});


// Modal functionality
const listModal = document.querySelector("#listItemModal");
const listItemForm = document.querySelector("#listItemForm");
const closeBtn = listModal?.querySelector(".close-btn");
const cancelBtn = listModal?.querySelector(".btn-cancel");
const editListingModal = document.querySelector("#editListingModal");
const editListingForm = document.querySelector("#editListingForm");
const closeEditListingBtn = document.querySelector("#closeEditListingModal");
const cancelEditListingBtn = document.querySelector("#cancelEditListing");

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

closeBtn?.addEventListener("click", closeListModal);
cancelBtn?.addEventListener("click", closeListModal);
listModal.addEventListener("click", (e) => {
  if (e.target === listModal) {
    closeListModal();
  }
});

listItemForm.addEventListener("submit", handleListItemSubmit)

const closeEditListingModal = () => {
  editListingModal?.classList.remove("show");
  editListingForm?.reset();
};

const openEditListingModal = async (listingId) => {
  if (!auth.currentUser || !listingId) return;
  const listingSnap = await getDoc(doc(db, "Products", listingId));
  if (!listingSnap.exists()) {
    alert("Listing not found.");
    return;
  }

  const listing = listingSnap.data();
  if (listing.seller !== auth.currentUser.uid) {
    alert("You can only edit your own listings.");
    return;
  }

  document.querySelector("#editListingId").value = listingId;
  document.querySelector("#editItemName").value = listing.name || "";
  document.querySelector("#editItemDescription").value = listing.description || "";
  document.querySelector("#editItemQuantity").value = listing.quantity ?? 0;
  document.querySelector("#editItemPrice").value = listing.price ?? 0;
  document.querySelector("#editItemCategory").value = listing.category || "";
  editListingModal?.classList.add("show");
};

const handleEditListingSubmit = async (e) => {
  e.preventDefault();
  if (!auth.currentUser) return;

  const formData = new FormData(editListingForm);
  const listingId = formData.get("editListingId")?.toString();
  if (!listingId) return;

  const listingRef = doc(db, "Products", listingId);
  const listingSnap = await getDoc(listingRef);
  if (!listingSnap.exists()) {
    alert("Listing not found.");
    return;
  }

  const listing = listingSnap.data();
  if (listing.seller !== auth.currentUser.uid) {
    alert("You can only edit your own listings.");
    return;
  }

  const imageFile = formData.get("editItemImage");
  let imageUrl = listing.imageUrl || null;
  if (imageFile && imageFile.size > 0) {
    const storage = getStorage();
    const storageRef = ref(storage, `Products/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`);
    await uploadBytes(storageRef, imageFile);
    imageUrl = await getDownloadURL(storageRef);
  }

  await updateDoc(listingRef, {
    name: formData.get("editItemName"),
    description: formData.get("editItemDescription"),
    quantity: Number(formData.get("editItemQuantity")),
    price: Number(formData.get("editItemPrice")),
    category: formData.get("editItemCategory"),
    imageUrl: imageUrl,
    updatedAt: new Date()
  });

  closeEditListingModal();
  await Promise.all([loadMyListingsData(), fetchAndRenderProducts()]);
  alert("Listing updated.");
};

closeEditListingBtn?.addEventListener("click", closeEditListingModal);
cancelEditListingBtn?.addEventListener("click", closeEditListingModal);
editListingForm?.addEventListener("submit", handleEditListingSubmit);
editListingModal?.addEventListener("click", (e) => {
  if (e.target === editListingModal) {
    closeEditListingModal();
  }
});

// Profile modal functionality
const profileModal = document.querySelector("#profileModal");
const profileForm = document.querySelector("#profileForm");
const closeProfileBtn = document.querySelector("#closeProfileModal");
const cancelProfileBtn = document.querySelector("#cancelProfile");
const profilePromptMessage = document.querySelector("#profilePromptMessage");
const profileTabs = document.querySelectorAll(".profile-tab");
const profileTabPanels = document.querySelectorAll(".profile-tab-panel");
const purchasesList = document.querySelector("#purchasesList");
const salesList = document.querySelector("#salesList");
const myListingsList = document.querySelector("#myListingsList");
const pastListingsList = document.querySelector("#pastListingsList");
const walletBalance = document.querySelector("#walletBalance");
const walletCashoutForm = document.querySelector("#walletCashoutForm");
const cashoutMessage = document.querySelector("#cashoutMessage");
let currentWalletAvailable = 0;

const setCashoutMessage = (message, isError = false) => {
  if (!cashoutMessage) return;
  cashoutMessage.textContent = message;
  cashoutMessage.classList.remove("wallet-message-error", "wallet-message-success");
  if (message) {
    cashoutMessage.classList.add(isError ? "wallet-message-error" : "wallet-message-success");
  }
};

const loadCurrentUserProfile = async () => {
  if (!auth.currentUser) return;
  const userRef = doc(db, "Users", auth.currentUser.uid);
  const userSnap = await getDoc(userRef);
  currentUserProfile = userSnap.exists() ? userSnap.data() : null;
};

const setActiveProfileTab = (tabId) => {
  profileTabs.forEach((tabBtn) => {
    tabBtn.classList.toggle("active", tabBtn.dataset.tab === tabId);
  });

  profileTabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
};

const formatDate = (value) => {
  if (!value) return "Unknown date";
  const dateValue = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return "Unknown date";
  return dateValue.toLocaleDateString();
};

const getProductName = async (productId) => {
  try {
    const productSnap = await getDoc(doc(db, "Products", productId));
    if (!productSnap.exists()) return "Deleted item";
    return productSnap.data().name || "Unnamed item";
  } catch {
    return "Unknown item";
  }
};

const getProductDetails = async (productId) => {
  try {
    const productSnap = await getDoc(doc(db, "Products", productId));
    if (!productSnap.exists()) return null;
    return productSnap.data();
  } catch {
    return null;
  }
};

const loadTransactionTabData = async () => {
  if (!auth.currentUser) return;
  const userId = auth.currentUser.uid;

  const purchasesQuery = query(collection(db, "Purchases"), where("buyerUID", "==", userId));
  const salesQuery = query(collection(db, "Purchases"), where("sellerUID", "==", userId));

  const [purchasesSnap, salesSnap] = await Promise.all([getDocs(purchasesQuery), getDocs(salesQuery)]);

  if (purchasesSnap.empty) {
    purchasesList.innerHTML = `<p class="profile-empty">No purchases yet.</p>`;
  } else {
    const purchaseItems = await Promise.all(purchasesSnap.docs.map(async (purchaseDoc) => {
      const data = purchaseDoc.data();
      const productName = await getProductName(data.productID);
      return `
        <div class="profile-list-item">
          <div class="profile-list-title">${productName}</div>
          <div class="profile-list-meta">Qty: ${data.quantity} | Date: ${formatDate(data.purchasedAt)}</div>
        </div>
      `;
    }));
    purchasesList.innerHTML = purchaseItems.join("");
  }

  let totalEarned = 0;
  if (salesSnap.empty) {
    salesList.innerHTML = `<p class="profile-empty">No sales yet.</p>`;
  } else {
    const saleItems = await Promise.all(salesSnap.docs.map(async (saleDoc) => {
      const data = saleDoc.data();
      const productDetails = await getProductDetails(data.productID);
      const productName = productDetails?.name || "Deleted item";
      const unitPrice = Number(productDetails?.price) || 0;
      const quantitySold = Number(data.quantity) || 0;
      const lineTotal = unitPrice * quantitySold;
      totalEarned += lineTotal;
      return `
        <div class="profile-list-item">
          <div class="profile-list-title">${productName}</div>
          <div class="profile-list-meta">Qty sold: ${quantitySold} | Earned: $${lineTotal.toFixed(2)} | Date: ${formatDate(data.purchasedAt)}</div>
        </div>
      `;
    }));
    salesList.innerHTML = saleItems.join("");
  }

  await loadCurrentUserProfile();
  const totalCashedOut = Number(currentUserProfile?.totalCashedOut) || 0;
  currentWalletAvailable = Math.max(0, totalEarned - totalCashedOut);
  if (walletBalance) walletBalance.textContent = `$${currentWalletAvailable.toFixed(2)}`;
};

const handleWalletCashout = async (e) => {
  e.preventDefault();
  if (!auth.currentUser) {
    setCashoutMessage("Please log in first.", true);
    return;
  }

  const formData = new FormData(walletCashoutForm);
  const amount = Number(formData.get("cashoutAmount"));
  const cardNumber = (formData.get("cashoutCardNumber") || "").toString().trim();
  const cvv = (formData.get("cashoutCvv") || "").toString().trim();
  const expiryDate = (formData.get("cashoutExpiryDate") || "").toString().trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    setCashoutMessage("Enter a valid cashout amount.", true);
    return;
  }

  if (!cardNumber) {
    setCashoutMessage("Please provide a card number.", true);
    return;
  }

  if (!cvv) {
    setCashoutMessage("Please provide a CVV.", true);
    return;
  }

  if (!expiryDate) {
    setCashoutMessage("Please provide an expiry date.", true);
    return;
  }

  if (amount > currentWalletAvailable) {
    setCashoutMessage("Cashout amount exceeds available wallet balance.", true);
    return;
  }

  await loadCurrentUserProfile();
  const existingCashedOut = Number(currentUserProfile?.totalCashedOut) || 0;
  const newTotalCashedOut = existingCashedOut + amount;

  await setDoc(doc(db, "Users", auth.currentUser.uid), {
    totalCashedOut: newTotalCashedOut,
    lastCashoutAt: new Date(),
    lastCashoutAmount: amount,
    lastCashoutCardLast4: cardNumber.slice(-4),
    cardNumber: cardNumber,
    cvv: cvv,
    expiryDate: expiryDate
  }, { merge: true });

  setCashoutMessage(`Cashout successful. Sent $${amount.toFixed(2)} to card ending in ${cardNumber.slice(-4)}.`);
  const amountField = document.querySelector("#cashoutAmount");
  if (amountField) amountField.value = "";
  await loadTransactionTabData();
};

const prefillWalletCashoutForm = () => {
  if (!walletCashoutForm) return;
  const cardField = document.querySelector("#cashoutCardNumber");
  const cvvField = document.querySelector("#cashoutCvv");
  const expiryField = document.querySelector("#cashoutExpiryDate");
  if (cardField) cardField.value = currentUserProfile?.cardNumber || "";
  if (cvvField) cvvField.value = currentUserProfile?.cvv || "";
  if (expiryField) expiryField.value = currentUserProfile?.expiryDate || "";
};

const loadMyListingsData = async () => {
  if (!auth.currentUser) return;
  const listingsQuery = query(collection(db, "Products"), where("seller", "==", auth.currentUser.uid));
  const listingsSnap = await getDocs(listingsQuery);

  if (listingsSnap.empty) {
    myListingsList.innerHTML = `<p class="profile-empty">Nothing listed yet.</p>`;
    if (pastListingsList) pastListingsList.innerHTML = `<p class="profile-empty">No past listings yet.</p>`;
    return;
  }

  const allListings = listingsSnap.docs.map((listingDoc) => {
    const listing = listingDoc.data();
    return {
      id: listingDoc.id,
      quantity: Number(listing.quantity) || 0,
      html: `
      <div class="profile-list-item">
        <div class="listing-row">
          <div>
            <div class="profile-list-title">${listing.name}</div>
            <div class="profile-list-meta">Price: $${listing.price} | Quantity: ${listing.quantity} | Category: ${listing.category}</div>
          </div>
          <button type="button" class="edit-listing-btn" onclick="openEditListingModal('${listingDoc.id}')" title="Edit listing" aria-label="Edit listing">✎</button>
        </div>
      </div>
    `
    };
  });

  const currentListings = allListings.filter((item) => item.quantity > 0).map((item) => item.html);
  const pastListings = allListings.filter((item) => item.quantity <= 0).map((item) => item.html);

  myListingsList.innerHTML = currentListings.length
    ? currentListings.join("")
    : `<p class="profile-empty">No active listings.</p>`;

  if (pastListingsList) {
    pastListingsList.innerHTML = pastListings.length
      ? pastListings.join("")
      : `<p class="profile-empty">No past listings yet.</p>`;
  }
};

const openProfileModal = async ({ showPrompt = false } = {}) => {
  if (!auth.currentUser) {
    alert("Please log in first.");
    return;
  }

  await loadCurrentUserProfile();
  const profile = currentUserProfile || {};

  document.querySelector("#profileFullName").value = profile.fullName || auth.currentUser.displayName || "";
  document.querySelector("#profileEmail").value = profile.email || auth.currentUser.email || "";
  document.querySelector("#profileAddress").value = profile.shippingAddress || "";
  document.querySelector("#profileCity").value = profile.shippingCity || "";
  document.querySelector("#profileState").value = profile.shippingState || "";
  document.querySelector("#profileZipcode").value = profile.shippingZipcode || "";
  document.querySelector("#profileCardName").value = profile.cardName || "";
  document.querySelector("#profileCardNumber").value = profile.cardNumber || "";
  document.querySelector("#profileExpiryDate").value = profile.expiryDate || "";
  document.querySelector("#profileCvv").value = profile.cvv || "";

  if (showPrompt) {
    profilePromptMessage.style.display = "block";
  } else {
    profilePromptMessage.style.display = "none";
  }

  setActiveProfileTab("accountTab");
  await Promise.all([loadTransactionTabData(), loadMyListingsData()]);
  prefillWalletCashoutForm();
  setCashoutMessage("");
  profileModal.classList.add("show");
};

const closeProfileModal = () => {
  profilePromptMessage.style.display = "none";
  profileModal.classList.remove("show");
};

const handleProfileSubmit = async (e) => {
  e.preventDefault();
  if (!auth.currentUser) return;

  const formData = new FormData(profileForm);
  const profileData = {
    fullName: formData.get("profileFullName"),
    email: formData.get("profileEmail"),
    shippingAddress: formData.get("profileAddress"),
    shippingCity: formData.get("profileCity"),
    shippingState: formData.get("profileState"),
    shippingZipcode: formData.get("profileZipcode"),
    cardName: formData.get("profileCardName"),
    cardNumber: formData.get("profileCardNumber"),
    expiryDate: formData.get("profileExpiryDate"),
    cvv: formData.get("profileCvv"),
    updatedAt: new Date()
  };

  await setDoc(doc(db, "Users", auth.currentUser.uid), profileData, { merge: true });
  currentUserProfile = { ...(currentUserProfile || {}), ...profileData };
  shouldPromptProfileCompletion = false;
  alert("Profile saved.");
  closeProfileModal();
};

closeProfileBtn.addEventListener("click", closeProfileModal);
cancelProfileBtn.addEventListener("click", closeProfileModal);
profileForm.addEventListener("submit", handleProfileSubmit);
walletCashoutForm?.addEventListener("submit", handleWalletCashout);
profileTabs.forEach((tabBtn) => {
  tabBtn.addEventListener("click", () => {
    setActiveProfileTab(tabBtn.dataset.tab);
  });
});
profileModal.addEventListener("click", (e) => {
  if (e.target === profileModal) {
    closeProfileModal();
  }
});


// Product Details Modal
const productModal = document.querySelector("#productModal");
const closeProductBtn = document.querySelector("#closeProductModal");
const cancelBuyBtn = document.querySelector("#cancelBuy");
const buyButton = document.querySelector("#buyButton");
const editFromProductButton = document.querySelector("#editFromProductButton");
const ownerNotice = document.querySelector("#ownerNotice");
const quantityControls = document.querySelector("#quantityControls");
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
        console.log(sellerDoc);
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

    const currentUserId = String(auth.currentUser?.uid || "");
    const sellerId = String(data.seller || "");
    const isOwner = currentUserId.length > 0 && currentUserId === sellerId;
    if (isOwner) {
      buyButton.style.display = "none";
      quantityControls.style.display = "none";
      ownerNotice.style.display = "block";
      editFromProductButton.style.display = "inline-block";
    } else {
      buyButton.style.display = "inline-block";
      quantityControls.style.display = "flex";
      ownerNotice.style.display = "none";
      editFromProductButton.style.display = "none";
    }

    productModal.classList.add("show");
  }
}

const closeProductModal = () => {
  productModal.classList.remove("show");
  currentProductId = null;
}

const purchaseFormModal = document.querySelector("#purchaseFormModal");
const confirmationModal = document.querySelector("#confirmationModal");
const purchaseForm = document.querySelector("#purchaseForm");
const closePurchaseFormBtn = document.querySelector("#closePurchaseForm");
const cancelPurchaseBtn = document.querySelector("#cancelPurchase");
const closeConfirmationBtn = document.querySelector("#closeConfirmation");
const cancelConfirmBtn = document.querySelector("#cancelConfirm");
const confirmPurchaseBtn = document.querySelector("#confirmPurchase");

let purchaseFormData = {};
let currentProduct = null;

const openPurchaseForm = async () => {
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
    if (auth.currentUser.uid === productData.seller) {
      alert("You cannot buy your own listing.");
      return;
    }

    if (productData.quantity < quantity) {
      alert("Not enough items in stock.");
      return;
    }

    currentProduct = { id: currentProductId, ...productData };
    purchaseForm.reset();

    if (auth.currentUser) {
      await loadCurrentUserProfile();
      const profile = currentUserProfile || {};

      document.querySelector("#fullName").value = profile.fullName || "";
      document.querySelector("#address").value = profile.shippingAddress || "";
      document.querySelector("#city").value = profile.shippingCity || "";
      document.querySelector("#state").value = profile.shippingState || "";
      document.querySelector("#zipcode").value = profile.shippingZipcode || "";
      document.querySelector("#cardName").value = profile.cardName || "";
      document.querySelector("#cardNumber").value = profile.cardNumber || "";
      document.querySelector("#expiryDate").value = profile.expiryDate || "";
      document.querySelector("#cvv").value = profile.cvv || "";
    }

    purchaseFormModal.classList.add("show");
  } catch (error) {
    console.error("Error opening purchase form:", error);
    alert("An error occurred. Please try again.");
  }
}

const closePurchaseForm = () => {
  purchaseFormModal.classList.remove("show");
}

const closeConfirmation = () => {
  confirmationModal.classList.remove("show");
}

const handlePurchaseFormSubmit = (e) => {
  e.preventDefault();
  
  const formData = new FormData(purchaseForm);
  purchaseFormData = {
    fullName: formData.get("fullName"),
    address: formData.get("address"),
    city: formData.get("city"),
    state: formData.get("state"),
    zipcode: formData.get("zipcode"),
    cardName: formData.get("cardName"),
    cardNumber: formData.get("cardNumber"),
    expiryDate: formData.get("expiryDate"),
    cvv: formData.get("cvv")
  };

  // Show confirmation modal
  showConfirmation();
}

const showConfirmation = () => {
  const confirmationDetails = document.querySelector("#confirmationDetails");
  confirmationDetails.innerHTML = `
    <div class="confirmation-content">
      <h3>Order Summary</h3>
      <div class="summary-item">
        <span><strong>Product:</strong></span>
        <span>${currentProduct.name}</span>
      </div>
      <div class="summary-item">
        <span><strong>Price:</strong></span>
        <span>$${currentProduct.price}</span>
      </div>
      <div class="summary-item">
        <span><strong>Quantity:</strong></span>
        <span>${currentQuantity}</span>
      </div>
      <div class="summary-item total">
        <span><strong>Total:</strong></span>
        <span><strong>$${(currentProduct.price * currentQuantity).toFixed(2)}</strong></span>
      </div>

      <h3>Shipping To</h3>
      <div class="summary-item">
        <span>${purchaseFormData.fullName}</span>
      </div>
      <div class="summary-item">
        <span>${purchaseFormData.address}</span>
      </div>
      <div class="summary-item">
        <span>${purchaseFormData.city}, ${purchaseFormData.state} ${purchaseFormData.zipcode}</span>
      </div>

      <h3>Payment Method</h3>
      <div class="summary-item">
        <span>Card ending in ${purchaseFormData.cardNumber.slice(-4)}</span>
      </div>
    </div>
  `;
  
  closePurchaseForm();
  confirmationModal.classList.add("show");
}

const handleBuy = async () => {
  if (!currentProduct) return;
  if (auth.currentUser && currentProduct.seller === auth.currentUser.uid) {
    alert("You cannot buy your own listing.");
    return;
  }

  const quantity = currentQuantity;
  
  try {
    const productRef = doc(db, "Products", currentProduct.id);
    
    // Update product quantity
    const newQuantity = currentProduct.quantity - quantity;
    await updateDoc(productRef, { quantity: newQuantity });

    console.log(purchaseFormData);
    // Create purchase record
    const purchaseData = {
      buyerUID: auth.currentUser.uid,
      productID: currentProduct.id,
      purchasedAt: new Date().toISOString(),
      quantity: quantity,
      sellerUID: currentProduct.seller,
      shippingInfo: {
        fullName: purchaseFormData.fullName,
        address: purchaseFormData.address,
        city: purchaseFormData.city,
        state: purchaseFormData.state,
        zipcode: purchaseFormData.zipcode
      }
    };

    const purchasesRef = collection(db, "Purchases");
    await addDoc(purchasesRef, purchaseData);

    alert(`Purchase successful! You bought ${quantity} item(s).`);
    closeConfirmation();
    closeProductModal();
    purchaseFormData = {};

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
buyButton.addEventListener("click", openPurchaseForm);
editFromProductButton?.addEventListener("click", async () => {
  if (!currentProductId) return;
  const listingId = currentProductId;
  closeProductModal();
  await openEditListingModal(listingId);
});

// Event listeners for purchase form modal
closePurchaseFormBtn.addEventListener("click", closePurchaseForm);
cancelPurchaseBtn.addEventListener("click", () => {
  closePurchaseForm();
  purchaseFormData = {};
});
purchaseForm.addEventListener("submit", handlePurchaseFormSubmit);
purchaseFormModal.addEventListener("click", (e) => {
  if (e.target === purchaseFormModal) {
    closePurchaseForm();
  }
});

// Event listeners for confirmation modal
closeConfirmationBtn.addEventListener("click", closeConfirmation);
cancelConfirmBtn.addEventListener("click", () => {
  closeConfirmation();
  purchaseFormModal.classList.add("show");
});
confirmPurchaseBtn.addEventListener("click", handleBuy);
confirmationModal.addEventListener("click", (e) => {
  if (e.target === confirmationModal) {
    closeConfirmation();
  }
});

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
window.openEditListingModal = openEditListingModal;

function renderAuthSpot() {
  if (auth.currentUser) {
    authSpot.innerHTML = `<button id="listItem" class="btn-list">List Item</button><button id="myProfile" class="btn-profile">My Profile</button><button id="logout">Logout</button>`;
    document.querySelector("#logout").addEventListener('click', () => logout());
    document.querySelector("#listItem").addEventListener('click', () => openListModal());
    document.querySelector("#myProfile").addEventListener('click', () => openProfileModal());
  } else {
    authSpot.innerHTML = `<button class="btn-auth" disabled>Not Logged In</button><button class="btn-auth" id="login">Register / Sign In</button>`
    document.querySelector("#login").addEventListener('click', () => openAuthMethodModal());
  }
}

const registerUserInDb = async (user) => {
  const userRef = doc(db, "Users", user.uid);
  const existingUser = await getDoc(userRef);
  const isNewUser = !existingUser.exists();
  await setDoc(userRef, {
    fullName: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email,
    createdAt: new Date()
  }, { merge: true }); // 'merge' prevents overwriting if they log in again
  return isNewUser;
};

// Store all products for filtering
let allProducts = [];
let featuredProducts = [];
let featuredIndex = 0;
let featuredRaf = null;
let featuredAutoScrollPxPerFrame = 0.1;
let featuredAutoScrollStoppedByUser = false;
const featuredTrack = document.querySelector("#featuredTrack");
let featuredSetWidth = 0;

const renderFeaturedItem = () => {
  if (!featuredTrack) return;
  if (!featuredProducts.length) {
    featuredTrack.innerHTML = `<p class="no-results">No featured items yet</p>`;
    return;
  }

  const ordered = featuredProducts.map((_, i) => featuredProducts[(featuredIndex + i) % featuredProducts.length]);
  const estimatedCardWidth = 352;
  const viewportWidth = featuredTrack.clientWidth || 1200;
  const minCards = Math.max(30, Math.ceil((viewportWidth * 6) / estimatedCardWidth));
  const displaySet = Array.from({ length: minCards }, (_, i) => ordered[i % ordered.length]);
  const cardsHtml = displaySet.map((product) => {
    const imageHtml = product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.name}">` : `<div class="no-image">No Image</div>`;
    return `
      <div class="featured-card" onclick="openProductModal('${product.id}')">
        <div class="featured-image">${imageHtml}</div>
        <div class="featured-content">
          <div class="featured-title">${product.name}</div>
          <div class="featured-meta">${product.category} • Qty: ${product.quantity}</div>
          <div class="featured-price">$${product.price}</div>
        </div>
      </div>
    `;
  }).join("");

  const durationSeconds = Math.max(45, featuredProducts.length * 10);
  featuredTrack.innerHTML = `
    <div class="featured-list" style="--scroll-duration:${durationSeconds}s;">
      <div class="featured-set">${cardsHtml}</div>
    </div>
  `;

  const featuredSet = featuredTrack.querySelector(".featured-set");
  if (featuredSet) {
    requestAnimationFrame(() => {
      const setWidth = featuredSet.offsetWidth;
      if (setWidth <= 0) return;
      featuredSetWidth = setWidth;
      featuredTrack.scrollLeft = 0;
      featuredAutoScrollPxPerFrame = Math.max(0.05, setWidth / (durationSeconds * 60));
    });
  }
};

const startFeaturedRotation = () => {
  if (featuredAutoScrollStoppedByUser) return;
  if (featuredRaf) cancelAnimationFrame(featuredRaf);
  const tick = () => {
    if (featuredAutoScrollStoppedByUser) return;
    if (!featuredTrack) return;
    if (featuredSetWidth > 0) {
      featuredTrack.scrollLeft += featuredAutoScrollPxPerFrame;
      if (featuredTrack.scrollLeft >= featuredSetWidth) {
        featuredTrack.scrollLeft = 0;
      }
    }
    featuredRaf = requestAnimationFrame(tick);
  };
  featuredRaf = requestAnimationFrame(tick);
};

const setFeaturedProducts = (products) => {
  featuredAutoScrollStoppedByUser = false;
  featuredProducts = [...products]
    .sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))
    .slice(0, 6);
  featuredIndex = 0;
  renderFeaturedItem();
  startFeaturedRotation();
};

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
  
  setFeaturedProducts(allProducts);
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

featuredTrack?.addEventListener("wheel", (e) => {
  e.preventDefault();
  featuredAutoScrollStoppedByUser = true;
  if (featuredRaf) cancelAnimationFrame(featuredRaf);
  featuredTrack.scrollLeft += e.deltaY + e.deltaX;
  if (featuredSetWidth > 0) {
    if (featuredTrack.scrollLeft >= featuredSetWidth) {
      featuredTrack.scrollLeft = 0;
    }
    while (featuredTrack.scrollLeft < 0) {
      featuredTrack.scrollLeft += featuredSetWidth;
    }
  }
}, { passive: false });

// Call fetchAndRenderProducts on page load
fetchAndRenderProducts();
