import fs from "node:fs";
import path from "node:path";

const PINATA_PIN_FILE_ENDPOINT = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export type IpfsUploadResult = {
  cid: string;
  uri: string;
  gatewayUrl: string;
  size: number;
  timestamp: string;
  isDuplicate: boolean;
};

type PinataResponse = {
  IpfsHash?: string;
  PinSize?: number;
  Timestamp?: string;
  isDuplicate?: boolean;
  error?: string;
  message?: string;
};

function getPinataJwt(): string {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    throw new Error("Missing env var PINATA_JWT. Create a Pinata API key and export its JWT.");
  }
  return jwt;
}

export async function uploadFileToIpfs(filePath: string, name?: string): Promise<IpfsUploadResult> {
  const target = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(target)) throw new Error(`File not found: ${filePath}`);

  const fileName = name?.trim() || path.basename(target);
  const content = fs.readFileSync(target, "utf8");
  const form = new FormData();
  form.append("file", new Blob([content], { type: "application/json" }), fileName);
  form.append("pinataMetadata", JSON.stringify({ name: fileName }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const response = await fetch(PINATA_PIN_FILE_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPinataJwt()}`,
    },
    body: form,
  });

  const body = (await response.json().catch(() => ({}))) as PinataResponse;
  if (!response.ok || !body.IpfsHash) {
    const detail = body.error || body.message || response.statusText;
    throw new Error(`Pinata upload failed (${response.status}): ${detail}`);
  }

  return {
    cid: body.IpfsHash,
    uri: `ipfs://${body.IpfsHash}`,
    gatewayUrl: `https://gateway.pinata.cloud/ipfs/${body.IpfsHash}`,
    size: body.PinSize ?? 0,
    timestamp: body.Timestamp ?? "",
    isDuplicate: Boolean(body.isDuplicate),
  };
}
