require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

if (!process.env.PRIVATE_KEY) {
    console.error("❌ Please fill in PRIVATE_KEY in .env");
    process.exit(1);
}
if (!process.env.CONTRACT_ADDRESS) {
    console.error("❌ Please fill in CONTRACT_ADDRESS in .env");
    process.exit(1);
}

const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const abi = JSON.parse(fs.readFileSync('abi.json'));
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abi, wallet);

async function waitUntil(timestamp) {
    const now = Math.floor(Date.now() / 1000);
    if (timestamp > now) {
        const waitMs = (timestamp - now) * 1000;
        console.log(`⏳ Waiting ${(waitMs / 1000).toFixed(0)} seconds until mint time...`);
        await new Promise(r => setTimeout(r, waitMs));
    }
}

async function mintNFT() {
    try {
        console.log("🚀 Sending mint transaction...");
        const tx = await contract.mint(1, {
            gasLimit: 300000
        });
        console.log("✅ Mint tx sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("🎉 Mint confirmed in block", receipt.blockNumber);
    } catch (err) {
        console.error("❌ Mint failed:", err.message);
    }
}

(async () => {
    try {
        let startTime;
        if (contract.publicMintStart) {
            try {
                startTime = await contract.publicMintStart();
                startTime = Number(startTime);
                console.log("📅 Contract mint start time:", startTime);
            } catch {
                console.warn("⚠️ Could not read start time from contract");
            }
        }
        if (!startTime && process.env.MINT_START_TIME) {
            startTime = Number(process.env.MINT_START_TIME);
        }
        if (startTime) {
            await waitUntil(startTime);
        }
        await mintNFT();
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
})();
