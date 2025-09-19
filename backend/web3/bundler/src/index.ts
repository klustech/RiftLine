import "dotenv/config";
import cors from "cors";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import pino from "pino";
import pinoHttp from "pino-http";
import { ethers } from "ethers";

interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string | null;
  method: string;
  params?: any[];
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcRequest["id"];
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

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
  paymasterAndData: string;
  signature: string;
}

type PackedUserOperationTuple = [
  string,
  bigint,
  string,
  string,
  string,
  bigint,
  string,
  string,
  string
];

interface OperationStatus {
  receivedAt: number;
  state: "pending" | "submitted" | "included" | "failed";
  txHash?: string;
  error?: string;
}

const ENTRY_POINT_ABI = [
  "function handleOps((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes)[] ops, address payable beneficiary) external",
  "function getUserOpHash((address,uint256,bytes,bytes,bytes32,uint256,bytes32,bytes,bytes) userOp) view returns (bytes32)",
];

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.BUNDLER_PRIVATE_KEY;
const entryPointAddress = process.env.ENTRYPOINT_ADDRESS;
const port = Number(process.env.PORT ?? 4337);

if (!rpcUrl || !privateKey || !entryPointAddress) {
  logger.error("Missing bundler environment configuration.");
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const bundlerWallet = new ethers.Wallet(privateKey, provider);
const beneficiary = process.env.BENEFICIARY ?? bundlerWallet.address;
const entryPoint = new ethers.Contract(entryPointAddress, ENTRY_POINT_ABI, bundlerWallet);

const operations = new Map<string, OperationStatus>();

function makeError(id: JsonRpcRequest["id"], message: string, code = -32000, data?: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function makeResult(id: JsonRpcRequest["id"], result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function normalizeUserOperation(op: UserOperationRequest): PackedUserOperationTuple {
  const callGas = ethers.toBigInt(op.callGasLimit);
  const verificationGas = ethers.toBigInt(op.verificationGasLimit);
  const preVerificationGas = ethers.toBigInt(op.preVerificationGas);
  const maxFeePerGas = ethers.toBigInt(op.maxFeePerGas);
  const maxPriorityFeePerGas = ethers.toBigInt(op.maxPriorityFeePerGas);
  const nonce = ethers.toBigInt(op.nonce);

  const accountGasLimits = ethers.zeroPadValue(
    ethers.toBeHex((verificationGas << 128n) | (callGas & ((1n << 128n) - 1n))),
    32
  );
  const gasFees = ethers.zeroPadValue(
    ethers.toBeHex((maxPriorityFeePerGas << 128n) | (maxFeePerGas & ((1n << 128n) - 1n))),
    32
  );

  const initCode = op.initCode ?? "0x";
  const callData = op.callData ?? "0x";
  const paymasterAndData = op.paymasterAndData ?? "0x";
  const signature = op.signature ?? "0x";

  return [
    ethers.getAddress(op.sender),
    nonce,
    initCode,
    callData,
    accountGasLimits,
    preVerificationGas,
    gasFees,
    paymasterAndData,
    signature,
  ];
}

async function handleSendUserOperation(id: JsonRpcRequest["id"], params: any[] | undefined): Promise<JsonRpcResponse> {
  if (!params || params.length < 1) {
    return makeError(id, "Missing user operation parameters");
  }
  const op = params[0] as UserOperationRequest;
  const packed = normalizeUserOperation(op);
  const userOpHash: string = await entryPoint.getUserOpHash(packed);
  operations.set(userOpHash, { receivedAt: Date.now(), state: "pending" });

  (async () => {
    try {
      const tx = await entryPoint.handleOps([packed], beneficiary);
      operations.set(userOpHash, { receivedAt: Date.now(), state: "submitted", txHash: tx.hash });
      const receipt = await tx.wait();
      const status: OperationStatus = { receivedAt: Date.now(), state: "included", txHash: tx.hash };
      if (!receipt?.status) {
        status.state = "failed";
        status.error = "Transaction reverted";
      }
      operations.set(userOpHash, status);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      operations.set(userOpHash, {
        receivedAt: Date.now(),
        state: "failed",
        error: errorMessage,
      });
      logger.error({ err }, "Failed to submit user operation");
    }
  })().catch((err) => logger.error({ err }, "Bundler task failed"));

  return makeResult(id, userOpHash);
}

async function handleEstimateGas(id: JsonRpcRequest["id"], params: any[] | undefined): Promise<JsonRpcResponse> {
  try {
    const result = await provider.send("eth_estimateUserOperationGas", params ?? []);
    return makeResult(id, result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return makeError(id, message);
  }
}

async function handleGetStatus(id: JsonRpcRequest["id"], params: any[] | undefined): Promise<JsonRpcResponse> {
  if (!params || params.length < 1) {
    return makeError(id, "Missing userOpHash");
  }
  const hash = params[0] as string;
  const status = operations.get(hash);
  return makeResult(id, status ?? null);
}

async function handleChainId(id: JsonRpcRequest["id"]): Promise<JsonRpcResponse> {
  const network = await provider.getNetwork();
  return makeResult(id, ethers.toQuantity(network.chainId));
}

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));
app.use(pinoHttp({ logger }));

app.post("/rpc", async (req: Request, res: Response) => {
  const request = req.body as JsonRpcRequest;
  try {
    switch (request.method) {
      case "eth_sendUserOperation": {
        const response = await handleSendUserOperation(request.id, request.params);
        res.json(response);
        break;
      }
      case "eth_estimateUserOperationGas": {
        const response = await handleEstimateGas(request.id, request.params);
        res.json(response);
        break;
      }
      case "eth_supportedEntryPoints": {
        res.json(makeResult(request.id, [entryPointAddress]));
        break;
      }
      case "aa_getUserOperationStatus": {
        const response = await handleGetStatus(request.id, request.params);
        res.json(response);
        break;
      }
      case "eth_chainId": {
        const response = await handleChainId(request.id);
        res.json(response);
        break;
      }
      default: {
        res.json(makeError(request.id, `Unsupported method ${request.method}`, -32601));
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.json(makeError(request.id, message));
  }
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", entryPoint: entryPointAddress, beneficiary });
});

app.listen(port, () => {
  logger.info({ port, entryPoint: entryPointAddress, beneficiary }, "Bundler server ready");
});
