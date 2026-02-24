// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.20;

import "../../src/core/SnowballFactory.sol";
import "../../src/core/SnowballPoolDeployer.sol";
import "../../src/core/SnowballCommunityVault.sol";
import "../../src/core/SnowballVaultFactoryStub.sol";

/// @dev Helper to deploy concrete contracts without importing them in the test file
///      (avoids ReentrancyGuard name collision between OZ and Algebra)
library DeployHelper {
    function deployPoolDeployer(address factory) internal returns (address) {
        return address(new SnowballPoolDeployer(factory));
    }

    function deployFactory(address poolDeployer) internal returns (address) {
        return address(new SnowballFactory(poolDeployer));
    }

    function deployCommunityVault(address factory, address admin) internal returns (address) {
        return address(new SnowballCommunityVault(factory, admin));
    }

    function deployVaultFactoryStub(address vault) internal returns (address) {
        return address(new SnowballVaultFactoryStub(vault));
    }
}
