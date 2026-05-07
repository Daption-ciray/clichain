import { ethers } from "ethers";
import { canonicalJSONString } from "./report";

export function computeReportHash(report: unknown): string {
  const canonical = canonicalJSONString(report);
  return ethers.keccak256(ethers.toUtf8Bytes(canonical));
}
