# 6. Application Security {#application-security}

## OWASP {#term-6-1}

*Open Worldwide Application Security Project*

A nonprofit producing free application security guidance, tools, and the widely-cited Top 10 lists.

## OWASP Top 10 {#term-6-2}



A periodically-updated list of the most critical web application risks. An awareness document, not a checklist to certify against.

## Injection {#term-6-3}



Untrusted input being interpreted as code or commands. The root cause behind SQL injection, command injection, and most template attacks.

## SQL injection {#term-6-4}

*SQLi*

Slipping SQL into input so the database runs it. Fixed properly by parameterised queries — never by filtering quotes.

## XSS {#term-6-5}

*Cross-Site Scripting*

Injecting JavaScript that runs in another user's browser under your site's origin, letting an attacker read cookies or act as that user.

## Stored vs reflected XSS {#term-6-6}



Stored XSS is saved server-side and hits every viewer; reflected XSS is echoed back from a crafted link and hits whoever clicks it.

## DOM-based XSS {#term-6-7}



XSS caused entirely by client-side JavaScript writing untrusted data into the page. The server may never see the payload at all.

## CSRF {#term-6-8}

*Cross-Site Request Forgery*

Tricking a logged-in browser into sending a state-changing request the user never intended. Blocked with anti-CSRF tokens and SameSite cookies.

## SSRF {#term-6-9}

*Server-Side Request Forgery*

Making the server fetch a URL of the attacker's choosing, often reaching internal services or cloud metadata endpoints the internet cannot.

## IDOR {#term-6-10}

*Insecure Direct Object Reference*

Changing an identifier in a URL or request and getting someone else's data because the server never checked ownership.

## Broken access control {#term-6-11}



Authorisation not enforced consistently on the server. Persistently the number one web risk, because it cannot be found by scanners alone.

## Path traversal {#term-6-12}

*Directory traversal*

Using ../ sequences to read files outside the intended directory, such as configuration or key material.

## Command injection {#term-6-13}



User input reaching a shell command, letting an attacker run arbitrary system commands as the application's user.

## Deserialisation vulnerability {#term-6-14}



Rebuilding objects from untrusted serialised data, which in many languages can trigger code execution during reconstruction.

## XXE {#term-6-15}

*XML External Entity*

Abusing XML parsers that resolve external references, allowing file reads or server-side requests. Fixed by disabling external entities.

## Race condition {#term-6-16}

*TOCTOU*

A bug where the outcome depends on timing between a check and its use. Exploited by firing simultaneous requests — a common cause of duplicate refunds and coupon abuse.

## Buffer overflow {#term-6-17}



Writing past the end of a memory buffer, corrupting adjacent data and often enabling code execution. Mostly a C and C++ problem.

## Use-after-free {#term-6-18}



Using memory after it has been released, letting an attacker control what now sits there. A leading source of browser and kernel exploits.

## Memory safety {#term-6-19}



Preventing whole classes of memory bugs by design. The main argument for Rust, Go, and similar languages in new systems code.

## Input validation {#term-6-20}



Checking that input matches an expected shape before use. Allow-lists work; deny-lists of bad characters eventually fail.

## Output encoding {#term-6-21}



Escaping data for the context it lands in — HTML, attribute, JavaScript, SQL. The correct fix for XSS, applied at the point of output.

## Parameterised query {#term-6-22}

*Prepared statement*

Sending SQL structure and data separately so input can never become code. The definitive SQL injection fix.

## CSP {#term-6-23}

*Content Security Policy*

A header telling the browser which sources of script, style, and frames are allowed. A strong second line of defence when XSS slips through.

## CORS {#term-6-24}

*Cross-Origin Resource Sharing*

Rules for when one origin may read another's responses. Loosening it to a wildcard with credentials is a routine and serious misconfiguration.

## Same-origin policy {#term-6-25}

*SOP*

The browser rule that keeps one site's scripts from reading another site's data. The foundation everything else in web security sits on.

## Secure cookie flags {#term-6-26}

*HttpOnly, Secure, SameSite*

HttpOnly hides a cookie from JavaScript, Secure restricts it to HTTPS, and SameSite limits cross-site sending. Three flags, most cookie attacks covered.

## HSTS {#term-6-27}

*HTTP Strict Transport Security*

A header telling browsers to only ever use HTTPS for a domain, removing the downgrade window on first navigation.

## Subresource integrity {#term-6-28}

*SRI*

A hash on a third-party script tag so the browser refuses it if the file changed. Cheap protection against a compromised CDN.

## SAST {#term-6-29}

*Static Application Security Testing*

Scanning source code for vulnerable patterns without running it. Broad coverage, high false-positive rate.

## DAST {#term-6-30}

*Dynamic Application Security Testing*

Testing a running application from the outside. Fewer false positives, but it only finds what it can reach.

## SCA {#term-6-31}

*Software Composition Analysis*

Inventorying third-party dependencies and flagging known-vulnerable versions. Most of a modern codebase is not written in-house.

## Fuzzing {#term-6-32}



Throwing malformed and random input at a program to find crashes. Extremely effective at finding memory-safety and parser bugs.

## Penetration test {#term-6-33}

*Pentest*

An authorised, time-boxed attempt to break in and prove impact. Deeper than a scan, narrower than a red team engagement.

## Bug bounty {#term-6-34}



Paying external researchers for valid vulnerability reports. Continuous and broad, but no substitute for internal testing.

## Responsible disclosure {#term-6-35}

*Coordinated disclosure*

Reporting a flaw privately and agreeing a window before publication, so a fix exists before the details do.

## Secure SDLC {#term-6-36}



Building security into every stage of development rather than testing at the end. Threat modelling, review, testing, and monitoring as normal practice.

## Threat modelling {#term-6-37}

*STRIDE*

Working out systematically what could go wrong with a design before it is built. Cheapest security work there is, and the most often skipped.

## Shift left {#term-6-38}



Moving security checks earlier into design and development. Genuinely valuable, and frequently reduced to adding a scanner to the build.

## Secrets management {#term-6-39}



Keeping credentials out of code and configuration and in a vault with rotation and audit. Hard-coded secrets in repositories remain a top breach cause.

## Hard-coded credentials {#term-6-40}



Passwords or keys written directly into source. They spread through forks, logs, and backups, and cannot be rotated without a code change.
