// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IContributionBadge {
    function mint(
        address recipient,
        uint256 reportId,
        uint256 repoId,
        bytes32 reportHash,
        string calldata reportUri,
        string calldata metadataUri
    ) external returns (uint256 tokenId);
}

contract ContributionRegistry {
    enum ReportStatus {
        Pending,
        Finalized,
        Disputed
    }

    struct Repo {
        string name;
        address owner;
        uint8 threshold;
        uint32 approverCount;
        bool exists;
    }

    struct Report {
        uint256 repoId;
        address contributor;
        bytes32 commitSha;
        bytes32 reportHash;
        string uri;
        string policyId;
        uint32 attestationCount;
        ReportStatus status;
        uint64 submittedAt;
    }

    uint256 public nextRepoId = 1;
    uint256 public nextReportId = 1;
    address public contractOwner;
    address public badgeContract;

    mapping(uint256 => Repo) public repos;
    mapping(uint256 => mapping(address => bool)) public repoApprovers;

    mapping(uint256 => Report) public reports;
    mapping(uint256 => mapping(address => bool)) public reportAttestations;
    mapping(uint256 => mapping(bytes32 => bool)) public repoReportHashes;

    event RepoCreated(
        uint256 indexed repoId,
        address indexed owner,
        uint8 threshold,
        string name
    );
    event ApproverAdded(uint256 indexed repoId, address indexed approver);
    event ApproverRemoved(uint256 indexed repoId, address indexed approver);
    event ThresholdUpdated(uint256 indexed repoId, uint8 threshold);
    event BadgeContractUpdated(address indexed badgeContract);

    event ReportSubmitted(
        uint256 indexed reportId,
        uint256 indexed repoId,
        address indexed contributor,
        bytes32 commitSha,
        bytes32 reportHash,
        string uri,
        string policyId
    );
    event ReportAttested(
        uint256 indexed reportId,
        uint256 indexed repoId,
        address indexed approver
    );
    event ReportFinalized(
        uint256 indexed reportId,
        uint256 indexed repoId,
        uint32 attestationCount
    );
    event ReportBadgeIssued(
        uint256 indexed reportId,
        uint256 indexed tokenId,
        address indexed recipient
    );
    event ReportDisputed(
        uint256 indexed reportId,
        uint256 indexed repoId,
        bytes32 reasonHash
    );

    error RepoNotFound();
    error ReportNotFound();
    error NotRepoOwner();
    error NotApprover();
    error InvalidThreshold();
    error DuplicateHash();
    error ReportNotPending();
    error AlreadyAttested();
    error ThresholdNotMet();
    error InvalidApprover();
    error NotContractOwner();
    error InvalidBadgeContract();

    constructor() {
        contractOwner = msg.sender;
    }

    modifier onlyContractOwner() {
        if (msg.sender != contractOwner) revert NotContractOwner();
        _;
    }

    modifier onlyRepoOwner(uint256 repoId) {
        Repo storage repo = repos[repoId];
        if (!repo.exists) revert RepoNotFound();
        if (repo.owner != msg.sender) revert NotRepoOwner();
        _;
    }

    modifier onlyApprover(uint256 repoId) {
        Repo storage repo = repos[repoId];
        if (!repo.exists) revert RepoNotFound();
        if (!repoApprovers[repoId][msg.sender]) revert NotApprover();
        _;
    }

    function setBadgeContract(address badgeContract_) external onlyContractOwner {
        if (badgeContract_ == address(0)) revert InvalidBadgeContract();
        badgeContract = badgeContract_;
        emit BadgeContractUpdated(badgeContract_);
    }

    function createRepo(
        string calldata name,
        address[] calldata approvers,
        uint8 threshold
    ) external returns (uint256 repoId) {
        if (threshold == 0) revert InvalidThreshold();

        repoId = nextRepoId++;
        Repo storage repo = repos[repoId];
        repo.name = name;
        repo.owner = msg.sender;
        repo.threshold = threshold;
        repo.exists = true;

        for (uint256 i = 0; i < approvers.length; i++) {
            address approver = approvers[i];
            if (approver == address(0)) revert InvalidApprover();
            if (!repoApprovers[repoId][approver]) {
                repoApprovers[repoId][approver] = true;
                repo.approverCount += 1;
                emit ApproverAdded(repoId, approver);
            }
        }

        if (repo.approverCount < threshold) revert InvalidThreshold();
        emit RepoCreated(repoId, msg.sender, threshold, name);
    }

    function addApprover(uint256 repoId, address approver) external onlyRepoOwner(repoId) {
        if (approver == address(0)) revert InvalidApprover();
        if (!repoApprovers[repoId][approver]) {
            repoApprovers[repoId][approver] = true;
            repos[repoId].approverCount += 1;
            emit ApproverAdded(repoId, approver);
        }
    }

    function removeApprover(uint256 repoId, address approver) external onlyRepoOwner(repoId) {
        if (repoApprovers[repoId][approver]) {
            uint32 nextApproverCount = repos[repoId].approverCount - 1;
            if (nextApproverCount < repos[repoId].threshold) revert InvalidThreshold();
            repoApprovers[repoId][approver] = false;
            repos[repoId].approverCount = nextApproverCount;
            emit ApproverRemoved(repoId, approver);
        }
    }

    function setThreshold(uint256 repoId, uint8 threshold) external onlyRepoOwner(repoId) {
        if (threshold == 0 || threshold > repos[repoId].approverCount) revert InvalidThreshold();
        repos[repoId].threshold = threshold;
        emit ThresholdUpdated(repoId, threshold);
    }

    function submitReport(
        uint256 repoId,
        bytes32 commitSha,
        bytes32 reportHash,
        string calldata uri,
        string calldata policyId
    ) external returns (uint256 reportId) {
        Repo storage repo = repos[repoId];
        if (!repo.exists) revert RepoNotFound();
        if (repoReportHashes[repoId][reportHash]) revert DuplicateHash();

        reportId = nextReportId++;
        reports[reportId] = Report({
            repoId: repoId,
            contributor: msg.sender,
            commitSha: commitSha,
            reportHash: reportHash,
            uri: uri,
            policyId: policyId,
            attestationCount: 0,
            status: ReportStatus.Pending,
            submittedAt: uint64(block.timestamp)
        });

        repoReportHashes[repoId][reportHash] = true;
        emit ReportSubmitted(reportId, repoId, msg.sender, commitSha, reportHash, uri, policyId);
    }

    function attest(uint256 reportId) external {
        Report storage report = reports[reportId];
        if (report.repoId == 0) revert ReportNotFound();
        if (report.status != ReportStatus.Pending) revert ReportNotPending();
        if (!repoApprovers[report.repoId][msg.sender]) revert NotApprover();
        if (reportAttestations[reportId][msg.sender]) revert AlreadyAttested();

        reportAttestations[reportId][msg.sender] = true;
        report.attestationCount += 1;
        emit ReportAttested(reportId, report.repoId, msg.sender);
    }

    function finalize(uint256 reportId) external {
        _finalize(reportId, "");
    }

    function finalizeWithBadgeUri(uint256 reportId, string calldata badgeUri) external {
        _finalize(reportId, badgeUri);
    }

    function _finalize(uint256 reportId, string memory badgeUri) internal {
        Report storage report = reports[reportId];
        if (report.repoId == 0) revert ReportNotFound();
        if (report.status != ReportStatus.Pending) revert ReportNotPending();

        Repo storage repo = repos[report.repoId];
        if (report.attestationCount < repo.threshold) revert ThresholdNotMet();

        report.status = ReportStatus.Finalized;
        if (badgeContract != address(0)) {
            string memory metadataUri = bytes(badgeUri).length == 0 ? report.uri : badgeUri;
            uint256 tokenId = IContributionBadge(badgeContract).mint(
                report.contributor,
                reportId,
                report.repoId,
                report.reportHash,
                report.uri,
                metadataUri
            );
            emit ReportBadgeIssued(reportId, tokenId, report.contributor);
        }
        emit ReportFinalized(reportId, report.repoId, report.attestationCount);
    }

    function markDisputed(uint256 reportId, bytes32 reasonHash) external {
        Report storage report = reports[reportId];
        if (report.repoId == 0) revert ReportNotFound();
        if (report.status != ReportStatus.Pending) revert ReportNotPending();

        bool canDispute = repos[report.repoId].owner == msg.sender ||
            repoApprovers[report.repoId][msg.sender];
        if (!canDispute) revert NotApprover();

        report.status = ReportStatus.Disputed;
        emit ReportDisputed(reportId, report.repoId, reasonHash);
    }
}
