# 8. Endpoints & Systems {#endpoints-systems}

## Endpoint {#term-8-1}



Any device a person uses to reach the network — laptop, phone, tablet, server. Where most intrusions begin and where most detection now lives.

## Operating system {#term-8-2}

*OS*

The software managing hardware, memory, and processes. Its permission model is the boundary attackers are usually trying to cross.

## Kernel {#term-8-3}



The core of the operating system, running with full hardware access. Code running here can hide from everything above it.

## User space vs kernel space {#term-8-4}



The separation between ordinary programs and privileged system code. Crossing from one to the other is the goal of local privilege escalation.

## Patch {#term-8-5}



A vendor fix for a bug or vulnerability. Applying them promptly prevents more breaches than any tool you can buy.

## Patch Tuesday {#term-8-6}



Microsoft's monthly release of security fixes, on the second Tuesday. Exploit development against those fixes typically follows within days.

## Hardening {#term-8-7}



Removing unnecessary services, accounts, and features and tightening what remains. Cheap, unglamorous, and highly effective.

## Baseline / benchmark {#term-8-8}

*CIS Benchmarks*

A published, agreed secure configuration for a platform. Gives you something concrete to measure drift against.

## Golden image {#term-8-9}



A standard, pre-hardened system image every machine is built from, so security settings are the default rather than a follow-up task.

## Antivirus {#term-8-10}

*AV*

Signature and heuristic detection of malicious files. Necessary, insufficient, and blind to fileless and living-off-the-land activity.

## EDR {#term-8-11}

*Endpoint Detection and Response*

An agent recording process, file, and network behaviour on the endpoint, with the ability to alert, hunt, and isolate. The successor to antivirus.

## XDR {#term-8-12}

*Extended Detection and Response*

Correlating endpoint telemetry with identity, email, and cloud signals in one place. Often just a vendor's bundle under a new name.

## MDM {#term-8-13}

*Mobile Device Management*

Central enrolment and policy for phones and laptops — encryption, passcodes, app control, remote wipe.

## BYOD {#term-8-14}

*Bring Your Own Device*

Staff using personal devices for work. Convenient, and it puts corporate data on hardware you do not control or get to inspect.

## Application allow-listing {#term-8-15}

*Whitelisting*

Only approved executables may run. Extremely strong, operationally demanding, and impractical for developer machines.

## Full-disk encryption {#term-8-16}

*BitLocker, FileVault, LUKS*

Encrypting the whole drive so a lost or stolen device gives up nothing. Protects data at rest, not a running unlocked machine.

## Secure Boot {#term-8-17}



Firmware refusing to load unsigned boot code, blocking bootkits before the operating system starts.

## UEFI / BIOS {#term-8-18}

*Firmware*

The low-level code that starts the hardware. Rarely patched, hard to inspect, and highly persistent when compromised.

## Privilege separation {#term-8-19}



Running each component with only the rights it needs, so a compromise in one part does not hand over the whole system.

## Sudo / runas {#term-8-20}



Mechanisms for running a single command with elevated rights instead of working as an administrator all day. Also a valuable audit trail.

## Local admin rights {#term-8-21}



Full control of one machine. Removing standing local admin from ordinary users blocks a large share of malware outright.

## UAC {#term-8-22}

*User Account Control*

Windows' prompt before elevated actions. A speed bump rather than a boundary — plenty of documented bypasses exist.

## Group Policy {#term-8-23}

*GPO*

Windows' central mechanism for pushing configuration to domain machines. Also a superb attacker tool once domain admin is obtained.

## PowerShell {#term-8-24}



Windows' scripting and administration shell. Enormously useful to admins and attackers alike, which is why script block logging matters.

## SSH {#term-8-25}

*Secure Shell*

Encrypted remote command-line access. Key-based authentication should replace passwords, and unmanaged authorised_keys entries are a persistence route.

## RDP {#term-8-26}

*Remote Desktop Protocol*

Windows remote graphical access. Exposed to the internet, it is one of the most-attacked services in existence.

## Sysmon {#term-8-27}



A free Windows tool producing detailed process, network, and file telemetry. The cheapest meaningful upgrade to endpoint visibility.

## Event log {#term-8-28}



The operating system's record of what happened. Default retention is short, so shipping logs off-host is essential before an attacker clears them.

## Registry {#term-8-29}

*Windows Registry*

Windows' central configuration database. A common place for malware to persist, since certain keys run automatically at boot or login.

## Scheduled task / cron {#term-8-30}



Built-in job schedulers. Legitimate everywhere, and among the first things to check for attacker persistence.

## Process injection {#term-8-31}



Running malicious code inside another, trusted process so it inherits that process's identity and looks normal.

## DLL hijacking {#term-8-32}



Placing a malicious library where a trusted program will load it first. Turns a legitimate signed application into the malware's launcher.

## Virtualisation {#term-8-33}



Running multiple isolated systems on one machine. The basis of cloud, and a safe place to detonate suspicious files.

## OT / ICS {#term-8-34}

*Operational Technology / Industrial Control Systems*

Computers that run physical processes — plants, grids, pipelines. Long lifespans, no patch windows, and safety outranks confidentiality.

## SCADA {#term-8-35}

*Supervisory Control and Data Acquisition*

The monitoring and control layer above industrial equipment. Historically built for isolated networks and now, unhelpfully, often reachable.

## IoT {#term-8-36}

*Internet of Things*

Networked physical devices — cameras, sensors, meters. Weak defaults, rare updates, and long deployments make them ideal botnet recruits.

## Firmware update {#term-8-37}



Replacing the low-level software on a device. Often manual, sometimes unsigned, and the reason many devices stay vulnerable for years.

## End-of-life {#term-8-38}

*EOL / unsupported*

Software the vendor no longer patches. Every future vulnerability in it stays open permanently, so EOL is a security deadline, not an IT one.
