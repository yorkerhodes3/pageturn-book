# 3. Identity & Access {#identity-access}

## Authentication {#term-3-1}

*AuthN*

Proving who you are. Distinct from authorisation, and confusing the two is the root of a surprising number of vulnerabilities.

## Authorisation {#term-3-2}

*AuthZ*

Deciding what an already-identified user is allowed to do. A logged-in user reaching another user's record is an authorisation failure, not an authentication one.

## Multi-factor authentication {#term-3-3}

*MFA / 2FA*

Requiring two or more different kinds of proof — something you know, have, or are. The single highest-value control against stolen passwords.

## TOTP {#term-3-4}

*Time-based One-Time Password*

The rotating six-digit code from an authenticator app. Far better than SMS, but still phishable, because the user can be tricked into typing it into a fake site.

## Phishing-resistant MFA {#term-3-5}



Factors bound to the real domain so they cannot be relayed to a fake one — hardware security keys and passkeys. Codes and push prompts are not phishing-resistant.

## FIDO2 / WebAuthn {#term-3-6}



The open standards behind hardware keys and passkeys. The browser signs a challenge with a key tied to the exact origin, so a lookalike site gets nothing.

## Passkey {#term-3-7}



A WebAuthn credential stored on a device or synced through a platform account, replacing the password entirely. Unlocked with a fingerprint, face, or PIN.

## Security key {#term-3-8}

*Hardware token, YubiKey*

A physical device that holds authentication keys and requires a touch to use. The strongest widely-available second factor.

## SSO {#term-3-9}

*Single Sign-On*

One login granting access to many applications. It centralises control and logging — and centralises risk, since the identity provider becomes the crown jewel.

## IdP {#term-3-10}

*Identity Provider*

The system that authenticates users and vouches for them to applications — Entra ID, Okta, Google Workspace. Compromise it and every downstream app follows.

## SAML {#term-3-11}

*Security Assertion Markup Language*

The older XML-based standard for federated SSO, still standard in enterprise software. Its signature handling has a long history of bypass bugs.

## OAuth 2.0 {#term-3-12}



A delegation framework: it lets an app act on your behalf against another service without ever seeing your password. It is about access, not identity.

## OIDC {#term-3-13}

*OpenID Connect*

An identity layer built on top of OAuth 2.0. OAuth grants access; OIDC actually tells the app who you are, in a signed ID token.

## JWT {#term-3-14}

*JSON Web Token*

A signed, self-describing token carrying claims about a user. Readable by anyone holding it — signed, not secret — so never put anything confidential inside.

## Bearer token {#term-3-15}



A credential where possession alone grants access, with no further proof required. Which is exactly why leaked tokens in logs or repos are so damaging.

## Session hijacking {#term-3-16}



Stealing a valid session cookie or token to become an already-authenticated user, skipping login and MFA entirely. Infostealer malware's main product.

## Token binding / DPoP {#term-3-17}



Tying a token to the client that requested it, so a stolen token is useless elsewhere. The countermeasure to plain bearer tokens.

## RBAC {#term-3-18}

*Role-Based Access Control*

Permissions attached to roles, and roles attached to people. Simple and auditable, until the roles multiply and everyone ends up in several.

## ABAC {#term-3-19}

*Attribute-Based Access Control*

Access decided by attributes — department, device posture, location, time — evaluated as policy. More expressive than roles, and harder to reason about.

## Least privilege {#term-3-20}



Give each account only the access its job requires, and no more. The principle nearly every access review is trying to enforce.

## Privilege escalation {#term-3-21}



Gaining rights beyond those granted. Vertical means user to admin; horizontal means reaching another user's data at the same level.

## PAM {#term-3-22}

*Privileged Access Management*

Controls specifically for admin accounts — vaulted credentials, checkout with approval, session recording, and automatic rotation.

## Just-in-time access {#term-3-23}

*JIT*

Granting elevated rights only for a defined window, then removing them automatically. Replaces standing admin access, which is what attackers actually hunt for.

## Service account {#term-3-24}

*Machine identity*

A non-human account used by an application or script. Typically over-permissioned, rarely rotated, never MFA-protected — a standing favourite for attackers.

## Workload identity {#term-3-25}



Giving a running service a short-lived, automatically issued identity instead of a static key. The modern replacement for hard-coded credentials.

## Federation {#term-3-26}



Trusting another organisation's identity provider so their users can access your systems without separate accounts. Convenient, and it exports your trust decision.

## Directory service {#term-3-27}

*Active Directory, LDAP*

The central store of users, groups, and computers. In most enterprises, compromising Active Directory is functionally the same as compromising everything.

## Kerberos {#term-3-28}



The ticket-based authentication protocol underneath Windows domains. Its ticket mechanics give rise to Kerberoasting, Golden Ticket, and Silver Ticket attacks.

## Pass-the-hash {#term-3-29}

*PtH*

Authenticating with a stolen password hash without ever cracking it, because the protocol accepts the hash as proof.

## Kerberoasting {#term-3-30}



Requesting service tickets for accounts with weak passwords and cracking them offline. Quiet, effective, and needs only an ordinary domain account to start.

## Golden Ticket {#term-3-31}



Forging Kerberos tickets using the domain's krbtgt key, granting an attacker persistent, self-issued access to anything in the domain.

## Credential stuffing {#term-3-32}



Replaying username and password pairs from earlier breaches against other sites, betting on reuse. Cheap, automated, and depressingly effective.

## Password spraying {#term-3-33}



Trying one or two common passwords across many accounts, staying under lockout thresholds. Slower than brute force and far less likely to trip alarms.

## Account takeover {#term-3-34}

*ATO*

An attacker gaining full control of a legitimate account, then using its normal permissions. Hard to spot precisely because nothing technically breaks.

## Identity lifecycle {#term-3-35}

*Joiner–Mover–Leaver*

Provisioning access on hire, adjusting it on transfer, and removing it on exit. Leaver failures — dormant accounts with live access — are a recurring audit finding.

## SCIM {#term-3-36}

*System for Cross-domain Identity Management*

The standard for pushing user creation, updates, and deprovisioning from an identity provider into applications automatically.

## Access review {#term-3-37}

*Recertification / attestation*

A periodic check where owners confirm who still needs access. The main defence against privilege creep — and often rubber-stamped.

## Zero trust {#term-3-38}



Assume no network location is trusted; verify identity, device, and context on every request. A design principle, not a product, whatever a vendor tells you.
