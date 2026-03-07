import type { AgentConfig, AgentManifest, Capability, Snapshot } from "./types";

export class CapabilityRegistry {
  private capabilities = new Map<string, Capability>();

  register(cap: Capability): void {
    this.capabilities.set(cap.id, cap);
  }

  get(id: string): Capability | undefined {
    return this.capabilities.get(id);
  }

  list(): Capability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Filter capabilities by:
   * 1. manifest.allowedCapabilities (whitelist)
   * 2. Current on-chain permission/authorization state (snapshot)
   */
  listExecutable(manifest: AgentManifest, snapshot: Snapshot, config: AgentConfig): Capability[] {
    return manifest.allowedCapabilities
      .map((id) => this.capabilities.get(id))
      .filter((cap): cap is Capability => cap !== undefined)
      .filter((cap) => {
        // 1. Check vault permission
        const requiredPerms = cap.requiredPermissions(config, manifest);
        const hasVaultPerm = requiredPerms.every((perm) =>
          this.isPermissionActive(perm.target, perm.selectors, snapshot)
        );
        if (!hasVaultPerm) return false;

        // 2. Check protocol-level authorization
        if (cap.id.startsWith("morpho.")) {
          return snapshot.morpho.isAuthorized;
        }
        if (cap.id === "liquity.adjustInterestRate") {
          return snapshot.liquity.isInterestDelegate;
        }
        if (cap.id === "liquity.addCollateral") {
          return snapshot.liquity.isAddManager;
        }

        return true;
      });
  }

  private isPermissionActive(
    target: string,
    selectors: string[],
    snapshot: Snapshot
  ): boolean {
    return snapshot.vault.permissions.some(
      (p) =>
        p.active &&
        p.targets.some((t) => t.toLowerCase() === target.toLowerCase()) &&
        selectors.every((sel) =>
          p.selectors.some((ps) => ps.toLowerCase() === sel.toLowerCase())
        )
    );
  }
}
