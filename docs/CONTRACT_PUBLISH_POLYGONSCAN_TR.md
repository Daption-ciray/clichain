# PolygonScan Contract Publish / Verify Rehberi

Ag: Polygon Amoy Testnet

## Polygon Mainnet ProofOfContribution

- Contract Address: `0x0e0e36378e7B8fE8F7743A10e9e942Bd6A2b04A7`
- Verified source: https://polygonscan.com/address/0x0e0e36378e7B8fE8F7743A10e9e942Bd6A2b04A7#code
- Source file: `contracts/contracts/ProofOfContribution.sol`
- Constructor Arguments ABI-encoded: bos birak

Bu kontratta constructor argumani yok. Proposal'daki proje, uye, task, contribution evidence, approval, profile ve soulbound badge akisinin mainnet uygulamasidir.

## Ortak Ayarlar

- Compiler Type: `Solidity (Single file)`
- Compiler Version: `v0.8.24+commit.e11b9ed9`
- Open Source License Type: `MIT License (MIT)`
- Optimization: `Yes`
- Optimization Runs: `200`
- EVM Version: `default`

## ContributionRegistry

- Contract Address: `0x985d88E8a3b632bCc45e56fDf7F3918f4DEd2ab2`
- Source file: `contracts/contracts/ContributionRegistry.sol`
- Constructor Arguments ABI-encoded: bos birak

Bu kontratta constructor argumani yok.

## ContributionBadge

- Contract Address: `0xc9AdFbC3B3652e8d4252223EebAb3d78a8335F3c`
- Source file: `contracts/contracts/ContributionBadge.sol`
- Constructor Arguments:
  - registry: `0x985d88E8a3b632bCc45e56fDf7F3918f4DEd2ab2`
  - name: `Proof of Contribution Badge`
  - symbol: `POCB`

Constructor Arguments ABI-encoded:

```text
000000000000000000000000985d88e8a3b632bcc45e56fdf7f3918f4ded2ab2000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000001b50726f6f66206f6620436f6e747269627574696f6e20426164676500000000000000000000000000000000000000000000000000000000000000000000000004504f434200000000000000000000000000000000000000000000000000000000
```

## Ekranda Ne Secilecek?

1. Contract address alanina ilgili kontrat adresini yaz.
2. Compiler Type olarak `Solidity (Single file)` sec.
3. Compiler Version olarak `v0.8.24+commit.e11b9ed9` sec.
4. License olarak `MIT License (MIT)` sec.
5. Terms of service kutusunu isaretle.
6. Sonraki ekranda kontratin `.sol` dosyasindaki kaynak kodunu yapistir.
7. Optimization `Yes`, runs `200` yap.
8. Registry icin constructor arguments alanini bos birak.
9. Badge icin yukaridaki ABI-encoded constructor arguments metnini yapistir.

## Otomatik Verify Sonucu

Hardhat verify ile iki kontrat da Polygon Amoy uzerinde publish edildi:

- ContributionRegistry: https://amoy.polygonscan.com/address/0x985d88E8a3b632bCc45e56fDf7F3918f4DEd2ab2#code
- ContributionBadge: https://amoy.polygonscan.com/address/0xc9AdFbC3B3652e8d4252223EebAb3d78a8335F3c#code

Kullanilan komutlar:

```bash
npx hardhat verify --network amoy 0x985d88E8a3b632bCc45e56fDf7F3918f4DEd2ab2
npx hardhat verify --network amoy 0xc9AdFbC3B3652e8d4252223EebAb3d78a8335F3c 0x985d88E8a3b632bCc45e56fDf7F3918f4DEd2ab2 "Proof of Contribution Badge" POCB
```
