# PolygonScan Contract Publish / Verify Rehberi

Ag: Polygon Amoy Testnet

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

Not: Otomatik Hardhat verify icin PolygonScan/Etherscan API key gerekiyor. Bu repoda API key bulunmadigi icin manuel publish yolu kullaniliyor.
