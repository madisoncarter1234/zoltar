// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Extract} from "../src/Extract.sol";

contract DeployExtract is Script {
    function run() public {
        // Agent address - this should be the address that will call startGame
        // For now, use deployer as agent (can be updated later)
        address agent = vm.envOr("AGENT_ADDRESS", msg.sender);

        vm.startBroadcast();

        Extract game = new Extract(agent);

        console.log("Extract deployed to:", address(game));
        console.log("Agent address:", agent);

        vm.stopBroadcast();
    }
}
