/* PROJECT: 618 ADMIN | TOTAL RECON UPLINK v2.4 (GLOSSY RECON EDITION)
  TIMESTAMP: 2026-06-23 21:45:00 (America/New_York)
  FUNCTIONALITY: XML-to-JSON Pipeline + Raw Text Bypass + Dynamic UI Glow Injector
*/

const firebaseConfig = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:af6f468ca3cf06759aa692"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function xmlToJson(node) {
    if (node.nodeType === 3) {
        const text = node.nodeValue.trim();
        return text.length > 0 ? text : null;
    }

    let obj = {};
    if (node.nodeType === 1 && node.attributes.length > 0) {
        for (let j = 0; j < node.attributes.length; j++) {
            let attribute = node.attributes.item(j);
            obj["@" + attribute.nodeName] = attribute.nodeValue;
        }
    }

    if (node.hasChildNodes()) {
        for (let i = 0; i < node.childNodes.length; i++) {
            let item = node.childNodes.item(i);
            let result = xmlToJson(item);
            
            if (result === null) continue;

            let nodeName = item.nodeName;
            if (item.nodeType === 3) {
                obj["#text_value"] = result;
            } else {
                if (typeof (obj[nodeName]) === "undefined") {
                    obj[nodeName] = result;
                } else {
                    if (!Array.isArray(obj[nodeName])) {
                        let old = obj[nodeName];
                        obj[nodeName] = [old];
                    }
                    obj[nodeName].push(result);
                }
            }
        }
    }
    return obj;
}

// Helper to push text updates AND change the glossy CSS border glow
function setConsoleStatus(msg, hexGlowColor) {
    const statusBox = document.getElementById('upload-status');
    statusBox.innerText = msg;
    statusBox.style.borderLeftColor = hexGlowColor;
}

async function executeAdvancedSync() {
    const xmlInput = document.getElementById('manual-xml-input').value.trim();
    const fileType = document.getElementById('xml-file-type').value;
    
    if (!xmlInput) {
        setConsoleStatus("❌ FAULT: INPUT DATA BOX IS EMPTY", "#ff0055"); // Red
        return;
    }

    setConsoleStatus("⏳ CHECKING MASTER SILO FOR DELTAS...", "#FF4500"); // Orange

    // Master Override targeting matching Google Script pathing
    const path = `fs25/${fileType}`;
    let processedData = null;

    if (fileType === "systemLogs") {
        processedData = xmlInput;
    } else {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlInput, "text/xml");
            
            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("Malformed XML structural syntax detected.");
            }
            
            processedData = xmlToJson(xmlDoc.documentElement);
        } catch (err) {
            setConsoleStatus("❌ XML PARSE FAULT: " + err.message, "#ff0055"); // Red
            console.error(err);
            return;
        }
    }

    try {
        const snapshot = await db.ref(path).once('value');
        const currentData = snapshot.val();

        if (JSON.stringify(currentData) === JSON.stringify(processedData)) {
            setConsoleStatus("ℹ️ NO DATA DELTAS DETECTED. SILO UNTOUCHED.", "#00D2FF"); // Cyan
            return;
        }

        await db.ref(path).set(processedData);
        setConsoleStatus(`✅ UPLINK SUCCESS: Overwrote Silo Node [ ${path} ]`, "#00f260"); // Neon Green
        
    } catch (e) {
        setConsoleStatus("❌ PIPELINE CRASH: " + e.message, "#ff0055"); // Red
        console.error(e);
    }
}
