# Proje Son Durum Özeti

## Amaç

Bu proje, Git üzerindeki katkı verilerini alıp standart bir attestation formatına dönüştüren ve bu raporun sonradan değiştirilmediğini blockchain üzerinde kanıtlayan bir MVP sistemidir.

Temel amaç:

```text
Git katkı verisi
-> standart rapor formatı
-> rapor hash'i
-> smart contract kaydı
-> yetkili onaycılar
-> finalized rapor
-> hash doğrulama
```

## Genel Akış

```text
Git commit aralığı
   -> CLI ile katkı metrikleri çıkarılır
   -> in-toto Statement v1 formatında report.json üretilir
   -> report.json dosyasının hash'i alınır
   -> hash smart contract'a kaydedilir
   -> yetkili onaycılar raporu onaylar
   -> yeterli onay gelince rapor finalized olur
   -> dosya hash'i chain'deki hash ile doğrulanır
```

## Rapor Formatı

Rapor artık projeye özel düz bir JSON formatında değildir. Katkı raporu, yazılım tedarik zinciri tarafında kullanılan standart bir attestation yapısı olan **in-toto Statement v1** formatında üretilmektedir.

Örnek yapı:

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "subject": [
    {
      "name": "commit aralığı",
      "digest": {
        "gitCommitFrom": "...",
        "gitCommitTo": "..."
      }
    }
  ],
  "predicateType": "https://akadaltr.dev/attestation/contribution-report/v1",
  "predicate": {
    "project": "...",
    "range": "...",
    "policy": "...",
    "contributors": [
      {
        "identity": "...",
        "metrics": {
          "commits": 1,
          "filesChanged": 1,
          "additions": 1,
          "deletions": 0,
          "netLines": 1
        }
      }
    ]
  }
}
```

Alanların anlamı:

- `_type`: Belgenin in-toto Statement v1 olduğunu belirtir.
- `subject`: Hangi Git commit aralığının raporlandığını gösterir.
- `predicateType`: Bu attestation'ın katkı raporu tipinde olduğunu belirtir.
- `predicate`: Proje bilgisi, commit aralığı, policy ve katkı metriklerini içerir.

## Smart Contract Kullanımı

Akıllı kontrat, sistemin on-chain kayıt ve onay katmanıdır.

Kontrat dosyası:

```text
contracts/contracts/ContributionRegistry.sol
contracts/contracts/ContributionBadge.sol
```

Kontratın görevleri:

```text
repo kaydı oluşturmak
approver adreslerini tutmak
threshold bilgisini saklamak
reportHash'i zincire kaydetmek
approver onaylarını saymak
eşik dolunca raporu Finalized yapmak
```

Ana fonksiyonlar:

```text
createRepo      -> repo ve approver listesi oluşturur
addApprover     -> repo owner yeni approver ekler
removeApprover  -> repo owner approver çıkarır
setThreshold    -> repo owner onay eşiğini değiştirir
submitReport    -> report hash'ini chain'e kaydeder
attest          -> yetkili approver raporu onaylar
finalize        -> yeterli onay varsa raporu kesinleştirir
reports         -> chain'deki rapor bilgisini okumayı sağlar
ContributionBadge.mint -> finalize edilen rapor için soulbound badge üretir
```

Zincire `report.json` dosyasının tamamı yazılmaz. Bunun yerine dosyanın hash'i yazılır.

```text
report.json
-> canonical serialization
-> keccak256 hash
-> smart contract reportHash
```

Bu yaklaşım daha verimlidir ve dosyanın sonradan değiştirilip değiştirilmediğini kontrol etmeyi sağlar.

## Onay Mekanizması

Repo oluşturulurken approver adresleri ve threshold belirlenir.

Örnek:

```text
approver sayısı: 2
threshold: 2
```

Bu durumda raporun finalize olabilmesi için iki farklı yetkili approver'ın onay vermesi gerekir.

Akış:

```text
submitReport
-> status: Pending
-> attestationCount: 0

approver 1 attest
-> attestationCount: 1

approver 2 attest
-> attestationCount: 2

finalize
-> status: Finalized
```

Kontrat aynı approver'ın aynı raporu iki kez onaylamasını engeller.

Ek güvenlik kuralları:

```text
threshold sıfır olamaz
threshold benzersiz approver sayısından büyük olamaz
zero address approver olarak eklenemez
approver çıkarma işlemi aktif threshold'u bozamaz
```

## Dosya Hash Doğrulaması

Sisteme `verify-chain` komutu eklendi.

Bu komut:

```text
local report.json dosyasını okur
dosyanın hash'ini yeniden hesaplar
smart contract'taki reportHash değerini okur
iki hash'i karşılaştırır
```

Eğer dosya değiştirilmemişse:

```text
OK - file hash matches on-chain reportHash
```

Eğer dosya sonradan değiştirilmişse:

```text
FAIL - file hash mismatch
```

Bu sayede chain'e kaydedilen rapor ile eldeki dosyanın aynı olup olmadığı doğrulanabilir.

## IPFS Entegrasyonu

Rapor artık gerçek IPFS'e Pinata üzerinden yüklenebilir.

```bash
export PINATA_JWT="<YOUR_PINATA_JWT>"
poc ipfs-upload --file report.json --name "report-1.json"
```

Bu komut şunları döndürür:

```text
CID
ipfs://CID URI
Pinata gateway linki
dosya boyutu
timestamp
```

İstenirse upload ve chain submit tek komutta yapılabilir:

```bash
poc submit \
  --commit <commitSha> \
  --upload-ipfs \
  --ipfs-name "report-1.json" \
  --file report.json
```

Bu durumda kontrattaki `uri` alanına `local://report.json` yerine gerçek `ipfs://CID` yazılır.

## Soulbound Badge

Finalize edilen rapordan sonra contributor wallet adresine devredilemeyen bir badge mint edilir.

Bu badge:

```text
normal NFT gibi görünür
başka adrese transfer edilemez
satılamaz
reportId, repoId, reportHash ve uri bilgisini taşır
```

Akış:

```text
submitReport
-> approver attest
-> threshold tamamlanır
-> finalize
-> ContributionBadge mint edilir
-> badge locked/soulbound kalır
```

Badge'i CLI ile okumak:

```bash
poc badge --token-id 1
```

NFT standardına daha yakın metadata üretmek:

```bash
poc badge-metadata --report-id 1 --out badge-metadata.json
poc ipfs-upload --file badge-metadata.json --name "badge-1-metadata.json"
poc finalize --report-id 1 --badge-uri "ipfs://<metadata-cid>"
```

Bu akışta badge `tokenURI` değeri rapor dosyasına değil, NFT metadata JSON'una işaret eder. Metadata içinde `name`, `description`, `attributes`, `reportId`, `repoId`, `reportHash`, `reportUri`, `contributor` ve `policyId` yer alır.

## Web Dashboard

Product arayüzü için local web dashboard eklendi.

```bash
poc web
```

Adres:

```text
http://127.0.0.1:8788
```

Dashboard şunları sağlar:

```text
wallet connect
repo/report durumlarını görüntüleme
attest/finalize işlemlerini wallet ile gönderme
report hash doğrulama
badge görüntüleme
GitHub repo/commit seçme
GitHub commit aralığından report üretme
event indexer görünümü
```

## Local Çalışma Durumu

Sistem şu anda local ortamda uçtan uca çalışmaktadır.

```text
Local blockchain: Hardhat local chain
Local explorer: http://127.0.0.1:8787
Rapor formatı: in-toto Statement v1
On-chain kayıt: reportHash
Off-chain storage: IPFS CID veya local URI
Badge: finalized rapor sonrası soulbound token
Onay mekanizması: threshold-based attestation
Son durum: report finalized
Doğrulama: verify-chain ile dosya hash'i chain'e karşı kontrol ediliyor
```

Local explorer üzerinden şunlar görülebilir:

```text
chain id
latest block
transaction'lar
repo oluşturma event'i
report submit event'i
attest event'leri
finalize event'i
reportHash
attestationCount
status
```

## CLI Komutları

Temel komutlar:

```bash
poc scan \
  --from <oldCommit> \
  --to <newCommit> \
  --generated-at "2026-05-08T10:00:00.000Z" \
  --out report.json
poc hash --file report.json
poc submit --commit <commitSha> --uri "local://report.json" --file report.json
poc ipfs-upload --file report.json --name "report-1.json"
poc submit --commit <commitSha> --upload-ipfs --file report.json
poc attest --report-id 1
poc badge-metadata --report-id 1 --out badge-metadata.json
poc ipfs-upload --file badge-metadata.json --name "badge-1-metadata.json"
poc finalize --report-id 1 --badge-uri "ipfs://<metadata-cid>"
poc badge --token-id 1
poc verify-chain --report-id 1 --file report.json
```

Repo owner komutları:

```bash
poc add-approver --repo-id 1 --approver <address>
poc set-threshold --repo-id 1 --threshold 2
poc remove-approver --repo-id 1 --approver <address>
```

`--generated-at` sabit verildiğinde aynı commit aralığı için tekrar üretilen rapor aynı hash'i verir. Bu, demo ve akademik doğrulama için önemlidir.

Explorer:

```bash
poc explorer
poc web
```

Adres:

```text
http://127.0.0.1:8787
```

## Sonuç

Proje şu an şu seviyededir:

```text
Git katkı verilerini standart in-toto attestation formatında raporlayan,
bu raporun hash'ini smart contract'a kaydeden,
yetkili onaycılarla finalize eden,
sonradan dosya değiştirildiğinde bunu hash karşılaştırmasıyla yakalayan
local çalışan bir blockchain tabanlı katkı doğrulama MVP'si.
```

Bu haliyle proje, hem standart bir veri şablonu kullanmakta hem de rapor bütünlüğünü on-chain hash kaydı ve threshold-based attestation mekanizmasıyla doğrulamaktadır.
