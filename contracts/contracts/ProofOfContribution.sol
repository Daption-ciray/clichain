// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProofOfContribution {
  enum ContributionStatus {
    Pending,
    Approved
  }

  struct Project {
    string name;
    address owner;
    address supervisor;
    uint32 memberCount;
    uint32 taskCount;
    bool exists;
  }

  struct Task {
    uint256 projectId;
    string title;
    string category;
    uint32 weight;
    bool exists;
  }

  struct Contribution {
    uint256 projectId;
    uint256 taskId;
    address contributor;
    string evidenceUri;
    bytes32 evidenceHash;
    address approver;
    ContributionStatus status;
    uint64 submittedAt;
    uint64 approvedAt;
    uint256 badgeTokenId;
  }

  struct Badge {
    uint256 contributionId;
    uint256 projectId;
    uint256 taskId;
    bytes32 evidenceHash;
    string metadataUri;
    uint64 mintedAt;
  }

  string public constant name = "Proof of Contribution Badge";
  string public constant symbol = "POCB";

  uint256 public nextProjectId = 1;
  uint256 public nextTaskId = 1;
  uint256 public nextContributionId = 1;
  uint256 public nextTokenId = 1;

  mapping(uint256 => Project) public projects;
  mapping(uint256 => Task) public tasks;
  mapping(uint256 => Contribution) public contributions;
  mapping(uint256 => Badge) public badges;
  mapping(uint256 => mapping(address => bool)) public projectMembers;
  mapping(bytes32 => bool) public evidenceUsed;
  mapping(uint256 => mapping(address => uint256)) private approvedWeight;
  mapping(uint256 => mapping(address => uint256)) private approvedCount;
  mapping(uint256 => mapping(address => mapping(bytes32 => uint256))) private categoryWeights;
  mapping(uint256 => address) private badgeOwners;
  mapping(address => uint256) private badgeBalances;
  mapping(uint256 => string) private badgeUris;

  event ProjectCreated(uint256 indexed projectId, address indexed owner, address indexed supervisor, string name);
  event MemberAdded(uint256 indexed projectId, address indexed member);
  event TaskCreated(uint256 indexed projectId, uint256 indexed taskId, string title, string category, uint32 weight);
  event ContributionSubmitted(
    uint256 indexed contributionId,
    uint256 indexed projectId,
    uint256 indexed taskId,
    address contributor,
    bytes32 evidenceHash,
    string evidenceUri
  );
  event ContributionApproved(
    uint256 indexed contributionId,
    uint256 indexed projectId,
    address indexed approver,
    uint256 badgeTokenId
  );
  event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
  event Locked(uint256 indexed tokenId);
  event BadgeMinted(
    uint256 indexed tokenId,
    address indexed recipient,
    uint256 indexed contributionId,
    uint256 projectId,
    uint256 taskId,
    bytes32 evidenceHash,
    string metadataUri
  );

  error ProjectNotFound();
  error TaskNotFound();
  error ContributionNotFound();
  error Unauthorized();
  error NotMember();
  error DuplicateEvidence();
  error InvalidInput();
  error AlreadyApproved();
  error Soulbound();
  error TokenNotFound();

  modifier projectExists(uint256 projectId) {
    if (!projects[projectId].exists) revert ProjectNotFound();
    _;
  }

  modifier onlyProjectAuthority(uint256 projectId) {
    Project storage project = projects[projectId];
    if (!project.exists) revert ProjectNotFound();
    if (msg.sender != project.owner && msg.sender != project.supervisor) revert Unauthorized();
    _;
  }

  function createProject(string calldata projectName, address supervisor) external returns (uint256 projectId) {
    if (bytes(projectName).length == 0 || supervisor == address(0)) revert InvalidInput();

    projectId = nextProjectId++;
    projects[projectId] = Project({
      name: projectName,
      owner: msg.sender,
      supervisor: supervisor,
      memberCount: 1,
      taskCount: 0,
      exists: true
    });
    projectMembers[projectId][msg.sender] = true;

    emit ProjectCreated(projectId, msg.sender, supervisor, projectName);
    emit MemberAdded(projectId, msg.sender);
  }

  function addMember(uint256 projectId, address member) external onlyProjectAuthority(projectId) {
    if (member == address(0)) revert InvalidInput();
    if (!projectMembers[projectId][member]) {
      projectMembers[projectId][member] = true;
      projects[projectId].memberCount += 1;
      emit MemberAdded(projectId, member);
    }
  }

  function createTask(
    uint256 projectId,
    string calldata title,
    string calldata category,
    uint32 weight
  ) external onlyProjectAuthority(projectId) returns (uint256 taskId) {
    if (bytes(title).length == 0 || bytes(category).length == 0 || weight == 0) revert InvalidInput();

    taskId = nextTaskId++;
    tasks[taskId] = Task({
      projectId: projectId,
      title: title,
      category: category,
      weight: weight,
      exists: true
    });
    projects[projectId].taskCount += 1;

    emit TaskCreated(projectId, taskId, title, category, weight);
  }

  function submitContribution(
    uint256 projectId,
    uint256 taskId,
    string calldata evidenceUri
  ) external projectExists(projectId) returns (uint256 contributionId) {
    Task storage task = tasks[taskId];
    if (!task.exists || task.projectId != projectId) revert TaskNotFound();
    if (!projectMembers[projectId][msg.sender]) revert NotMember();
    if (bytes(evidenceUri).length == 0) revert InvalidInput();

    bytes32 evidenceHash = keccak256(bytes(evidenceUri));
    if (evidenceUsed[evidenceHash]) revert DuplicateEvidence();
    evidenceUsed[evidenceHash] = true;

    contributionId = nextContributionId++;
    contributions[contributionId] = Contribution({
      projectId: projectId,
      taskId: taskId,
      contributor: msg.sender,
      evidenceUri: evidenceUri,
      evidenceHash: evidenceHash,
      approver: address(0),
      status: ContributionStatus.Pending,
      submittedAt: uint64(block.timestamp),
      approvedAt: 0,
      badgeTokenId: 0
    });

    emit ContributionSubmitted(contributionId, projectId, taskId, msg.sender, evidenceHash, evidenceUri);
  }

  function approveContribution(
    uint256 contributionId,
    string calldata badgeUri
  ) external returns (uint256 tokenId) {
    Contribution storage contribution = contributions[contributionId];
    if (contribution.submittedAt == 0) revert ContributionNotFound();
    if (contribution.status != ContributionStatus.Pending) revert AlreadyApproved();

    Project storage project = projects[contribution.projectId];
    if (msg.sender != project.owner && msg.sender != project.supervisor) revert Unauthorized();

    Task storage task = tasks[contribution.taskId];
    contribution.status = ContributionStatus.Approved;
    contribution.approver = msg.sender;
    contribution.approvedAt = uint64(block.timestamp);

    approvedWeight[contribution.projectId][contribution.contributor] += task.weight;
    approvedCount[contribution.projectId][contribution.contributor] += 1;
    categoryWeights[contribution.projectId][contribution.contributor][keccak256(bytes(task.category))] += task.weight;

    tokenId = _mintBadge(contribution.contributor, contributionId, badgeUri);
    contribution.badgeTokenId = tokenId;

    emit ContributionApproved(contributionId, contribution.projectId, msg.sender, tokenId);
  }

  function viewContributionProfile(
    uint256 projectId,
    address user
  ) external view returns (uint256 totalWeight, uint256 approvedContributions, uint256 badgeCount) {
    return (approvedWeight[projectId][user], approvedCount[projectId][user], badgeBalances[user]);
  }

  function categoryWeightOf(
    uint256 projectId,
    address user,
    string calldata category
  ) external view returns (uint256) {
    return categoryWeights[projectId][user][keccak256(bytes(category))];
  }

  function ownerOf(uint256 tokenId) public view returns (address) {
    address owner = badgeOwners[tokenId];
    if (owner == address(0)) revert TokenNotFound();
    return owner;
  }

  function balanceOf(address owner) external view returns (uint256) {
    if (owner == address(0)) revert InvalidInput();
    return badgeBalances[owner];
  }

  function tokenURI(uint256 tokenId) external view returns (string memory) {
    ownerOf(tokenId);
    return badgeUris[tokenId];
  }

  function locked(uint256 tokenId) external view returns (bool) {
    ownerOf(tokenId);
    return true;
  }

  function approve(address, uint256) external pure {
    revert Soulbound();
  }

  function setApprovalForAll(address, bool) external pure {
    revert Soulbound();
  }

  function transferFrom(address, address, uint256) external pure {
    revert Soulbound();
  }

  function safeTransferFrom(address, address, uint256) external pure {
    revert Soulbound();
  }

  function safeTransferFrom(address, address, uint256, bytes calldata) external pure {
    revert Soulbound();
  }

  function _mintBadge(address recipient, uint256 contributionId, string calldata metadataUri) private returns (uint256 tokenId) {
    Contribution storage contribution = contributions[contributionId];

    tokenId = nextTokenId++;
    badgeOwners[tokenId] = recipient;
    badgeBalances[recipient] += 1;
    badgeUris[tokenId] = metadataUri;
    badges[tokenId] = Badge({
      contributionId: contributionId,
      projectId: contribution.projectId,
      taskId: contribution.taskId,
      evidenceHash: contribution.evidenceHash,
      metadataUri: metadataUri,
      mintedAt: uint64(block.timestamp)
    });

    emit Transfer(address(0), recipient, tokenId);
    emit Locked(tokenId);
    emit BadgeMinted(
      tokenId,
      recipient,
      contributionId,
      contribution.projectId,
      contribution.taskId,
      contribution.evidenceHash,
      metadataUri
    );
  }
}
