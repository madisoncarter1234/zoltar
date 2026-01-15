// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {Extract} from "../src/Extract.sol";

contract ExtractTest is Test {
    Extract public game;
    address public agent = address(1);
    address public player1 = address(2);
    address public player2 = address(3);

    string constant SECRET = "elephant";
    bytes32 constant COMMITMENT = keccak256(abi.encodePacked("elephant"));

    function setUp() public {
        game = new Extract(agent);
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
    }

    // ============ Start Game Tests ============

    function test_StartGame() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        (bytes32 commitment, , , , bool active, ) = game.getGameInfo();
        assertEq(commitment, COMMITMENT);
        assertTrue(active);
    }

    function test_StartGame_OnlyAgent() public {
        vm.prank(player1);
        vm.expectRevert(Extract.OnlyAgent.selector);
        game.startGame(COMMITMENT);
    }

    function test_StartGame_CantStartWhileActive() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(agent);
        vm.expectRevert(Extract.GameStillActive.selector);
        game.startGame(COMMITMENT);
    }

    // ============ Buy In Tests ============

    function test_BuyIn() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        assertEq(game.getPlayerTries(player1), 10);
        (, uint256 pot, , , , ) = game.getGameInfo();
        assertEq(pot, 0.001 ether);
    }

    function test_BuyIn_IncorrectAmount() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        vm.expectRevert(Extract.IncorrectBuyIn.selector);
        game.buyIn{value: 0.002 ether}();
    }

    function test_BuyIn_NoActiveGame() public {
        vm.prank(player1);
        vm.expectRevert(Extract.GameNotActive.selector);
        game.buyIn{value: 0.001 ether}();
    }

    function test_BuyIn_MultipleTimes() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.startPrank(player1);
        game.buyIn{value: 0.001 ether}();
        game.buyIn{value: 0.001 ether}();
        vm.stopPrank();

        assertEq(game.getPlayerTries(player1), 20);
    }

    // ============ Guess Tests ============

    function test_Guess_Correct() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        vm.prank(player1);
        game.guess(SECRET);

        (, , , address winner, bool active, ) = game.getGameInfo();
        assertEq(winner, player1);
        assertFalse(active);
    }

    function test_Guess_Incorrect() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        vm.prank(player1);
        game.guess("wrongword");

        (, , , address winner, bool active, ) = game.getGameInfo();
        assertEq(winner, address(0));
        assertTrue(active);
        assertEq(game.getPlayerTries(player1), 9);
    }

    function test_Guess_NoTries() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        vm.expectRevert(Extract.NoTriesRemaining.selector);
        game.guess("test");
    }

    function test_Guess_UsesAllTries() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        vm.startPrank(player1);
        for (uint8 i = 0; i < 10; i++) {
            game.guess("wrong");
        }
        vm.stopPrank();

        assertEq(game.getPlayerTries(player1), 0);

        vm.prank(player1);
        vm.expectRevert(Extract.NoTriesRemaining.selector);
        game.guess("anotherguess");
    }

    // ============ Claim Pot Tests ============

    function test_ClaimPot() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        vm.prank(player2);
        game.buyIn{value: 0.001 ether}();

        uint256 balanceBefore = player1.balance;

        vm.prank(player1);
        game.guess(SECRET);

        vm.prank(player1);
        game.claimPot();

        assertEq(player1.balance, balanceBefore + 0.002 ether);
    }

    function test_ClaimPot_NotWinner() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        vm.prank(player1);
        game.guess(SECRET);

        vm.prank(player2);
        vm.expectRevert(Extract.NotWinner.selector);
        game.claimPot();
    }

    // ============ Roll Over Tests ============

    function test_RollOver_AfterDeadline() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        // Fast forward past deadline
        vm.warp(block.timestamp + 25 hours);

        game.rollOver(bytes32(0));

        (, , , , bool active, ) = game.getGameInfo();
        assertFalse(active);
    }

    function test_RollOver_PotCarriesOver() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        vm.warp(block.timestamp + 25 hours);
        game.rollOver(bytes32(0));

        // Start new game - pot should carry over
        bytes32 newCommitment = keccak256(abi.encodePacked("newword"));
        vm.prank(agent);
        game.startGame(newCommitment);

        (, uint256 pot, , , , ) = game.getGameInfo();
        assertEq(pot, 0.001 ether);
    }

    function test_RollOver_WithNewCommitment() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        vm.warp(block.timestamp + 25 hours);

        // Agent can roll over with new commitment in one tx
        bytes32 newCommitment = keccak256(abi.encodePacked("newword"));
        vm.prank(agent);
        game.rollOver(newCommitment);

        (bytes32 commitment, uint256 pot, , , bool active, ) = game.getGameInfo();
        assertEq(commitment, newCommitment);
        assertEq(pot, 0.001 ether);
        assertTrue(active);
    }

    function test_RollOver_OnlyAgentCanProvideCommitment() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.warp(block.timestamp + 25 hours);

        bytes32 newCommitment = keccak256(abi.encodePacked("newword"));
        vm.prank(player1);
        vm.expectRevert(Extract.OnlyAgent.selector);
        game.rollOver(newCommitment);
    }

    function test_RollOver_CantRollActiveGame() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.expectRevert(Extract.GameStillActive.selector);
        game.rollOver(bytes32(0));
    }

    // ============ Tries Don't Carry Over Tests ============

    function test_TriesDontCarryOver() public {
        // Game 1
        vm.prank(agent);
        game.startGame(COMMITMENT);

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        // Use some tries
        vm.prank(player1);
        game.guess("wrong");
        assertEq(game.getPlayerTries(player1), 9);

        // End game 1, start game 2
        vm.warp(block.timestamp + 25 hours);
        bytes32 newCommitment = keccak256(abi.encodePacked("newword"));
        vm.prank(agent);
        game.rollOver(newCommitment);

        // Player should have 0 tries in new game
        assertEq(game.getPlayerTries(player1), 0);

        // Should revert if they try to guess
        vm.prank(player1);
        vm.expectRevert(Extract.NoTriesRemaining.selector);
        game.guess("test");
    }

    // ============ Case Sensitivity Test ============

    function test_Guess_CaseSensitive() public {
        // The contract expects lowercase - uppercase should fail
        vm.prank(agent);
        game.startGame(COMMITMENT); // commitment is for "elephant"

        vm.prank(player1);
        game.buyIn{value: 0.001 ether}();

        vm.prank(player1);
        game.guess("ELEPHANT"); // uppercase - should not match

        (, , , address winner, , ) = game.getGameInfo();
        assertEq(winner, address(0)); // no winner because case doesn't match
    }

    // ============ Game ID Tests ============

    function test_GameIdIncrements() public {
        vm.prank(agent);
        game.startGame(COMMITMENT);
        assertEq(game.getCurrentGameId(), 1);

        vm.warp(block.timestamp + 25 hours);

        bytes32 newCommitment = keccak256(abi.encodePacked("word2"));
        vm.prank(agent);
        game.startGame(newCommitment);
        assertEq(game.getCurrentGameId(), 2);
    }

    // ============ Agent Update Test ============

    function test_SetAgent() public {
        address newAgent = address(99);

        vm.prank(agent);
        game.setAgent(newAgent);

        // Old agent should fail
        vm.prank(agent);
        vm.expectRevert(Extract.OnlyAgent.selector);
        game.startGame(COMMITMENT);

        // New agent should work
        vm.prank(newAgent);
        game.startGame(COMMITMENT);
    }
}
