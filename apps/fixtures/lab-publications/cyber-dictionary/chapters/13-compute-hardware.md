# 13. Compute & Hardware {#compute-hardware}

## CPU {#term-13-1}

*Central Processing Unit*

The general-purpose processor that runs the operating system and most software. Very fast at doing one complicated thing after another.

## GPU {#term-13-2}

*Graphics Processing Unit*

A processor with thousands of simple cores built to do the same operation on huge amounts of data at once. Made for graphics, now the engine of machine learning.

## CPU vs GPU {#term-13-3}



A CPU is a few very fast generalists; a GPU is thousands of narrow specialists working in step. If your problem is the same maths repeated across a big array, the GPU wins by orders of magnitude.

## TPU / NPU {#term-13-4}

*Tensor / Neural Processing Unit*

Chips designed specifically for neural network maths. Google's TPUs run in its cloud; NPUs now ship inside phones and laptops for on-device inference.

## ASIC / FPGA {#term-13-5}



An ASIC is a chip hard-wired for one job — fast, cheap at volume, unchangeable. An FPGA is reconfigurable hardware: slower, but you can rewrite what it is.

## Core / thread {#term-13-6}



A core is an independent processing unit; a thread is one stream of instructions running on it. More cores means more genuinely simultaneous work.

## Clock speed {#term-13-7}

*GHz*

How many cycles a processor runs per second. A poor way to compare modern chips — architecture, cores and memory bandwidth matter more.

## Instruction set {#term-13-8}

*ISA — x86, ARM, RISC-V*

The vocabulary of operations a processor understands. x86 dominates servers and older PCs, ARM dominates mobile and now Apple and cloud silicon, RISC-V is the open alternative.

## System on a Chip {#term-13-9}

*SoC — not to be confused with a Security Operations Centre*

CPU, GPU, memory controller, and often a neural engine on a single piece of silicon. What phones, Raspberry Pis and Apple laptops are built on.

## RAM {#term-13-10}

*Random Access Memory*

Fast working memory holding what a program is actively using. Volatile — it empties on power loss, which is why memory forensics is time-critical.

## VRAM {#term-13-11}

*Video / GPU memory*

Memory attached directly to a GPU. It is the hard limit on model size: if the weights do not fit in VRAM, the model will not run, however fast the chip is.

## HBM {#term-13-12}

*High Bandwidth Memory*

Memory stacked next to the processor for enormous bandwidth. The scarce component in AI accelerators, and often the real bottleneck rather than compute.

## Cache {#term-13-13}

*L1 / L2 / L3*

Tiny, very fast memory close to the processor holding recently used data. Its timing behaviour leaks information, which is what Spectre-class attacks exploit.

## Memory bandwidth {#term-13-14}



How fast data moves between memory and the processor. For large models, feeding the chip is harder than the arithmetic itself.

## Storage {#term-13-15}

*SSD / NVMe / HDD*

Persistent storage. NVMe SSDs are dramatically faster than spinning disks, which matters when loading model weights or replaying logs.

## PCIe {#term-13-16}

*Peripheral Component Interconnect Express*

The bus connecting GPUs, drives and network cards to the processor. Its generation and lane count cap how fast data reaches an accelerator.

## NVLink / InfiniBand {#term-13-17}

*Interconnect*

High-speed links between GPUs and between servers. Training a large model across many chips is limited by interconnect as much as by the chips.

## DMA {#term-13-18}

*Direct Memory Access*

Devices reading and writing system memory without going through the CPU. Fast, and a real attack path — a malicious Thunderbolt or PCIe device can read memory directly.

## Driver {#term-13-19}



Software letting the operating system talk to hardware. Drivers run with kernel privileges, so a vulnerable or signed-but-malicious driver is a direct route to full control.

## BYOVD {#term-13-20}

*Bring Your Own Vulnerable Driver*

Installing a legitimately signed but flawed driver in order to abuse it for kernel access. A standard technique for disabling security tooling.

## FLOPS {#term-13-21}

*Floating point operations per second*

The standard measure of raw compute, quoted in teraflops or petaflops. Peak FLOPS is a ceiling, not a promise — real workloads rarely approach it.

## Throughput vs latency {#term-13-22}



Throughput is how much work finishes per second; latency is how long one request takes. Batching raises throughput and worsens latency, and you usually have to choose.

## Parallelism {#term-13-23}

*Data / model / pipeline parallel*

Splitting work across chips — by data batch, by slicing the model itself, or by staging layers. How anything too large for one accelerator gets trained.

## Cluster / node {#term-13-24}



A cluster is many machines working as one system; a node is a single machine in it. The unit of scale for both HPC and cloud training runs.

## HPC {#term-13-25}

*High Performance Computing*

Supercomputing for scientific workloads — climate models, genomics, simulation. Usually accessed through a batch scheduler rather than interactively.

## Job scheduler {#term-13-26}

*Slurm, PBS*

Software that queues and allocates cluster jobs across users. On shared research clusters, you submit a job and wait rather than running things directly.

## Precision {#term-13-27}

*FP32 / FP16 / BF16 / INT8*

How many bits represent each number. Lower precision means less memory and more speed, at some cost in accuracy — the central trade in running models cheaply.

## Quantisation {#term-13-28}



Converting model weights to lower precision so they fit in less memory and run faster. It is how large models end up running on a laptop or a phone.

## Model weights {#term-13-29}

*Parameters*

The learned numbers that are the model. Their count and precision together decide how much VRAM you need — roughly two bytes per parameter at 16-bit.

## KV cache {#term-13-30}



Stored intermediate values that let a language model generate each new token without recomputing the whole context. It grows with context length and eats VRAM.

## Tokens per second {#term-13-31}

*tok/s*

The practical speed measure for language model inference. Time to first token matters for how responsive it feels; tokens per second for how fast it finishes.

## Batch size {#term-13-32}



How many inputs are processed together. Larger batches use hardware more efficiently and need more memory.

## Training vs inference {#term-13-33}



Training builds the model and is enormously expensive but happens rarely; inference runs it and is cheap per call but happens constantly. Most lifetime cost ends up in inference.

## Fine-tuning vs LoRA {#term-13-34}

*Low-Rank Adaptation*

Full fine-tuning updates every weight and needs serious hardware; LoRA trains a small adapter alongside the frozen model and runs on a single consumer GPU.

## Distillation {#term-13-35}



Training a small model to imitate a large one, trading a little quality for a lot of speed and cost. How capable models reach modest hardware.

## Edge inference {#term-13-36}

*On-device AI*

Running a model on the user's own hardware. No data leaves the device, which is a privacy gain and a hard limit on model size.

## GPU cloud {#term-13-37}

*Accelerator rental*

Renting accelerators by the hour rather than buying them. Cheaper to start, expensive to leave running — idle GPUs bill the same as busy ones.

## Spot / preemptible instance {#term-13-38}



Discounted cloud capacity that can be taken back at short notice. Fine for checkpointed training, unusable for anything that cannot be interrupted.

## Bare metal vs virtualised {#term-13-39}



A whole physical machine versus a share of one. Bare metal gives predictable performance and no noisy neighbours, at the cost of flexibility.

## GPU passthrough {#term-13-40}

*vGPU*

Giving a virtual machine direct or partitioned access to a physical GPU. Necessary for accelerated workloads in virtualised environments, and it weakens isolation.

## Datacentre {#term-13-41}

*Rack, colocation*

The building full of racked servers behind every cloud service. Physical security, power and cooling are as much a part of availability as any software control.

## PUE {#term-13-42}

*Power Usage Effectiveness*

Total facility power divided by the power actually reaching the computers. A PUE of 1.1 is efficient; anything near 2 means half the energy is going on cooling and losses.

## Thermal throttling {#term-13-43}



Hardware slowing itself down to avoid overheating. The usual explanation when performance falls off partway through a long run.

## TDP {#term-13-44}

*Thermal Design Power*

The heat a chip is expected to produce, in watts. It drives cooling, power supply sizing and, at scale, the electricity bill.

## Embodied carbon {#term-13-45}



The emissions from manufacturing hardware, before it is ever switched on. For short-lived devices it can outweigh the energy used running them.

## E-waste {#term-13-46}



Discarded electronics, much of it exported and dismantled unsafely. Extending device life is both an environmental and a procurement decision.

## Right to repair {#term-13-47}



Being able to fix and upgrade hardware you own — parts, tools and documentation. Directly affects how long a device stays secure and usable.

## Hardware root of trust {#term-13-48}



An immutable component in silicon that everything else's trust chains back to. If it is compromised, no software check above it means anything.

## Spectre / Meltdown {#term-13-49}

*Speculative execution attacks*

Flaws in how processors guess ahead, letting one process read memory it should not. Fixes cost real performance and the class keeps producing new variants.

## Rowhammer {#term-13-50}



Repeatedly accessing memory rows to flip bits in neighbouring ones through electrical interference. A software attack on a physical property of RAM.

## Cold boot attack {#term-13-51}



Chilling memory chips so their contents survive a reboot long enough to be read, recovering encryption keys. Why locking a laptop is weaker than shutting it down.

## Evil maid attack {#term-13-52}



Physical tampering with an unattended device — a modified bootloader, a hardware keylogger. Full-disk encryption alone does not stop it.

## Hardware implant {#term-13-53}



A malicious component added during manufacture or shipping. Rare, extremely hard to detect, and the reason high-assurance procurement tracks provenance.

## Chip supply chain {#term-13-54}

*Fab, foundry*

The concentrated global pipeline that designs and manufactures processors. A geopolitical dependency as much as a technical one.
