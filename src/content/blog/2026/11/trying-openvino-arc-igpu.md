---
title: "Trying OpenVINO on my ThinkPad's Arc iGPU"
description: "Intel's own AI toolkit on Intel's own laptop chip should be a perfect match. I tried three ways in, here's why I went back to SYCL."
#startDate: '2026-10-20'
pubDate: '2026-11-09'
toc: true
tags:
  - LLM
  - llama.cpp
  - intel
  - openvino
publish: true
---

Intel makes the chip in my laptop, and Intel makes [*OpenVINO*](https://docs.openvino.ai/), a toolkit to run AI models on Intel hardware: CPU, GPU and NPU from one runtime. On paper, it's the obvious way to run a small LLM on my ThinkPad. In practice, I struggled. A lot. Several times over the full month of October 2026: crashes, one silent fallback to the CPU, some requantization shenanigans before I got anything useful.

No suspense: on an empty context, OpenVINO reads prompts nearly *three times faster* than [my llama.cpp SYCL setup](https://arthurbrugiere.fr/blog/2026/11/small-coding-model-arc-igpu/). But that number needs an asterisk, and past 8k tokens the advantage is gone. Here's my journey, every wall I hit, and why I stayed on SYCL.

<figure>
    <img src="/images/2026/11/openvino-arc-igpu-llama-cpp-OpenVINO_logo.webp" alt="OpenVINO Logo" />
    <figcaption>(goofy looking) OpenVINO logo</figcaption>
</figure>

> DISCLAIMER
> I'm not a professional, I probably did a lot of things wrong and I just want to share my experience with the world. Feel free to correct me if I'm wrong anywhere, if I could test things differently, etc.
>
> The goal is for us all to learn and avoid each other's mistakes :)

## The setup

This is a side story to my [post on running a small coding model on this laptop](https://arthurbrugiere.fr/blog/2026/11/small-coding-model-arc-igpu-long-context/), so I'll keep the rig short:

| Component | |
|---|---|
| Laptop | ThinkPad E16 Gen 3 |
| CPU | Intel Core Ultra 7 255H (Arrow Lake-H) |
| GPU | Intel Arc 140T (integrated) |
| NPU | Intel AI Boost (NPU 3720) |
| RAM | 48 GiB DDR5 (5200 MT/s) |
| OS | EndeavourOS, kernel 7.2.11, `xe` GPU driver |

The model is the one I use daily: [Sharp-MiniCPM5-2B](https://huggingface.co/peculiar-ragdoll/Sharp-MiniCPM5-2B-GGUF) at Q6_K_XL, a 2B *dense* model (every parameter works for every token). My reference is llama.cpp with its [*SYCL*](https://en.wikipedia.org/wiki/SYCL) backend, Intel's general (and older) way to run compute code on its GPUs. Every llama-bench run below uses the same flags as in the main post: `-ngl 99 -fa on -t 6 -b 1024 -ub 256`, three repetitions, laptop on AC.

<figure>
    <img src="/images/2026/11/openvino-arc-igpu-llama-cpp-sharp_minicpm_banner.webp" alt="Sharp-MiniCPM5-2B banner" />
    <figcaption>Sharp MiniCPM5 2B banner</figcaption>
</figure>

What I want is simple: something faster than SYCL that still leaves me a usable laptop, and that I can plug into a coding agent. Using an Arch-based distro, I also want to test the latest technologies (especially with the hope of exploiting my NPU).

> [!NOTE]
> - *Prefill* (`pp`): reading the prompt. It's the wait before the model starts writing.
> - *Decode* (`tg`): writing the answer, one token at a time. The usual "model speed".
> - *NPU*: a small accelerator built for AI workloads,<br/>\<spoiler>*slower than the GPU but meant to sip less power*\</spoiler>.

## Door 1: llama.cpp's OpenVINO backend

llama.cpp has an OpenVINO backend. Same GGUF files, same tools, same flags. That's the cheapest experiment possible.

### First try: crash on the first prompt

My first attempt, in early October, used a pre-compiled llama.cpp release (`build 11406`) and llama-server. Both models I tried crashed on their very first request:

- [Ling-3.0-tiny](https://huggingface.co/inclusionAI/Ling-3.0-tiny-GGUF), a [*Mixture of Experts*](https://en.wikipedia.org/wiki/Mixture_of_experts) (*MoE*, a model where a router picks a few "expert" sub-networks per token):

```log
E GGML OpenVINO backend ov::Exception: Exception from src/core/src/dimension.cpp:208:
Cannot get length of dynamic dimension
```

- Sharp-MiniCPM5[^1], on an 186-token prompt:

```log
E GGML OpenVINO backend ov::Exception: [...] [GPU] The input tensor size is not equal to model [...]
```

From what I understand, OpenVINO pre-compiles the model into a fixed execution graph before running it, and both errors are about shapes that don't fit that graph. For the dense model, a newer build fixed it (see below). For the MoE, I never got it to run: its router picks different experts for every token, which seems to be exactly the opposite of what a fixed graph likes. As far as I can tell, MoE support in this backend just isn't there yet[^ling] (as of October 2026).

### Second try: OpenVINO, but slow

Some time later, the AUR had a package: `llama.cpp-openvino-bin` (build 11552). Simple to install with all the dependencies pre-configured, drop-in replacement for my running `llama.cpp-sycl-bin` (using SYCL backend), same llama-bench command. First result:

```bash
$ /usr/lib/llama.cpp-openvino/llama-bench -m Sharp-MiniCPM5-2B-Q6_K_XL.gguf -ngl 99 -fa on -t 6 -b 1024 -ub 256 -p 512 -n 256 -d 0,8192,16384,32768 -r 3 -o md
OpenVINO: using device CPU
[...]
| llama ?B Q6_K | 2.04 GiB | 2.52 B | OPENVINO | 99 | ... | pp512         | 198.54 ± 2.32 |
| llama ?B Q6_K | 2.04 GiB | 2.52 B | OPENVINO | 99 | ... | tg256         |  14.97 ± 0.74 |
| llama ?B Q6_K | 2.04 GiB | 2.52 B | OPENVINO | 99 | ... | pp512 @ d8192 |  44.70 ± 1.33 |
```

The catch is in the second line: `using device CPU`. With this backend, `-ngl 99` doesn't pick the best device automatically. Instead, I have to use an environment variable to choose where to run the model, and the default is the CPU. The device list confirms the GPU and the NPU are detected and supported, just not selected:

```bash
$ /usr/lib/llama.cpp-openvino/llama-cli --list-devices
Available devices:
  OPENVINO0: GGML_OPENVINO_DEVICE=CPU (selected) - Intel(R) Core(TM) Ultra 7 255H (47071 MiB, 47071 MiB free)
  OPENVINO1: GGML_OPENVINO_DEVICE=GPU - Intel(R) Arc(TM) Graphics (iGPU) (43796 MiB, 29496 MiB free)
  OPENVINO2: GGML_OPENVINO_DEVICE=NPU - Intel(R) AI Boost (NPU 3720) (47071 MiB, 29496 MiB free)
```

### Third try: GPU, then a crash, then a workaround

Two variables to set. One picks the GPU, the other turns on *stateful execution*, which keeps the KV cache (the model's memory of the context) inside OpenVINO's compiled model instead of passing it back and forth:

```bash
GGML_OPENVINO_DEVICE=GPU \
GGML_OPENVINO_STATEFUL_EXECUTION=1 \
llama-bench -m Sharp-MiniCPM5-2B-Q6_K_XL.gguf -ngl 99 -fa 1 -t 6 -b 1024 -ub 256 \
  -p 512 -n 256 -d 0,8192,16384,32768 -r 3 -o md
```

It crashed while compiling the model, in an optimization pass of the GPU plugin:

```log
GGML OpenVINO backend ov::Exception: [...]
[FullyConnectedHorizontalFusion] END: node: gpu_opset::FullyConnectedCompressed MatMul_1900_Qcur-0#n3 [...]
Argument shapes are inconsistent; they must have the same rank, and must have equal dimension everywhere except on the concatenation axis (axis 0).
```

That pass tries to merge several matrix multiplications into one (or something like that, I have no idea), and apparently it choked on Q6_K weights whose scales don't line up. The docs say Q6_K is supported on the GPU (converted to `Q8_0_C`), but not on my model, apparently. The workaround is a third variable:

```bash
GGML_OPENVINO_REQUANT_KQUANT=q4_asym64_all   # requantize all K-quant weights to 4-bit, groups of 64
```

It converts the K-quant weights to one common 4-bit format when loading the model[^2]. The GGUF file isn't modified, but the pre-compiled model loaded in OpenVINO on my machine is a 4-bit model, not my Q6. Keep that in mind for what follows.

### The numbers

With all three variables, it ran. Against SYCL, same file, same flags, same week:

| Sharp-MiniCPM5 | SYCL | OpenVINO GPU (4-bit) |
|---|---|---|
| Prefill, 0 Context | 800 t/s | **2,263 t/s** |
| Decode, 0 Context | 27.4 t/s | **29.6 t/s** |
| Prefill @ 8K | 503 t/s | 529 ± 162 t/s |
| Decode @ 8K | 20.4 t/s | **23.7 t/s** |
| Prefill @ 16K | **410 t/s** | 289 ± 92 t/s |
| Decode @ 16K | 18.1 t/s | **19.6 t/s** |
| Prefill @ 32K | **241 t/s** | 152 ± 59 t/s |
| Decode @ 32K | **15.4 t/s** | 14.4 t/s |

Nearly three times the prefill on an empty context is impressive, but:

- The prefill advantage is gone very quickly (at 8k), is pretty inconsistent with a huge spread between runs (±162 t/s), and OpenVINO is clearly behind at 16k and 32k (where I'd like to run my models, not crazy big context tho).
- The decode advantage is small, shrinks with depth, and flips at 32k.
- And it's a 4-bit model racing a 6-bit one. I picked Q6 precisely because 2B models get dumb quickly at 4 bits, so I didn't bother testing a native Q4 file either: on this model, a faster wrong answer isn't a win.

A coding agent spends its life beyond 8k tokens, so this is great to impress in a quick benchmark, but not really better than SYCL in real-life use.

### The NPU, for fun

The [NPU](https://en.wikipedia.org/wiki/Neural_processing_unit) (Neural Processing Unit, called *“AI Boost”* on Intel chips) is a third processor sitting next to the CPU and the GPU, built only for AI maths. It isn't designed to be fast; it's designed to be frugal: it runs things like background blur on video calls or noise cancelling all day while barely touching the battery.

Same three variables, with `GGML_OPENVINO_DEVICE=NPU`:

| | NPU |
|---|---|
| Prefill, 0 Context | 234 t/s |
| Decode, 0 Context | 10.8 t/s |
| Prefill @ 8K | 36.6 t/s |
| Decode @ 8K | `^C` |

I killed it there. Sorry you won't see more of that table.

It works, which is already something, but its decode on empty context (so where it's the fastest) is slower than on CPU, and performance drops super fast (roughly six times slower for 8k context, I need to use this machine and I don't want to know how long 32k is at sub 1t/s). Whether it uses less power is another question, and I didn't measure it.

> [!NOTE]
> What about CPU, GPU and NPU together? OpenVINO itself has modes for that (`AUTO`, `HETERO`, multi-device), but llama.cpp's backend runs on the one device you pick. So no, I couldn't combine them for one request (what I hoped to do). And splitting one token's work across devices that share the same RAM probably wouldn't help much anyway.

## Door 2: *OpenVINO GenAI*, aka the manual way

If llama.cpp's backend is a wrapper, maybe Intel's own runtime does better. [OpenVINO GenAI](https://docs.openvino.ai/) is Intel's Python library for running LLMs, and its 2026.4 release (the latest at the moment of my testing) lists MiniCPM5-2B as an early-supported model on CPU and GPU.

It doesn't read GGUF files for this model, so the path is: install it in a Python virtual environment, export the original model from Hugging Face to OpenVINO's own format (*IR*), then run it.

```bash
# Isolated environment for OpenVINO GenAI
python -m venv ./venvs
source ./venvs/bin/activate
pip install openvino-genai
pip install "transformers>=5.6" "optimum-intel[openvino] @ git+https://github.com/huggingface/optimum-intel.git"

# Export MiniCPM5-2B to OpenVINO IR, in FP16 (no 4-bit compression)
optimum-cli export openvino --model openbmb/MiniCPM5-2B --weight-format fp16 ~/models/ov-minicpm5-2b-fp16
```

OpenVINO 2026.4 saw all three devices (`['CPU', 'GPU', 'NPU']`), the export downloaded about 5 GB and went through, and I ran a small coding prompt on the GPU with `ov_genai.LLMPipeline(model_dir, "GPU")`. The library's own metrics:

| | OpenVINO GenAI, GPU, FP16 |
|---|---|
| Input tokens | 42 |
| Time to first token | ~320-336 ms |
| Time per output token | ~151 ms |
| Decode | **6.6 t/s** |

That's about four times slower than SYCL. In fairness to OpenVINO, this isn't an apple-to-apple test either:
- FP16 weights are about 5 GB, against 2 GB for my Q6 GGUF. On an iGPU where speed mostly depends on how much data moves around, being slower is expected. An INT8 or INT4 export would probably be faster.
- It's the original MiniCPM5, not the Sharp fine-tune (even though, for the inference engine, that's no different).
- MiniCPM5 support is marked early.

And the output wasn't usable. My first run, streaming tokens as they came, printed every word twice[^double]. The second one spent its whole 256-token budget thinking, even with thinking turned off in the chat template, and never got to an answer.

Even if it had worked, GenAI is a Python library, not a server. To plug it into a coding agent like [Pi](https://pi.dev/) or [OpenCode](https://opencode.ai/), I'd need OpenVINO Model Server on top. That's a lot of plumbing for a model that's four times slower, so I stopped there.

## Where it landed

| | SYCL | llama.cpp OpenVINO | OpenVINO GenAI |
|---|---|---|---|
| Runs my Q6 model as-is | Yes | Only requantized to 4-bit | No (needs an IR export) |
| Runs a MoE | Yes | Crashed | Not tried (probably not) |
| Decode, d0 | 27.4 t/s | 29.6 t/s | 6.6 t/s (FP16) |
| Prefill @ 32k | 241 t/s | 152 t/s | Not measured |
| Plugs into my agent (easily) | Yes (llama-server) | Yes (llama-server) | Needs a model server |

OpenVINO isn't bad, and that 2,263 t/s prefill shows there's real speed in there. But on my laptop and my model, every path came with a catch: the wrong device by default, a crash on my quant, a forced 4-bit quantization compatibility, a big performance spread (especially on prefill), no MoE support, and a GenAI path that's slow and not plug-and-play. I'll check again in a few releases, the backend is moving fast.

*Bref*, I wanted to find something faster and newer than SYCL that I could plug into my agent. OpenVINO is newer, was faster on an empty context only, and only by running a slimmer version of my model. So SYCL stays for now. 🤷

<!-- --- -->

[^1]: Using the fine-tuned version or the original doesn't have any impact on the rest of the testing. They are pretty much identical models (or, at least, they are for OpenVINO engine).

[^2]: Even though it's not ideal to aggressively quantize a small LLM, MiniCPM5 is recommended to run at Q4, so it's not a crazy bad thing. A little sad, but not crazy bad.

[^ling]: I didn't retry Ling on the newer build, so the MoE crash is from build 11406. If you get a MoE running on this backend, I'd love to hear how.

[^double]: Most likely my test script's fault rather than OpenVINO's: the non-streaming run printed clean (if useless) text.