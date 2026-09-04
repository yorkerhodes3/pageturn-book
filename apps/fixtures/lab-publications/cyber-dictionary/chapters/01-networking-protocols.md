# 1. Networking & Protocols {#networking-protocols}

## IP address {#term-1-1}

*Internet Protocol address*

The number that identifies a device on a network so traffic can be routed to it. IPv4 looks like 192.0.2.10; IPv6 is longer and hexadecimal.

## Subnet {#term-1-2}



A slice of a larger network, carved out so that traffic inside it stays local and traffic leaving it has to pass a router. Written as a CIDR range like 10.0.1.0/24.

## CIDR {#term-1-3}

*Classless Inter-Domain Routing*

The /24-style notation for writing a block of IP addresses. The number after the slash says how many leading bits are fixed — the bigger the number, the smaller the block.

## NAT {#term-1-4}

*Network Address Translation*

A router rewriting private internal addresses into one public address on the way out. It is why a whole office can share a single IP, and why inbound connections need explicit port forwarding.

## Port {#term-1-5}



A numbered door on a host. The IP gets you to the machine; the port gets you to the specific service — 22 for SSH, 443 for HTTPS.

## TCP {#term-1-6}

*Transmission Control Protocol*

The reliable transport: it sets up a connection, numbers every packet, and re-sends anything lost. Slower to start, but nothing arrives out of order.

## UDP {#term-1-7}

*User Datagram Protocol*

Fire-and-forget transport with no handshake and no re-sends. Used where speed beats completeness — DNS, video, games — and popular with attackers for spoofing and amplification.

## Three-way handshake {#term-1-8}

*SYN / SYN-ACK / ACK*

The three packets TCP exchanges to open a connection. Half-finished handshakes left open on purpose are the basis of the SYN flood attack.

## DNS {#term-1-9}

*Domain Name System*

The internet's phone book: it turns names like example.com into IP addresses. Almost every attack chain touches it, which is why DNS logs are gold for investigators.

## DNS resolver {#term-1-10}

*Recursive resolver*

The server that does the lookup legwork on your behalf, walking from the root servers down to the authoritative one and caching the answer.

## Authoritative name server {#term-1-11}



The server that holds the real, official records for a domain. Everything else is a cached copy of what it said.

## DNSSEC {#term-1-12}

*DNS Security Extensions*

Cryptographic signatures on DNS records so a resolver can tell a genuine answer from a forged one. It proves authenticity, not confidentiality — the query is still visible.

## DoH / DoT {#term-1-13}

*DNS over HTTPS / DNS over TLS*

Encrypted DNS lookups. Good for user privacy, awkward for defenders, because it hides the query from the network monitoring that used to see it.

## DNS tunnelling {#term-1-14}



Smuggling data in and out of a network inside DNS queries and responses. Slow, noisy if you look for it, and effective because DNS is rarely blocked.

## HTTP {#term-1-15}

*Hypertext Transfer Protocol*

The request-and-response protocol the web runs on. Plain HTTP is unencrypted, so anything sent over it can be read or altered in transit.

## HTTPS {#term-1-16}

*HTTP over TLS*

HTTP wrapped in TLS encryption. It proves you are talking to the site named in the certificate and stops anyone in the middle reading or editing the traffic.

## TLS {#term-1-17}

*Transport Layer Security*

The protocol that encrypts and authenticates most internet traffic. SSL is its dead predecessor — people still say SSL, but they mean TLS.

## TLS handshake {#term-1-18}



The opening exchange where client and server agree a cipher, verify the certificate, and derive session keys before any real data moves.

## SNI {#term-1-19}

*Server Name Indication*

The field in a TLS handshake that names which site you want, sent before encryption starts. It leaks the hostname to anyone watching, which is what Encrypted Client Hello is meant to fix.

## mTLS {#term-1-20}

*Mutual TLS*

TLS where both sides present certificates, not just the server. Common between internal services because it authenticates the client without passwords.

## VPN {#term-1-21}

*Virtual Private Network*

An encrypted tunnel that makes a remote device behave as if it were on the internal network. It moves the trust boundary — it does not remove it.

## IPsec {#term-1-22}

*Internet Protocol Security*

A suite for encrypting and authenticating traffic at the IP layer, used for site-to-site VPNs. Works below the application, so apps need no changes.

## WireGuard {#term-1-23}



A modern VPN protocol with a deliberately small codebase and a fixed set of modern ciphers. Faster and easier to audit than IPsec or OpenVPN.

## Proxy {#term-1-24}



A middleman that makes requests on your behalf. A forward proxy fronts clients, a reverse proxy fronts servers, and both are natural places to inspect or filter traffic.

## Reverse proxy {#term-1-25}



A server that sits in front of your applications, terminating TLS and passing requests inward. Where load balancing, caching, and web application firewalls usually live.

## Load balancer {#term-1-26}



Spreads incoming traffic across several backend servers, and takes unhealthy ones out of rotation. Also a single point to enforce TLS and rate limits.

## Firewall {#term-1-27}



A control that allows or blocks traffic by rule — usually address, port, and protocol. The traditional perimeter device, now also a per-host and per-cloud-resource control.

## NGFW {#term-1-28}

*Next-Generation Firewall*

A firewall that also identifies the application and user behind the traffic, not just ports and IPs, and can inspect decrypted sessions.

## IDS / IPS {#term-1-29}

*Intrusion Detection / Prevention System*

Sensors that watch traffic for known-bad patterns. An IDS alerts; an IPS sits inline and drops the traffic, which is more useful and more dangerous.

## Network segmentation {#term-1-30}



Splitting a network into zones with controlled paths between them so a foothold in one zone does not reach everything. The single most effective limit on lateral movement.

## Microsegmentation {#term-1-31}



Segmentation taken down to the individual workload, with policy attached to the service rather than the subnet. Usually enforced by agents or a service mesh.

## VLAN {#term-1-32}

*Virtual LAN*

A logical network laid over shared switch hardware, so two ports on the same switch can be on separate networks. A control, but a soft one — VLAN hopping is a real attack.

## ARP {#term-1-33}

*Address Resolution Protocol*

Maps IP addresses to hardware MAC addresses on a local network. It has no authentication at all, which is why ARP spoofing is trivial on a flat network.

## DHCP {#term-1-34}

*Dynamic Host Configuration Protocol*

Hands out IP addresses and network settings to devices as they join. A rogue DHCP server can quietly point every new device at an attacker's gateway and DNS.

## BGP {#term-1-35}

*Border Gateway Protocol*

How the internet's large networks tell each other which address ranges they can reach. Built on trust, so a bad or malicious announcement can hijack traffic globally.

## MAC address {#term-1-36}

*Media Access Control address*

The hardware identifier burned into a network interface. Useful for local identification, useless as an authenticator — it can be changed in one command.

## Packet capture {#term-1-37}

*PCAP*

A raw recording of network traffic, read with tools like Wireshark or tcpdump. The ground truth when logs disagree about what actually crossed the wire.

## NetFlow {#term-1-38}

*Flow data*

Summary records of who talked to whom, for how long, and how much — without the contents. Cheap to keep for a long time, which makes it the backbone of retrospective hunting.

## Air gap {#term-1-39}



Physically isolating a system from other networks. Strong in principle, routinely defeated in practice by USB drives, maintenance laptops, and forgotten management links.
