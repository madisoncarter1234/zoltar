// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ExtractV2
/// @notice Minimal game contract - agent controls all critical functions
/// @dev Verification happens server-side, contract just handles money
contract ExtractV2 {
    // ============ Constants ============

    uint256 public constant BUY_IN = 0.001 ether;
    uint256 public constant GAME_DURATION = 10 minutes;

    // ============ State ============

    address public agent;
    uint256 public gameId;
    bytes32 public commitment;      // keccak256(secret) for auditability
    uint256 public pot;
    uint256 public gameEndTime;
    bool public gameActive;

    // Track buy-ins per game (server checks this, not tries)
    mapping(uint256 => mapping(address => uint256)) public playerBuyIns;

    // ============ Events ============

    event GameStarted(uint256 indexed gameId, bytes32 commitment, uint256 endTime);
    event PlayerBoughtIn(address indexed player, uint256 gameId, uint256 totalBuyIn);
    event WinnerDeclared(address indexed winner, uint256 gameId, uint256 payout);
    event GameEnded(uint256 indexed gameId, uint256 potRolledOver);

    // ============ Errors ============

    error OnlyAgent();
    error GameNotActive();
    error GameStillActive();
    error IncorrectBuyIn();
    error TransferFailed();
    error ZeroAddress();

    // ============ Modifiers ============

    modifier onlyAgent() {
        if (msg.sender != agent) revert OnlyAgent();
        _;
    }

    // ============ Constructor ============

    constructor() {
        agent = msg.sender;
    }

    // ============ Agent Functions ============

    /// @notice Start a new game with a secret word commitment
    /// @param _commitment keccak256(secret)
    function startGame(bytes32 _commitment) external onlyAgent {
        // Check computed active state (time-aware), not just storage flag
        bool isActive = gameActive && block.timestamp < gameEndTime;
        if (isActive) revert GameStillActive();

        gameActive = true;
        gameId++;
        commitment = _commitment;
        gameEndTime = block.timestamp + GAME_DURATION;

        emit GameStarted(gameId, _commitment, gameEndTime);
    }

    /// @notice Declare winner and pay them instantly
    /// @param winner Address to send pot to
    function declareWinner(address winner) external onlyAgent {
        if (!gameActive) revert GameNotActive();
        if (winner == address(0)) revert ZeroAddress();

        gameActive = false;
        uint256 payout = pot;
        pot = 0;

        emit WinnerDeclared(winner, gameId, payout);

        if (payout > 0) {
            (bool success, ) = payable(winner).call{value: payout}("");
            if (!success) revert TransferFailed();
        }
    }

    /// @notice End game without winner (pot rolls over)
    function endGame() external onlyAgent {
        if (!gameActive) revert GameNotActive();

        gameActive = false;
        emit GameEnded(gameId, pot);
        // pot stays for next game
    }

    /// @notice Update agent address
    function setAgent(address newAgent) external onlyAgent {
        if (newAgent == address(0)) revert ZeroAddress();
        agent = newAgent;
    }

    // ============ Player Functions ============

    /// @notice Buy into the current game
    function buyIn() external payable {
        if (!gameActive) revert GameNotActive();
        if (msg.value != BUY_IN) revert IncorrectBuyIn();

        pot += msg.value;
        playerBuyIns[gameId][msg.sender] += msg.value;

        emit PlayerBoughtIn(msg.sender, gameId, playerBuyIns[gameId][msg.sender]);
    }

    // ============ View Functions ============

    /// @notice Get current game info
    function getGameInfo() external view returns (
        uint256 _gameId,
        bytes32 _commitment,
        uint256 _pot,
        uint256 _endTime,
        bool _active,
        uint256 _timeRemaining
    ) {
        uint256 remaining = 0;
        bool active = gameActive && block.timestamp < gameEndTime;

        if (active) {
            remaining = gameEndTime - block.timestamp;
        }

        return (gameId, commitment, pot, gameEndTime, active, remaining);
    }

    /// @notice Check if player bought into current game
    function hasBoughtIn(address player) external view returns (bool) {
        return playerBuyIns[gameId][player] > 0;
    }

    /// @notice Get player's total buy-in for current game
    function getPlayerBuyIn(address player) external view returns (uint256) {
        return playerBuyIns[gameId][player];
    }

    // ============ Receive ============

    receive() external payable {
        pot += msg.value;
    }
}
