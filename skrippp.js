const firebaseConfig = {
  apiKey: "AIzaSyCo6KmvSt92P-4qlSS1WBTk8NJMhTqfvbc",
  authDomain: "test-4e8be.firebaseapp.com",
  databaseURL: "https://test-4e8be-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "test-4e8be",
  storageBucket: "test-4e8be.firebasestorage.app",
  messagingSenderId: "608560408392",
  appId: "1:608560408392:web:17b7e6a2427dbfb81db57d",
  measurementId: "G-NDGF6WRKPQ"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

let isSignUpMode = false;
let currentUser = null;
let globalUsersData = {}; 

let money = 100; 
let currentAssetKey = 'CMLK'; 
let currentUsername = "";

// --- SISTEM DETEKSI NOTIFIKASI GLOBAL EVENT ---
let lastEventTimestamp = 0; 

db.ref('globalEvents').on('value', (snapshot) => {
    const eventData = snapshot.val();
    if (!eventData) return;

    if (eventData.timestamp > lastEventTimestamp) {
        lastEventTimestamp = eventData.timestamp;

        db.ref('prices').once('value', (priceSnapshot) => {
            const prices = priceSnapshot.val();
            if (!prices) return;

            Object.keys(prices).forEach(cryptoKey => {
                if (prices[cryptoKey].eventActive || prices[cryptoKey].pumpTicksLeft > 0) {
                    const cryptoName = cryptoKey;             
                    const currentPrice = prices[cryptoKey].price; 

                    triggerPopOutAlert(`"${cryptoName}" lagi naik jadi "${currentPrice}"`);
                }
            });
        });
    }
});

function triggerPopOutAlert(messageText) {
    const modal = document.getElementById('customAlertModal');
    const box = document.getElementById('customAlertBox');
    const msgElement = document.getElementById('customAlertMessage');
    const titleElement = document.getElementById('customAlertTitle');

    if (modal && msgElement) {
        box.classList.add('pump-alert');
        titleElement.innerText = "EVENT PUMP";
        msgElement.innerText = messageText;
        modal.classList.add('visible');
    }
}

function triggerCustomAlert(title, message, isPumpEvent = false) {
    const modal = document.getElementById("customAlertModal");
    const containerBox = document.getElementById("customAlertBox");
    if(!modal || !containerBox) return;
    
    document.getElementById("customAlertTitle").innerText = title;
    document.getElementById("customAlertMessage").innerText = message;
    
    if(isPumpEvent) {
        containerBox.classList.add("pump-alert");
    } else {
        containerBox.classList.remove("pump-alert");
    }
    modal.classList.add("visible");
}

function closeCustomAlert() {
    const modal = document.getElementById("customAlertModal");
    if(modal) modal.classList.remove("visible");
}

let assets = {
    CMLK: { name: "CatMilk", price: 50, basePrice: 50, holdings: 0, avgPrice: 0, history: [], baseVolatility: 4, minPrice: 5, eventActive: false, bleedTarget: 0 },
    GWHA: { name: "GreatWhale", price: 100, basePrice: 100, holdings: 0, avgPrice: 0, history: [], baseVolatility: 12, minPrice: 10, eventActive: false, bleedTarget: 0 },
    WMN:  { name: "WooMen", price: 150, basePrice: 150, holdings: 0, avgPrice: 0, history: [], baseVolatility: 15, minPrice: 15, eventActive: false, bleedTarget: 0 },
    KSKK: { name: "KnicksKicks", price: 50, basePrice: 50, holdings: 0, avgPrice: 0, history: [], baseVolatility: 3, minPrice: 5, eventActive: false, bleedTarget: 0 },
    TLP:  { name: "ToiletPaper", price: 100, basePrice: 100, holdings: 0, avgPrice: 0, history: [], baseVolatility: 8, minPrice: 10, eventActive: false, bleedTarget: 0 },
    DYLX: { name: "DannyLux", price: 50, basePrice: 50, holdings: 0, avgPrice: 0, history: [], baseVolatility: 4, minPrice: 5, eventActive: false, bleedTarget: 0 }
};

Object.keys(assets).forEach(k => {
    for(let i=0; i<80; i++) assets[k].history.push(assets[k].price);
});

let canvas;
let ctx;

function toggleAuthMode() {
    isSignUpMode = !isSignUpMode;
    document.getElementById("authTitle").innerText = isSignUpMode ? "Sign Up" : "Sign In";
    
    const usernameInput = document.getElementById("authUsername");
    const emailInput = document.getElementById("authEmail");
    
    if (isSignUpMode) {
        if(usernameInput) usernameInput.style.display = "block";
        if(emailInput) emailInput.placeholder = "Tidak perlu diisi";
    } else {
        if(usernameInput) usernameInput.style.display = "none";
        if(emailInput) emailInput.placeholder = "Enter Username";
    }
    
    document.getElementById("authPrimaryAction").innerText = isSignUpMode ? "Register Account" : "Sign In";
    document.getElementById("authToggleAction").innerText = isSignUpMode ? "Have an account? Sign In" : "Don't have an account? Sign Up";
}

function handleAuth() {
    const usernameInput = document.getElementById("authUsername") ? document.getElementById("authUsername").value.trim().toLowerCase() : "";
    const emailInputFallback = document.getElementById("authEmail").value.trim().toLowerCase();
    
    const username = isSignUpMode ? usernameInput : emailInputFallback;
    const password = document.getElementById("authPassword").value;
    
    if(!username || !password) return triggerCustomAlert("Error", "Isi semua bidang formulir.");
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if(!usernameRegex.test(username)) return triggerCustomAlert("Error", "Username hanya boleh berisi huruf, angka, dan underscore.");

    const virtualEmail = `${username}@game.local`;

    if(isSignUpMode) {
        db.ref('users').orderByChild('username').equalTo(username).once('value', snapshot => {
            if(snapshot.exists()) {
                return triggerCustomAlert("Auth Error", "Username sudah digunakan.");
            }

            auth.createUserWithEmailAndPassword(virtualEmail, password)
                .then(res => { 
                    saveUserDataToCloud(res.user.uid, virtualEmail, username);
                    triggerCustomAlert("Berhasil", "Registrasi berhasil."); 
                })
                .catch(err => triggerCustomAlert("Auth Error", err.message));
        });
    } else {
        auth.signInWithEmailAndPassword(virtualEmail, password)
            .catch(err => triggerCustomAlert("Auth Error", "Username atau password salah."));
    }
}

auth.onAuthStateChanged(user => {
    if(user) {
        currentUser = user;
        document.getElementById("authContainer").style.display = "none";
        document.getElementById("accountUid").innerText = user.uid;
        
        db.ref('users/' + user.uid).on('value', snapshot => {
            const data = snapshot.val();
            if(data) {
                money = data.money ?? 100; 
                currentUsername = data.username || user.email.split('@')[0];
                document.getElementById("accountUserIdentity").innerText = `${currentUsername} / ${user.email}`;
                if(!document.getElementById("profileNewUsername").value) {
                    document.getElementById("profileNewUsername").value = currentUsername;
                }
                
                Object.keys(assets).forEach(k => {
                    assets[k].holdings = 0;
                    assets[k].avgPrice = 0;
                });

                if(data.holdings) {
                    Object.keys(data.holdings).forEach(k => {
                        if(assets[k]) {
                            assets[k].holdings = data.holdings[k].qty ?? 0;
                            assets[k].avgPrice = data.holdings[k].avgPrice ?? 0;
                        }
                    });
                }
                updateInterfaceUI();
            } else {
                saveUserDataToCloud(user.uid, user.email, user.email.split('@')[0]); 
            }
        });

        db.ref('users').on('value', snapshot => {
            globalUsersData = snapshot.val() || {};
            renderLeaderboardOverlay();
            renderAccountRankStatus();
        });

    } else {
        currentUser = null;
        document.getElementById("authContainer").style.display = "flex";
    }
});

function updateProfileUsername() {
    const nameInput = document.getElementById("profileNewUsername").value.trim();
    if(!nameInput) return triggerCustomAlert("Error", "Username tidak boleh kosong.");
    if(!currentUser) return;

    currentUsername = nameInput;
    db.ref('users/' + currentUser.uid + '/username').set(nameInput)
        .then(() => triggerCustomAlert("Sukses", "Username diperbarui."))
        .catch(err => triggerCustomAlert("Error", err.message));
}

function saveUserDataToCloud(forcedUid, forcedEmail, chosenUsername) {
    let uid = forcedUid || (currentUser ? currentUser.uid : null);
    let email = forcedEmail || (currentUser ? currentUser.email : "");
    let uname = chosenUsername || currentUsername || email.split('@')[0];
    if(!uid) return;
    
    let holdingsCloudPayload = {};
    Object.keys(assets).forEach(k => {
        holdingsCloudPayload[k] = { qty: assets[k].holdings, avgPrice: assets[k].avgPrice };
    });

    db.ref('users/' + uid).set({
        username: uname, email: email, money: money, holdings: holdingsCloudPayload
    });
}

function triggerLogout() {
    closeOverlays();
    auth.signOut().then(() => {
        money = 100; 
        Object.keys(assets).forEach(k => { assets[k].holdings = 0; assets[k].avgPrice = 0; });
        document.getElementById("authUsername").value = "";
        document.getElementById("authEmail").value = "";
        document.getElementById("authPassword").value = "";
        document.getElementById("profileNewUsername").value = "";
    });
}

function updateChart(){
    if(!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#00FF88";

    let activeHistory = assets[currentAssetKey].history;
    let maxVal = Math.max(...activeHistory);
    let minVal = Math.min(...activeHistory);
    
    if (maxVal === minVal) {
        maxVal += 1;
        minVal -= 1;
    }

    let valueRange = maxVal - minVal;
    let paddingTop = 40;     
    let paddingBottom = 130; 
    let usableHeight = canvas.height - paddingTop - paddingBottom;

    activeHistory.forEach((v, i) => {
        let x = i * (canvas.width / (activeHistory.length - 1));
        let normalizedY = (v - minVal) / valueRange; 
        let y = canvas.height - paddingBottom - (normalizedY * usableHeight);
        
        if (y < paddingTop) y = paddingTop;
        if (y > canvas.height - paddingBottom) y = canvas.height - paddingBottom;

        if(i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();
}

db.ref('prices').on('value', snapshot => {
    const cloudPrices = snapshot.val();
    if(cloudPrices) {
        Object.keys(cloudPrices).forEach(k => {
            if(assets[k]) {
                assets[k].price = cloudPrices[k].price;
                assets[k].eventActive = cloudPrices[k].eventActive || false;
                assets[k].bleedTarget = cloudPrices[k].bleedTarget || 0;
                
                assets[k].history.push(assets[k].price);
                if(assets[k].history.length > 80) assets[k].history.shift();
            }
        });
        updateInterfaceUI();
    }
});

function updateInterfaceUI() {
    let currentCoin = assets[currentAssetKey];
    if(!currentCoin) return;
    
    const assetLabel = document.getElementById("activeAssetLabel");
    const priceLabel = document.getElementById("price");
    const balanceLabel = document.getElementById("balanceValue");
    const holdingLabel = document.getElementById("holdingValue");

    if(assetLabel) assetLabel.innerText = `${currentCoin.name} (${currentAssetKey})`;
    if(priceLabel) priceLabel.innerText = "$" + currentCoin.price.toFixed(currentCoin.price < 2 ? 4 : 2);
    if(balanceLabel) balanceLabel.innerText = "$" + money.toFixed(0);
    if(holdingLabel) holdingLabel.innerText = `${currentCoin.holdings} ${currentAssetKey}`;
    
    updateChart();
    renderPositionInfo(currentCoin);
    renderCryptoListOverlay();
}

function renderPositionInfo(coin) {
    const pos = document.getElementById("positionResult");
    if(!pos) return;
    if(coin.holdings === 0){
        pos.className = "position neutral"; pos.innerText = "No position";
    } else {
        let profit = (coin.price - coin.avgPrice) * coin.holdings;
        let percent = ((coin.price - coin.avgPrice) / coin.avgPrice) * 100;
        if(profit >= 0){
            pos.className = "position green"; pos.innerText = `▲ +$${profit.toFixed(2)} (${percent.toFixed(1)}%)`;
        } else {
            pos.className = "position red"; pos.innerText = `▼ -$${Math.abs(profit).toFixed(2)} (${Math.abs(percent).toFixed(1)}%)`;
        }
    }
}

// =========================================================================
// INTERFACES EKSTERNAL DIPATENKAN LANGSUNG KE WINDOW OBJECT
// =========================================================================
window.buyAsset = function() {
    console.log("-> [EVENT] Tombol BUY ditekan.");
    if (!currentUser) return triggerCustomAlert("Error", "Silakan login terlebih dahulu.");
    
    let coin = assets[currentAssetKey];
    if (money < coin.price) return triggerCustomAlert("Error", "Saldo Anda tidak mencukupi.");

    console.log(`-> Mendaftarkan antrean BUY untuk ${currentAssetKey}`);
    db.ref('transactionRequests').push({
        type: "BUY",
        playerId: currentUser.uid,
        coinKey: currentAssetKey,
        amount: 1
    }).then(() => {
        console.log("✅ Request BUY berhasil diunggah ke Firebase Node.");
    }).catch(err => {
        console.error("❌ Firebase menolak push data:", err.message);
    });
};

window.sellAsset = function() {
    console.log("-> [EVENT] Tombol SELL ditekan.");
    if (!currentUser) return triggerCustomAlert("Error", "Silakan login terlebih dahulu.");
    
    let coin = assets[currentAssetKey];
    if (coin.holdings <= 0) return triggerCustomAlert("Error", "Jumlah koin Anda tidak mencukupi.");

    console.log(`-> Mendaftarkan antrean SELL untuk ${currentAssetKey}`);
    db.ref('transactionRequests').push({
        type: "SELL",
        playerId: currentUser.uid,
        coinKey: currentAssetKey,
        amount: 1
    }).then(() => {
        console.log("✅ Request SELL berhasil diunggah ke Firebase Node.");
    }).catch(err => {
        console.error("❌ Firebase menolak push data:", err.message);
    });
};

window.sellAllAssets = function() {
    console.log("-> [EVENT] Tombol SELL ALL ditekan.");
    if (!currentUser) return triggerCustomAlert("Error", "Silakan login terlebih dahulu.");
    
    let coin = assets[currentAssetKey];
    if (coin.holdings <= 0) return triggerCustomAlert("Error", "Tidak ada aset untuk dijual.");

    console.log(`-> Mendaftarkan antrean SELL_ALL untuk ${currentAssetKey}`);
    db.ref('transactionRequests').push({
        type: "SELL_ALL",
        playerId: currentUser.uid,
        coinKey: currentAssetKey,
        amount: 0
    }).then(() => {
        console.log("✅ Request SELL_ALL berhasil diunggah ke Firebase Node.");
    }).catch(err => {
        console.error("❌ Firebase menolak push data:", err.message);
    });
};

let menuBtn;
let menuPanel;

window.openOverlay = function(target) {
    if(menuPanel && menuBtn) {
        menuPanel.classList.remove("show"); menuBtn.classList.remove("open");
    }
    closeOverlays();
    const overlay = document.getElementById(`${target}Overlay`);
    if(overlay) overlay.classList.add("active");
};

window.closeOverlays = function() {
    const cryptoOverlay = document.getElementById("cryptoOverlay");
    const leaderboardOverlay = document.getElementById("leaderboardOverlay");
    const accountOverlay = document.getElementById("accountOverlay");

    if(cryptoOverlay) cryptoOverlay.classList.remove("active");
    if(leaderboardOverlay) leaderboardOverlay.classList.remove("active");
    if(accountOverlay) accountOverlay.classList.remove("active");
};

window.selectTradingAsset = function(key) {
    currentAssetKey = key;
    window.closeOverlays();
    updateInterfaceUI();
};

function renderCryptoListOverlay() {
    const listContainer = document.getElementById("cryptoRenderList");
    if(!listContainer) return;
    
    let html = "";
    Object.keys(assets).forEach(k => {
        let coin = assets[k];
        let activeClass = (k === currentAssetKey) ? "active-asset" : "";
        let precision = coin.price < 2 ? 4 : 2;
        html += `
            <div class="crypto-item ${activeClass}" onclick="selectTradingAsset('${k}')">
                <div class="asset-identity">
                    <span>${coin.name}</span><span class="asset-ticker">${k}</span>
                </div>
                <div style="font-weight:600; color: ${coin.eventActive ? '#ff9f00' : 'white'};">
                    $${coin.price.toFixed(precision)}
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

function calculateUserNetWorth(userData) {
    let total = userData.money ?? 100; 
    if(userData.holdings) {
        Object.keys(userData.holdings).forEach(k => {
            if(assets[k]) total += (userData.holdings[k].qty ?? 0) * assets[k].price;
        });
    }
    return total;
}

function getSortedLeaderboard() {
    let list = [];
    Object.keys(globalUsersData).forEach(uid => {
        let u = globalUsersData[uid];
        list.push({
            uid: uid,
            username: u.username || u.email.split('@')[0] || 'Anonymous',
            netWorth: calculateUserNetWorth(u)
        });
    });
    return list.sort((a, b) => b.netWorth - a.netWorth);
}

function renderLeaderboardOverlay() {
    const listContainer = document.getElementById("leaderboardRenderList");
    if(!listContainer) return;

    let sortedList = getSortedLeaderboard();
    let html = "";

    let displayLimit = Math.min(sortedList.length, 5);
    for(let i = 0; i < displayLimit; i++) {
        let entry = sortedList[i];
        let isMe = (currentUser && entry.uid === currentUser.uid) ? "me" : "";
        
        html += `
            <div class="leader-item ${isMe}">
                <div class="rank-identity">
                    <span class="rank-num">${i + 1}</span>
                    <span>${entry.username} ${isMe ? '(You)' : ''}</span>
                </div>
                <div style="font-weight:600;">$${entry.netWorth.toFixed(2)}</div>
            </div>
        `;
    }
    listContainer.innerHTML = html || "<div>Waiting for database rankings...</div>";
}

function renderAccountRankStatus() {
    const statusNode = document.getElementById("systemStatusRow");
    if(!statusNode || !currentUser) return;

    let sortedList = getSortedLeaderboard();
    let myRankIndex = sortedList.findIndex(e => e.uid === currentUser.uid);

    if(myRankIndex !== -1) {
        let totalPlayers = sortedList.length;
        let rankPosition = myRankIndex + 1;
        let topPercentile = ((rankPosition / totalPlayers) * 100).toFixed(1);

        statusNode.innerHTML = `
            <div class="label">Current Ranking Standing</div>
            <div class="account-value" style="color:#00ff88;">
                Rank #${rankPosition} of ${totalPlayers} <span style="color:#888; font-size:13px; font-weight:normal;">(Top ${topPercentile}%)</span>
            </div>
        `;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    canvas = document.getElementById("chart");
    if(canvas) ctx = canvas.getContext("2d");

    menuBtn = document.getElementById("menuBtn");
    menuPanel = document.getElementById("menuPanel");

    if (menuBtn && menuPanel) {
        menuBtn.onclick = () => {
            menuPanel.classList.toggle("show"); menuBtn.classList.toggle("open");
        };
    }

    const targetCard = document.querySelector("#accountOverlay .overlay-card");
    if(targetCard) {
        let newRow = document.createElement("div");
        newRow.className = "account-info-row"; newRow.id = "systemStatusRow";
        targetCard.appendChild(newRow);
    }
    
    updateInterfaceUI();
});

window.handleAuth = handleAuth;
window.toggleAuthMode = toggleAuthMode;
window.updateProfileUsername = updateProfileUsername;
window.triggerLogout = triggerLogout;
window.closeCustomAlert = closeCustomAlert;
