# 2. Cryptography {#cryptography}

## Plaintext / ciphertext {#term-2-1}



Plaintext is the readable data; ciphertext is what it looks like after encryption. Encryption turns one into the other, decryption turns it back.

## Symmetric encryption {#term-2-2}



One shared key both encrypts and decrypts. Fast, ideal for bulk data, but everyone who needs to read it needs the same secret — which is the hard part.

## Asymmetric encryption {#term-2-3}

*Public-key cryptography*

A key pair: the public key encrypts or verifies, the private key decrypts or signs. Slower, but it lets strangers exchange secrets without meeting first.

## AES {#term-2-4}

*Advanced Encryption Standard*

The default symmetric cipher, normally with 128- or 256-bit keys. Unbroken in practice — failures around it are nearly always key management or mode-of-operation mistakes.

## RSA {#term-2-5}

*Rivest–Shamir–Adleman*

The classic public-key algorithm, based on the difficulty of factoring large numbers. Still common, but large and slow next to elliptic curve, and a prime target for quantum attacks.

## ECC {#term-2-6}

*Elliptic Curve Cryptography*

Public-key cryptography over elliptic curves, giving the same strength as RSA with far smaller keys. The default for new TLS and signing work.

## Diffie–Hellman {#term-2-7}

*DH / ECDH*

A method for two parties to agree a shared secret over a channel anyone can watch, without ever sending the secret itself.

## Forward secrecy {#term-2-8}

*PFS*

Using fresh, throwaway keys per session so that stealing the long-term private key later does not decrypt traffic captured earlier.

## Hash function {#term-2-9}



A one-way function turning any input into a fixed-length fingerprint. Same input always gives the same digest; the digest cannot be reversed back to the input.

## SHA-256 {#term-2-10}

*Secure Hash Algorithm 256*

The workhorse hash for integrity checks, signatures, and blockchains. SHA-1 and MD5 are its broken predecessors and should never be used for security.

## Collision {#term-2-11}



Two different inputs producing the same hash. Once collisions are practical — as with MD5 and SHA-1 — the hash can no longer prove a file is unmodified.

## Salt {#term-2-12}



Random data added to a password before hashing, unique per user. It stops one precomputed table cracking every account at once.

## Pepper {#term-2-13}



A secret value mixed into password hashing and stored separately from the database, so a database dump alone is not enough to start cracking.

## Key derivation function {#term-2-14}

*KDF — bcrypt, scrypt, Argon2, PBKDF2*

A deliberately slow, memory-hungry hash for passwords. Slowness is the feature: it makes brute-force guessing expensive.

## Rainbow table {#term-2-15}



A precomputed lookup from hashes back to passwords. Defeated entirely by per-user salting, which is why unsalted hashes are treated as plaintext.

## HMAC {#term-2-16}

*Hash-based Message Authentication Code*

A hash keyed with a shared secret, proving both that a message is unaltered and that it came from someone holding the key.

## Digital signature {#term-2-17}



A hash of a message encrypted with the sender's private key. Anyone with the public key can confirm authorship and that nothing changed — and the signer cannot credibly deny it.

## Certificate {#term-2-18}

*X.509 certificate*

A signed statement binding a public key to an identity such as a domain name. Trust rests entirely on trusting whoever signed it.

## Certificate authority {#term-2-19}

*CA*

An organisation that issues and vouches for certificates. Its root certificate ships in browsers and operating systems, so a compromised CA breaks trust everywhere.

## PKI {#term-2-20}

*Public Key Infrastructure*

The whole apparatus of issuing, distributing, renewing, and revoking certificates and keys. Most PKI incidents are expiries and misissuance, not cryptographic breaks.

## Certificate pinning {#term-2-21}



Hard-coding which certificate or key an app will accept, so a rogue CA cannot impersonate the server. Powerful, and easy to brick your own app with.

## CRL / OCSP {#term-2-22}

*Certificate Revocation List / Online Certificate Status Protocol*

The two ways to check whether a certificate has been revoked early. Both are patchy in practice, which is why short-lived certificates are now preferred.

## Let's Encrypt / ACME {#term-2-23}

*Automatic Certificate Management Environment*

A free CA and the protocol that automates issuing and renewing certificates. It made HTTPS the default rather than an upgrade.

## Encryption at rest {#term-2-24}



Data encrypted while stored on disk, so stolen hardware or a copied volume is useless. It does not protect data while the system is running and the key is loaded.

## Encryption in transit {#term-2-25}



Data encrypted while moving over a network. The pair to encryption at rest — most compliance regimes ask for both.

## End-to-end encryption {#term-2-26}

*E2EE*

Only the sender and recipient hold the keys; the service carrying the message cannot read it. The distinction that matters when a provider is subpoenaed or breached.

## Key management {#term-2-27}

*KMS*

Generating, storing, rotating, and retiring keys. Almost every real-world crypto failure is a key management failure, not a broken algorithm.

## HSM {#term-2-28}

*Hardware Security Module*

A tamper-resistant device that generates and uses keys without ever exporting them. The key can be used but not copied, even by an administrator.

## TPM {#term-2-29}

*Trusted Platform Module*

A small secure chip on a motherboard that stores keys and measures boot integrity. What full-disk encryption and secure boot lean on.

## Nonce / IV {#term-2-30}

*Number used once / Initialisation Vector*

A unique value per encryption operation so identical plaintexts do not produce identical ciphertexts. Reusing one can collapse the security of the whole scheme.

## Entropy {#term-2-31}



Genuine unpredictability. Keys and tokens generated from weak entropy are guessable no matter how strong the algorithm.

## CSPRNG {#term-2-32}

*Cryptographically Secure Pseudo-Random Number Generator*

A random source safe for keys and tokens. Ordinary language random() functions are not, and using one for a session token is a classic bug.

## Side-channel attack {#term-2-33}



Recovering secrets from physical or timing leakage rather than breaking the maths — power draw, execution time, cache behaviour, even sound.

## Constant-time comparison {#term-2-34}



Comparing secrets in a way that always takes the same time, so an attacker cannot learn the value one character at a time from response timing.

## Post-quantum cryptography {#term-2-35}

*PQC*

Algorithms designed to survive quantum computers, now standardised as ML-KEM and ML-DSA. Being adopted early because encrypted traffic stolen today could be decrypted later.

## Harvest now, decrypt later {#term-2-36}



Recording encrypted traffic today in the expectation of breaking it with future technology. The reason long-lived secrets need post-quantum protection now, not eventually.

## Homomorphic encryption {#term-2-37}



Computing directly on encrypted data without decrypting it. Real, but still slow enough that it is used narrowly rather than by default.

## Steganography {#term-2-38}



Hiding a message inside something innocuous, such as an image, so nobody knows a message exists. Concealment rather than encryption — often used to smuggle payloads past filters.
