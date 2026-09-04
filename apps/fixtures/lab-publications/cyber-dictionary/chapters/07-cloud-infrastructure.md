# 7. Cloud & Infrastructure {#cloud-infrastructure}

## IaaS / PaaS / SaaS {#term-7-1}



Three levels of cloud service — raw machines, a managed platform, or finished software. The level decides how much security is yours and how much is the provider's.

## Shared responsibility model {#term-7-2}



The provider secures the cloud; you secure what you put in it. Nearly every cloud breach lands on the customer's side of that line.

## Public / private / hybrid cloud {#term-7-3}



Shared provider infrastructure, dedicated infrastructure, or a mix. Hybrid is the common reality, and the seams between the two are where control gaps live.

## Multi-cloud {#term-7-4}



Using more than one cloud provider. Reduces lock-in, multiplies the number of identity and policy models you must get right.

## Region / availability zone {#term-7-5}



A geographic location and an isolated datacentre within it. Regions matter for data residency law; zones matter for surviving hardware failure.

## Virtual machine {#term-7-6}

*VM*

A simulated computer running on shared hardware, with its own operating system. Strong isolation, heavier than a container.

## Hypervisor {#term-7-7}



The layer that runs and isolates virtual machines. Escaping it is the most valuable cloud vulnerability class, and correspondingly rare.

## Container {#term-7-8}

*Docker*

An application packaged with its dependencies, sharing the host kernel. Fast and portable, but isolation is weaker than a VM's.

## Container image {#term-7-9}



The read-only template a container starts from. Base images carry their own vulnerabilities, so scanning and rebuilding matter as much as your code.

## Container escape {#term-7-10}



Breaking out of a container to the host. Usually the result of privileged mode, a mounted socket, or an unpatched kernel.

## Kubernetes {#term-7-11}

*K8s*

The dominant container orchestrator. Powerful, and insecure by default in ways that need deliberate configuration to fix.

## Pod {#term-7-12}



Kubernetes' smallest deployable unit — one or more containers sharing a network identity and storage.

## Service mesh {#term-7-13}

*Istio, Linkerd*

A layer that handles service-to-service traffic, giving mutual TLS, policy, and telemetry without changing application code.

## Serverless {#term-7-14}

*FaaS, Lambda*

Running functions without managing servers. No host to patch, but function permissions and event sources become the security surface.

## Infrastructure as code {#term-7-15}

*IaC — Terraform, CloudFormation*

Defining infrastructure in version-controlled files. Makes environments reviewable and repeatable — and replicates a mistake everywhere instantly.

## Immutable infrastructure {#term-7-16}



Replacing servers instead of patching them in place. Removes configuration drift and quietly destroys most attacker persistence.

## Configuration drift {#term-7-17}



Live systems gradually diverging from their defined state through manual fixes. The reason a system that passed audit fails six months later.

## CSPM {#term-7-18}

*Cloud Security Posture Management*

Continuously checking cloud configuration against policy — public buckets, open groups, missing encryption, over-broad roles.

## CWPP / CNAPP {#term-7-19}

*Cloud Workload / Native Application Protection Platform*

Runtime protection for cloud workloads, and the bundled platforms that combine posture, workload, and identity checks.

## CIEM {#term-7-20}

*Cloud Infrastructure Entitlement Management*

Finding and trimming excessive cloud permissions. Most cloud identities hold far more rights than they ever use.

## IAM policy {#term-7-21}



The rules defining which identity may perform which action on which cloud resource. Wildcards in these are the most common cloud misconfiguration.

## Instance metadata service {#term-7-22}

*IMDS*

A local endpoint that hands running instances their cloud credentials. Reachable via SSRF unless the hardened version is enforced.

## Security group {#term-7-23}

*Network ACL*

Cloud firewall rules attached to resources or subnets. An accidentally open management port here is a recurring breach origin.

## Object storage {#term-7-24}

*S3, Blob, GCS*

Cloud file storage addressed by key rather than path. Publicly-readable buckets remain one of the most common data exposures.

## Bastion host {#term-7-25}

*Jump box*

A single hardened, monitored entry point for administrative access to a private network, so nothing else needs exposing.

## Backup {#term-7-26}



A separate copy of data that can be restored. Untested backups are a plan, not a control — and ransomware crews delete the ones they can reach.

## 3-2-1 rule {#term-7-27}



Three copies of data, on two media types, with one off-site. Modern versions add one offline or immutable copy.

## Immutable backup {#term-7-28}

*WORM*

Backups that cannot be altered or deleted for a set period, even by an administrator. The specific answer to ransomware deleting backups.

## RTO / RPO {#term-7-29}

*Recovery Time / Point Objective*

How fast you must be back, and how much data you can afford to lose. Two numbers that decide the entire backup architecture.

## Disaster recovery {#term-7-30}

*DR*

Restoring technology after a major failure. Distinct from business continuity, which covers how the organisation keeps operating meanwhile.

## High availability {#term-7-31}

*HA*

Design that survives component failure without downtime, through redundancy and failover. Availability is a security property too.

## CDN {#term-7-32}

*Content Delivery Network*

Distributed edge servers caching content close to users. Also a practical place to absorb denial-of-service traffic and enforce WAF rules.

## WAF {#term-7-33}

*Web Application Firewall*

Filters HTTP requests against attack patterns. Buys time before a patch; it does not fix the underlying flaw.

## Rate limiting {#term-7-34}



Capping how many requests a client can make in a window. The simplest defence against brute force, scraping, and abuse.

## API gateway {#term-7-35}



A single front door for APIs handling authentication, rate limits, routing, and logging, so services do not each reimplement them.

## Edge computing {#term-7-36}



Processing data near where it is produced rather than in a central cloud. Cuts latency and bandwidth; multiplies the number of devices to secure.

## Data residency {#term-7-37}

*Data sovereignty*

Legal requirements about where data physically lives and which government can compel access to it. A cloud region choice with legal consequences.

## Egress cost / lock-in {#term-7-38}



Charges for moving data out of a cloud, and the dependence they create. A commercial concern that becomes a resilience concern.
