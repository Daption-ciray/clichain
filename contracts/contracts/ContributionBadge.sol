// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ContributionBadge {
    struct Badge {
        uint256 reportId;
        uint256 repoId;
        bytes32 reportHash;
        string reportUri;
        string metadataUri;
        uint64 mintedAt;
    }

    string public name;
    string public symbol;
    address public registry;
    uint256 public nextTokenId = 1;

    mapping(uint256 => address) private owners;
    mapping(address => uint256) private balances;
    mapping(uint256 => Badge) public badges;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Locked(uint256 indexed tokenId);
    event BadgeMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        uint256 indexed reportId,
        uint256 repoId,
        bytes32 reportHash,
        string reportUri,
        string metadataUri
    );

    error NotRegistry();
    error InvalidRecipient();
    error TokenNotFound();
    error NonTransferable();

    constructor(address registry_, string memory name_, string memory symbol_) {
        if (registry_ == address(0)) revert NotRegistry();
        registry = registry_;
        name = name_;
        symbol = symbol_;
    }

    modifier onlyRegistry() {
        if (msg.sender != registry) revert NotRegistry();
        _;
    }

    function mint(
        address recipient,
        uint256 reportId,
        uint256 repoId,
        bytes32 reportHash,
        string calldata reportUri,
        string calldata metadataUri
    ) external onlyRegistry returns (uint256 tokenId) {
        if (recipient == address(0)) revert InvalidRecipient();

        tokenId = nextTokenId++;
        owners[tokenId] = recipient;
        balances[recipient] += 1;
        badges[tokenId] = Badge({
            reportId: reportId,
            repoId: repoId,
            reportHash: reportHash,
            reportUri: reportUri,
            metadataUri: metadataUri,
            mintedAt: uint64(block.timestamp)
        });

        emit Transfer(address(0), recipient, tokenId);
        emit Locked(tokenId);
        emit BadgeMinted(tokenId, recipient, reportId, repoId, reportHash, reportUri, metadataUri);
    }

    function balanceOf(address owner) external view returns (uint256) {
        if (owner == address(0)) revert InvalidRecipient();
        return balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = owners[tokenId];
        if (owner == address(0)) revert TokenNotFound();
        return owner;
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        ownerOf(tokenId);
        string memory metadataUri = badges[tokenId].metadataUri;
        if (bytes(metadataUri).length == 0) return badges[tokenId].reportUri;
        return metadataUri;
    }

    function locked(uint256 tokenId) external view returns (bool) {
        ownerOf(tokenId);
        return true;
    }

    function approve(address, uint256) external pure {
        revert NonTransferable();
    }

    function setApprovalForAll(address, bool) external pure {
        revert NonTransferable();
    }

    function transferFrom(address, address, uint256) external pure {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256) external pure {
        revert NonTransferable();
    }

    function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
        revert NonTransferable();
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC165
            interfaceId == 0x80ac58cd || // ERC721
            interfaceId == 0xb45a3c0e; // ERC5192
    }
}
