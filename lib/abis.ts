/**
 * Contract ABIs for TrendForge / Kuest
 *
 * Minimal ABI slices - only the functions we call.
 * Full ABIs: https://github.com/gnosis/conditional-tokens-contracts
 *            https://github.com/Polymarket/ctf-exchange
 */

// ---- ERC-20 (USDC) ----------------------------------------------------------

export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner",   type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "Transfer",
    type: "event",
    inputs: [
      { name: "from",  type: "address", indexed: true },
      { name: "to",    type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
] as const;

// ---- Conditional Tokens Framework (CTF) -------------------------------------

export const CTF_ABI = [
  /**
   * prepareCondition - creates a new binary market condition.
   *
   * @param oracle       - UMA Oracle address (or your custom oracle)
   * @param questionId   - bytes32 unique identifier, typically keccak256(question + salt)
   * @param outcomeSlots - 2 for YES/NO binary markets
   *
   * Emits: ConditionPreparation(conditionId, oracle, questionId, outcomeSlotCount)
   * The conditionId is keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount))
   */
  {
    name: "prepareCondition",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "oracle",       type: "address" },
      { name: "questionId",   type: "bytes32" },
      { name: "outcomeSlots", type: "uint256" },
    ],
    outputs: [],
  },
  /**
   * splitPosition - buy outcome tokens by depositing USDC.
   * Creates 1 YES token + 1 NO token per 1 USDC deposited.
   *
   * collateralToken   - USDC address
   * parentCollectionId - bytes32(0) for top-level markets
   * conditionId       - from prepareCondition
   * partition         - [1,2] for YES/NO split
   * amount            - USDC amount in 6-decimal units
   */
  {
    name: "splitPosition",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "collateralToken",     type: "address" },
      { name: "parentCollectionId",  type: "bytes32" },
      { name: "conditionId",         type: "bytes32" },
      { name: "partition",           type: "uint256[]" },
      { name: "amount",              type: "uint256" },
    ],
    outputs: [],
  },
  /**
   * mergePositions - sell outcome tokens back for USDC.
   * Burns 1 YES + 1 NO token to receive 1 USDC.
   */
  {
    name: "mergePositions",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "collateralToken",    type: "address" },
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId",        type: "bytes32" },
      { name: "partition",          type: "uint256[]" },
      { name: "amount",             type: "uint256" },
    ],
    outputs: [],
  },
  /**
   * redeemPositions - after resolution, redeem winning tokens for USDC.
   * Call this when the market has resolved (oracle reported payouts).
   *
   * indexSets - [1] for YES winners, [2] for NO winners
   *
   * TODO: integrate UMA resolution flow:
   *   1. Anyone calls UMA assertTruth() with the resolution claim
   *   2. After challenge period, UMA calls CTF.reportPayouts()
   *   3. Users call redeemPositions() to collect winnings
   */
  {
    name: "redeemPositions",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "collateralToken",    type: "address" },
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId",        type: "bytes32" },
      { name: "indexSets",          type: "uint256[]" },
    ],
    outputs: [],
  },
  /**
   * balanceOf - ERC-1155, check how many YES/NO tokens a user holds.
   *
   * tokenId = keccak256(collectionId | conditionId | indexSet)
   * YES tokenId: compute with getPositionId(USDC, bytes32(0), conditionId, 1)
   * NO  tokenId: compute with getPositionId(USDC, bytes32(0), conditionId, 2)
   */
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id",      type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOfBatch",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "accounts", type: "address[]" },
      { name: "ids",      type: "uint256[]" },
    ],
    outputs: [{ type: "uint256[]" }],
  },
  {
    name: "getConditionId",
    type: "function",
    stateMutability: "pure",
    inputs: [
      { name: "oracle",       type: "address" },
      { name: "questionId",   type: "bytes32" },
      { name: "outcomeSlots", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    name: "getCollectionId",
    type: "function",
    stateMutability: "pure",
    inputs: [
      { name: "parentCollectionId", type: "bytes32" },
      { name: "conditionId",        type: "bytes32" },
      { name: "indexSet",           type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    name: "getPositionId",
    type: "function",
    stateMutability: "pure",
    inputs: [
      { name: "collateralToken", type: "address" },
      { name: "collectionId",    type: "bytes32" },
    ],
    outputs: [{ type: "uint256" }],
  },
  // ERC-1155 approval — required before the Exchange can transfer outcome tokens on SELL orders
  {
    name: "isApprovedForAll",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "account",  type: "address" },
      { name: "operator", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "setApprovalForAll",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "approved", type: "bool" },
    ],
    outputs: [],
  },
  // Events
  {
    name: "ConditionPreparation",
    type: "event",
    inputs: [
      { name: "conditionId",      type: "bytes32", indexed: true },
      { name: "oracle",           type: "address", indexed: true },
      { name: "questionId",       type: "bytes32", indexed: true },
      { name: "outcomeSlotCount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "PositionSplit",
    type: "event",
    inputs: [
      { name: "stakeholder",       type: "address", indexed: true },
      { name: "collateralToken",   type: "address", indexed: false },
      { name: "parentCollectionId",type: "bytes32", indexed: true },
      { name: "conditionId",       type: "bytes32", indexed: true },
      { name: "partition",         type: "uint256[]", indexed: false },
      { name: "amount",            type: "uint256", indexed: false },
    ],
  },
] as const;

// ---- CTF Exchange (CLOB) ----------------------------------------------------

/**
 * CTF Exchange handles signed CLOB orders for outcome tokens.
 *
 * Order signing uses EIP-712 - see lib/clob.ts for the full signing flow.
 *
 * Fee collection:
 *   TODO: Set feeRecipient to your own address in the exchange config.
 *   As a Kuest white-label, you collect 100% of trading fees.
 *   Fee is set per-order in the makerFeeRateBps field (basis points).
 *   Typical: 200 bps = 2% fee on each trade.
 */
export const CTF_EXCHANGE_ABI = [
  {
    name: "fillOrder",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "order",
        type: "tuple",
        components: [
          { name: "salt",          type: "uint256" },
          { name: "maker",         type: "address" },
          { name: "signer",        type: "address" },
          { name: "taker",         type: "address" },
          { name: "tokenId",       type: "uint256" },
          { name: "makerAmount",   type: "uint256" },
          { name: "takerAmount",   type: "uint256" },
          { name: "expiration",    type: "uint256" },
          { name: "nonce",         type: "uint256" },
          { name: "feeRateBps",    type: "uint256" },
          { name: "side",          type: "uint8" },
          { name: "signatureType", type: "uint8" },
        ],
      },
      { name: "fillAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getOrderStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "orderHash", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "isFilledOrCancelled", type: "bool" },
          { name: "remaining",           type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "OrderFilled",
    type: "event",
    inputs: [
      { name: "orderHash",   type: "bytes32", indexed: true },
      { name: "maker",       type: "address", indexed: true },
      { name: "taker",       type: "address", indexed: true },
      { name: "makerAssetId",type: "uint256", indexed: false },
      { name: "takerAssetId",type: "uint256", indexed: false },
      { name: "makerAmountFilled", type: "uint256", indexed: false },
      { name: "takerAmountFilled", type: "uint256", indexed: false },
      { name: "fee",         type: "uint256", indexed: false },
    ],
  },
] as const;

// ---- Order types for EIP-712 signing ----------------------------------------

export const ORDER_TYPES = {
  Order: [
    { name: "salt",          type: "uint256" },
    { name: "maker",         type: "address" },
    { name: "signer",        type: "address" },
    { name: "taker",         type: "address" },
    { name: "tokenId",       type: "uint256" },
    { name: "makerAmount",   type: "uint256" },
    { name: "takerAmount",   type: "uint256" },
    { name: "expiration",    type: "uint256" },
    { name: "nonce",         type: "uint256" },
    { name: "feeRateBps",    type: "uint256" },
    { name: "side",          type: "uint8" },
    { name: "signatureType", type: "uint8" },
  ],
} as const;

// Side enum
export const SIDE = { BUY: 0, SELL: 1 } as const;
// Signature type: 0 = EOA (standard MetaMask), 1 = Poly Proxy, 2 = Poly Gnosis Safe
export const SIG_TYPE = { EOA: 0, POLY_PROXY: 1, POLY_GNOSIS: 2 } as const;
