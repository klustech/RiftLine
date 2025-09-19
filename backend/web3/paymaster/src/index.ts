import "dotenv/config";
import cors from "cors";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import pino from "pino";
import pinoHttp from "pino-http";
import { AbiCoder, BytesLike, ethers } from "ethers";

interface UserOperationRequest {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  signature?: string;
}

interface SponsorRequest {
  userOp: UserOperationRequest;
  sessionKey: string;
  scope: string;
  validUntil?: number;
  validAfter?: number;
  paymasterVerificationGasLimit?: string;
  postOpGasLimit?: string;
}

const PAYMASTER_ABI = [
  "function getSponsorDigest((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes) userOp, address sessionKey, bytes32 scope, uint48 validUntil, uint48 validAfter) view returns (bytes32)",
];

const REGISTRY_ABI = [
  "function isSessionValid(address account, address key, bytes32 scope) view returns (bool)"
];

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const rpcUrl = process.env.RPC_URL;
const paymasterAddress = process.env.PAYMASTER_ADDRESS;
const signerKey = process.env.PAYMASTER_SIGNER_KEY;
const registryAddress = process.env.SESSION_REGISTRY_ADDRESS;
const port = Number(process.env.PORT ?? 8080);

if (!rpcUrl || !paymasterAddress || !signerKey) {
  logger.error("Missing paymaster environment configuration");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const signer = new ethers.Wallet(signerKey, provider);
const paymaster = new ethers.Contract(paymasterAddress, PAYMASTER_ABI, provider);
const registry = registryAddress ? new ethers.Contract(registryAddress, REGISTRY_ABI, provider) : null;

function packGasField(high: bigint, low: bigint): string {
  return ethers.zeroPadValue(ethers.toBeHex((high << 128n) | (low & ((1n << 128n) - 1n))), 32);
}

function normalizePackedUserOp(
  paymasterData: string,
  userOp: UserOperationRequest
): [string, bigint, string, string, string, bigint, string, string, string] {
  const callGas = ethers.toBigInt(userOp.callGasLimit);
  const verificationGas = ethers.toBigInt(userOp.verificationGasLimit);
  const preVerificationGas = ethers.toBigInt(userOp.preVerificationGas);
  const maxFeePerGas = ethers.toBigInt(userOp.maxFeePerGas);
  const maxPriorityFeePerGas = ethers.toBigInt(userOp.maxPriorityFeePerGas);
  const nonce = ethers.toBigInt(userOp.nonce);

  const accountGasLimits = packGasField(verificationGas, callGas);
  const gasFees = packGasField(maxPriorityFeePerGas, maxFeePerGas);

  return [
    ethers.getAddress(userOp.sender),
    nonce,
    userOp.initCode ?? "0x",
    userOp.callData ?? "0x",
    accountGasLimits,
    preVerificationGas,
    gasFees,
    paymasterData,
    userOp.signature ?? "0x",
  ];
}

function buildPaymasterHeader(paymasterAddr: string, verificationGas: bigint, postOpGas: bigint): string {
  const addressBytes = ethers.getAddress(paymasterAddr);
  const validationBytes = ethers.zeroPadValue(ethers.toBeHex(verificationGas), 16);
  const postOpBytes = ethers.zeroPadValue(ethers.toBeHex(postOpGas), 16);
  return ethers.hexlify(ethers.concat([addressBytes, validationBytes, postOpBytes]));
}

function appendPaymasterSignature(
  header: BytesLike,
  validUntil: number,
  validAfter: number,
  sessionKey: string,
  scope: BytesLike,
  signature: string
): string {
  const encoder = AbiCoder.defaultAbiCoder();
  const tail = encoder.encode(
    ["uint48", "uint48", "address", "bytes32", "bytes"],
    [validUntil, validAfter, sessionKey, scope, signature]
  );
  return ethers.hexlify(ethers.concat([header, tail]));
}

async function ensureSessionValid(account: string, key: string, scope: BytesLike) {
  if (!registry) {
    return;
  }
  const valid = await registry.isSessionValid(account, key, scope);
  if (!valid) {
    throw new Error("Session key not valid for requested scope");
  }
}

function withDefaultGas(value: string | undefined, fallback: number): bigint {
  if (!value || value === "0x" || value === "0") {
    return BigInt(fallback);
  }
  return ethers.toBigInt(value);
}

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

app.post("/sponsor", async (req: Request, res: Response) => {
  const request = req.body as SponsorRequest;
  try {
    if (!request?.userOp || !request.sessionKey || !request.scope) {
      throw new Error("Missing required sponsorship parameters");
    }
    const sessionKey = ethers.getAddress(request.sessionKey);
    const scopeBytes = ethers.zeroPadValue(ethers.hexlify(request.scope), 32);
    const validUntil = request.validUntil ?? Math.floor(Date.now() / 1000) + 3600;
    const validAfter = request.validAfter ?? 0;
    const verificationGas = withDefaultGas(request.paymasterVerificationGasLimit, 150000);
    const postOpGas = withDefaultGas(request.postOpGasLimit, 60000);

    const header = buildPaymasterHeader(paymasterAddress, verificationGas, postOpGas);
    const packedOp = normalizePackedUserOp(header, request.userOp);

    await ensureSessionValid(request.userOp.sender, sessionKey, scopeBytes);

    const digest: string = await paymaster.getSponsorDigest(packedOp, sessionKey, scopeBytes, validUntil, validAfter);
    const signature = await signer.signMessage(ethers.getBytes(digest));
    const paymasterAndData = appendPaymasterSignature(header, validUntil, validAfter, sessionKey, scopeBytes, signature);

    res.json({
      paymasterAndData,
      validUntil,
      validAfter,
      sessionKey,
      scope: scopeBytes,
      digest,
      signature,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

app.get("/health", async (_req: Request, res: Response) => {
  try {
    const network = await provider.getNetwork();
    res.json({ status: "ok", chainId: network.chainId.toString(), paymaster: paymasterAddress });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ status: "error", message });
  }
});

app.listen(port, () => {
  logger.info({ port, paymaster: paymasterAddress }, "Paymaster sponsor service ready");
});
