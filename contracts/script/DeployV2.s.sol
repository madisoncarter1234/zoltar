// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ExtractV2} from "../src/ExtractV2.sol";

contract DeployExtractV2 is Script {
    function run() public {
        vm.startBroadcast();

        // Deployer becomes agent automatically
        ExtractV2 game = new ExtractV2();

        console.log("ExtractV2 deployed to:", address(game));
        console.log("Agent (deployer):", msg.sender);

        vm.stopBroadcast();
    }
}
