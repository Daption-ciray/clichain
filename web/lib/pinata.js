function pinataConfigured() {
  return Boolean(
    process.env.PINATA_JWT ||
    (process.env.PINATA_API_KEY && process.env.PINATA_API_SECRET)
  );
}

function pinataHeaders() {
  if (process.env.PINATA_JWT) {
    return {
      "authorization": `Bearer ${process.env.PINATA_JWT}`,
      "content-type": "application/json"
    };
  }

  return {
    "pinata_api_key": process.env.PINATA_API_KEY,
    "pinata_secret_api_key": process.env.PINATA_API_SECRET,
    "content-type": "application/json"
  };
}

async function pinJsonToIpfs(content, name) {
  if (!pinataConfigured()) return null;

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: pinataHeaders(),
    body: JSON.stringify({
      pinataMetadata: { name },
      pinataContent: content
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.details || data.error || data.message || "Pinata upload failed");

  return {
    cid: data.IpfsHash,
    uri: `ipfs://${data.IpfsHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    size: data.PinSize,
    timestamp: data.Timestamp
  };
}

module.exports = {
  pinataConfigured,
  pinJsonToIpfs
};
