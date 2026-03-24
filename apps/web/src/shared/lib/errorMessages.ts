const ERROR_MAP: Record<string, { title: string; description: string; action?: string }> = {
  "execution reverted": {
    title: "트랜잭션이 실패했습니다",
    description: "컨트랙트가 거부했습니다. 잔고 부족이거나 조건이 맞지 않을 수 있습니다.",
    action: "잔고를 확인하고 다시 시도하세요.",
  },
  "insufficient funds": {
    title: "잔고가 부족합니다",
    description: "트랜잭션에 필요한 가스비 또는 토큰이 부족합니다.",
    action: "Faucet에서 토큰을 받거나 자산을 추가하세요.",
  },
  "user rejected": {
    title: "사용자가 거부했습니다",
    description: "지갑에서 트랜잭션 서명을 거부했습니다.",
    action: "다시 시도하고 지갑에서 승인하세요.",
  },
  "nonce too low": {
    title: "Nonce 충돌",
    description: "이전 트랜잭션이 아직 처리 중입니다.",
    action: "잠시 후 다시 시도하세요.",
  },
  "gas required exceeds": {
    title: "가스 한도 초과",
    description: "트랜잭션이 너무 복잡하거나 조건이 맞지 않습니다.",
    action: "금액을 줄이거나 조건을 확인하세요.",
  },
  "transfer amount exceeds balance": {
    title: "전송 금액 초과",
    description: "보유 잔고보다 많은 금액을 전송하려고 합니다.",
    action: "금액을 줄이세요.",
  },
  "ERC20: insufficient allowance": {
    title: "승인(Approve)이 필요합니다",
    description: "토큰 사용 승인이 되지 않았습니다.",
    action: "먼저 Approve 트랜잭션을 실행하세요.",
  },
  "BorrowerOperations": {
    title: "CDP 오류",
    description: "Trove 작업이 실패했습니다. 담보 비율이나 최소 부채를 확인하세요.",
    action: "담보를 추가하거나 부채를 조정하세요.",
  },
  "UpfrontFeeTooHigh": {
    title: "선불 수수료 초과",
    description: "예상 수수료가 설정한 한도를 초과했습니다.",
    action: "이자율을 낮추거나 금액을 줄이세요.",
  },
  "slippage": {
    title: "슬리피지 초과",
    description: "가격이 변동하여 설정한 슬리피지 범위를 초과했습니다.",
    action: "슬리피지 허용치를 높이거나 다시 시도하세요.",
  },
};

export function translateError(error: string | Error): { title: string; description: string; action?: string } {
  const msg = typeof error === "string" ? error : error.message || "";
  const lower = msg.toLowerCase();

  for (const [key, value] of Object.entries(ERROR_MAP)) {
    if (lower.includes(key.toLowerCase())) {
      return value;
    }
  }

  return {
    title: "트랜잭션 실패",
    description: msg.slice(0, 200),
    action: "다시 시도하세요. 문제가 지속되면 새로고침 후 시도하세요.",
  };
}
