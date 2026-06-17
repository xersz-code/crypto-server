const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://test-4e8be-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const db = admin.database();

let assets = {
    CMLK: { name: "CatMilk", price: 50, basePrice: 50, baseVolatility: 4, minPrice: 5, eventActive: false, bleedTarget: 0, reboundActive: false, stableCount: 0 },
    GWHA: { name: "GreatWhale", price: 100, basePrice: 100, baseVolatility: 12, minPrice: 10, eventActive: false, bleedTarget: 0, reboundActive: false, stableCount: 0 },
    WMN:  { name: "WooMen", price: 150, basePrice: 150, baseVolatility: 15, minPrice: 15, eventActive: false, bleedTarget: 0, reboundActive: false, stableCount: 0 },
    KSKK: { name: "KnicksKicks", price: 50, basePrice: 50, baseVolatility: 3, minPrice: 5, eventActive: false, bleedTarget: 0, reboundActive: false, stableCount: 0 },
    TLP:  { name: "ToiletPaper", price: 100, basePrice: 100, baseVolatility: 8, minPrice: 10, eventActive: false, bleedTarget: 0, reboundActive: false, stableCount: 0 },
    DYLX: { name: "DannyLux", price: 50, basePrice: 50, baseVolatility: 4, minPrice: 5, eventActive: false, bleedTarget: 0, reboundActive: false, stableCount: 0 }
};

let globalEventCooldown = 0;

db.ref('prices').once('value', snapshot => {
    const cloudPrices = snapshot.val();
    if (cloudPrices) {
        Object.keys(cloudPrices).forEach(k => {
            if (assets[k]) {
                assets[k].price = cloudPrices[k].price || assets[k].basePrice;
                assets[k].eventActive = cloudPrices[k].eventActive || false;
                assets[k].bleedTarget = cloudPrices[k].bleedTarget || 0;
                assets[k].reboundActive = cloudPrices[k].reboundActive || false;
            }
        });
    }
    setInterval(tickSimulationEngine, 1000);
});

function tickSimulationEngine() {
    let payload = {};
    let now = Date.now();

    Object.keys(assets).forEach(k => {
        let c = assets[k];
        let globalEventChance = 0.0015; 

        if (c.reboundActive) {
            let distanceToBase = c.basePrice - c.price;
            if (distanceToBase > 0.3) {
                c.price += (distanceToBase * 0.075);
            } else {
                c.price = c.basePrice;
                c.reboundActive = false;
            }

        } else if (!c.eventActive) {
            if (Math.random() < globalEventChance && now > globalEventCooldown) {

                let eventMultiplier = 2.0 + (Math.random() * 3.0);

                c.price = c.price * (1 + eventMultiplier);
                c.eventActive = true;
                c.bleedTarget = c.basePrice;

                let randomDelaySeconds = 10 + Math.random() * 20; 
                globalEventCooldown = now + (randomDelaySeconds * 1000); 

                db.ref('globalEvents').set({
                    title: `🚨 CRITICAL ${c.name} VOLATILITY SHIFT`,
                    message: `Pump up by ${(eventMultiplier * 100).toFixed(0)}%!`,
                    timestamp: admin.database.ServerValue.TIMESTAMP
                });

            } else {
                let roll = Math.random();

                if (roll < 0.40) {
                    let changePercent = 0.01 + Math.random() * 0.05;
                    c.price *= (1 + changePercent);
                    c.stableCount = 0;

                } else if (roll < 0.95) {
                    let changePercent = 0.01 + Math.random() * 0.05;
                    c.price *= (1 - changePercent);
                    c.stableCount = 0;

                } else {
                    c.stableCount++;
                    if (c.stableCount >= 5) {
                        let drift = (Math.random() - 0.5) * 0.02;
                        c.price *= (1 + drift);
                        c.stableCount = 0;
                    }
                }
            }

        } else {
            let distanceAboveBase = c.price - c.bleedTarget;
            if (distanceAboveBase > 0.2) {
                c.price -= (distanceAboveBase * 0.045);
            } else {
                c.price = c.bleedTarget;
                c.eventActive = false;
            }
        }

        if (c.price < 30 && !c.reboundActive) {
            c.reboundActive = true;
            c.eventActive = false;
        }

        if (c.price < c.minPrice) {
            c.price = c.minPrice;
        }

        payload[k] = {
            price: c.price,
            eventActive: c.eventActive,
            bleedTarget: c.bleedTarget || 0
        };
    });

    db.ref('prices').set(payload);
                                         }
