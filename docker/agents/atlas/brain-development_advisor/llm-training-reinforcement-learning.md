# LLM Training, Reinforcement Learning, and RLVR

Last updated: 2026-06-08 (Batch 10 — scaling heuristics, training diagnostics, inference mechanics, reasoning model architecture)

## The Paradigm Shift: SFT to RLVR

The dominant LLM training paradigm is undergoing a fundamental transition. **Supervised Fine-Tuning (SFT)** relies on static conversational datasets — the model learns to mimic human responses. **Reinforcement Learning with Verifiable Rewards (RLVR)** instead uses dynamic environments where the model generates reasoning traces and answers that are verified against ground truth, producing a reward signal.

Andrej Karpathy captured the core insight: *'Environments give the LLM an opportunity to actually interact, take actions, see outcomes. This means you can hope to do a lot better than statistical expert imitation.'*

Unlike SFT, which constrains models to imitate a fixed data distribution, RLVR allows models to discover novel strategies through exploration. The model is not copying an expert — it is learning to reason by receiving feedback on outcomes.

As LLMs gain tool-use capabilities and are deployed as agents, the training paradigm must shift from mimicking static conversations to learning through interactive, dynamic environments. SFT datasets cannot encode what it means to successfully use tools, navigate multi-turn environments, or recover from errors.

---

## Core Concept: Reinforcement Learning with Verifiable Rewards (RLVR)

RLVR is an LLM training paradigm where:
1. The model generates a reasoning trace and an answer
2. The answer is automatically verified against a ground truth (or deterministic rules)
3. The verification produces a reward signal
4. The model's policy is updated based on this signal

The key requirement: rewards must be **verifiable** — objectively correct/incorrect, not subjectively rated. This is why RLVR works well on math, code, logic puzzles, and game-playing, but requires more sophisticated reward design for subjective tasks.

---

## Mapping RL Concepts to LLMs

In the context of LLM reinforcement learning, classic RL components map as follows:

- **Agent**: The LLM itself
- **Environment**: The data, harnesses, and scoring rules it interacts with
- **Actions**: The model's text responses (tokens generated)
- **Rewards**: Quality signals from the environment (correctness, format compliance, task success)
- **Trajectory / Rollout**: A complete sequence of model outputs and environmental responses through a task

This mapping is not just conceptual — it is the engineering framework that structures how RLVR training infrastructure is built.

---

## The SFT-then-RL Training Pipeline for Small Models

When training small models for complex tasks via RL, a two-phase pipeline is often necessary:

1. **SFT Warm-Up Phase**: Generate synthetic training data via the RL environment (task prompts + ground truth), then fine-tune the base model on this data. This teaches the model basic format compliance and mechanical task mechanics before RL exploration begins.
2. **RL Training Phase**: With the SFT-warmed model, begin RLVR training. The model now has the format and mechanics needed to explore effectively without collapsing into gibberish.

Small models often struggle with format compliance and basic mechanics when dropped directly into RL. Without the SFT warm-up, the model cannot generate structured outputs required to receive meaningful reward signal, leading to training instability or collapse.

### Outperforming Large Models via RL-Trained Small Specialized Models

A small specialized model can outperform a large closed model on specific tasks using SFT warm-up followed by RLVR. For example, a small open model (LFM-2) trained with SFT and RL (using the CISPO algorithm) outperformed GPT-4o on specific game benchmarks — a task where the training domain was sufficiently narrow and the verification signal was sufficiently clear.

The principle: narrow domain + verifiable rewards + RL training = specialized performance exceeding much larger general-purpose models.

---

## Group Relative Policy Optimization (GRPO)

GRPO is a reinforcement learning training technique where:
1. Multiple rollouts are initiated from the same starting state
2. Each rollout is scored using deterministic reward functions
3. An average score is calculated for the group
4. The model's advantage is computed relative to the group average (how much better/worse than average did this rollout perform?)
5. The policy is updated to increase the probability of above-average rollouts

GRPO is particularly efficient because it computes advantages from within-batch rollout comparisons rather than requiring a separate value model. This reduces the training infrastructure complexity significantly compared to methods like PPO.

---

## Noise Reduction in RL Training Environments

Reliable RLVR training requires that reward differences reflect model behavior, not environmental randomness. Three key noise reduction strategies:

1. **Deterministic seeds**: Use fixed example seeds to make environment behavior deterministic for identical states across rollouts. The same input should produce the same environmental response regardless of which rollout batch it appears in.
2. **Turn-specific reward derivation**: Derive reward signals from specific turns in multi-turn environments rather than from overall episode averages. This produces tighter attribution between specific model behaviors and their reward consequences.
3. **Controlled opponent behavior**: In adversarial or multi-agent environments, control opponent behavior precisely. Hidden biases in opponent behavior (e.g., an opponent bot always choosing the first available move among equally-scored options) can cause the model to memorize specific opponent patterns rather than learning generalizable strategies — producing high benchmark scores that mask real-world performance gaps.

---

## RL Batch Size Calibration

In RL training for LLMs, batch size is critical for training stability:

- **Too small** (below ~256): Combined with diverse environments, leads to unstable training or model collapse. The model learns from too few scenarios at once, reinforcing suboptimal strategies.
- **Too large**: Diminishing returns, but generally safer than too-small.

The practical guideline: batch size calibration must be validated empirically against the specific environment diversity. Higher environment diversity requires larger batch sizes to maintain training stability.

---

## Base Model Selection for RL Reasoning

When training LLMs for reasoning tasks using RL, starting with pre-existing reasoning models is often counterproductive. Their long thinking traces frequently get truncated under GPU memory constraints, wasting compute budget and corrupting reward signals.

A more efficient approach: start with a standard **instruct model** and train it to develop its own reasoning style from scratch via RL. This avoids the truncation problem and allows the model to develop concise, task-adapted reasoning patterns rather than inheriting the verbose reasoning style of a larger pre-trained reasoner.

---

## Temperature-Driven Exploration in LLM RL

In LLM reinforcement learning, temperature acts as a control for exploration vs. exploitation:

- **Low temperature**: Model exploits its current best strategy. Risk of getting stuck in local optima.
- **Higher temperature**: Model explores alternative strategies, potentially escaping suboptimal learned patterns. Risk of gibberish at extreme values.

A healthy exploration phase is often characterized by temporary performance degradation as the model experiments with new strategies before converging on better ones. Teams that reduce temperature at the first sign of performance dip prevent this exploration and get trapped in local optima.

**Practical protocol**: Monitor for systematic performance degradation (indicating stuck-in-local-minima) vs. exploration noise. Increase temperature selectively when benchmarks indicate the model has settled into a suboptimal strategy.

---

## Dual-Phase RL Model Evaluation

Proper evaluation of LLMs undergoing RL training requires two phases:

1. **Pre-training manual evaluation**: Evaluate base models in the environment manually before training. This identifies promising baseline behaviors and validates the environment itself before investing training compute.
2. **Post-training real-world testing**: After training, test the model on the actual real-world task (not just benchmark proxies) to confirm that benchmark improvements translate to genuine capability gains.

This dual-phase approach prevents two failure modes: (1) training on a broken or biased environment that produces high benchmarks but poor real-world performance; (2) discovering too late that training-time improvements don't transfer to the deployment setting.

---

## Opponent Difficulty Curriculum

In game-playing or adversarial RL environments, training exclusively against perfect opponents produces overly defensive behavior — the model learns to survive rather than to win. To build robust offensive and strategic performance, implement a **difficulty curriculum**:

- Mix opponent skill levels during training (e.g., 0-25% probability of random moves from the opponent)
- Gradually increase opponent difficulty as the model improves
- Use the exploration-exploitation balance to determine when to advance the curriculum

---

## RL Environment Design Patterns

### Single-Turn RL Environment Pattern

A centralized entry point loads datasets, initializes parsers, and bundles weighted reward functions into a rubric. To account for model variability and sampling randomness during evaluation, this pattern executes multiple rollouts per example and aggregates their rewards. The weighted rubric enables multi-dimensional evaluation (e.g., 40% format compliance, 60% correctness) in a single training pass.

### Multi-Turn and Tool-Enabled RL Environment Patterns

Multi-turn RL environments extend single-turn setups with:
- **State tracking**: A dictionary updated during rollouts that persists information across turns
- **Environment response method**: Enables message exchange between model and environment
- **Stop decorator**: Checks termination conditions after each turn (goal achieved, max turns reached, invalid state)

Tool environments build on this by exposing Python functions as callable tools, mapping function names to implementations, and generating tool schemas from function signatures. The agent can call tools during its reasoning, and the environment handles tool execution and response injection.

### Advanced RL Environment Architectures

1. **MCP environments**: Auto-connect to Model Context Protocol servers, giving RL agents access to external tools and data sources during training
2. **Stateful tool environments**: Maintain persistent per-rollout state (e.g., database connections or session IDs) that survives across multiple tool calls within a single rollout
3. **Recursive LM environments**: Enable meta-learning patterns where the agent itself can spawn sub-agents or call other LLMs during the RL rollout

---

## Non-Terminating Penalties in Reward Design

When designing reward functions for RL (especially for smaller models), applying a **penalty for invalid moves or errors** instead of immediately terminating the environment provides a richer learning signal. This allows the model to:
- Continue the rollout and explore subsequent states after making a mistake
- Observe the downstream consequences of the error
- Learn recovery strategies in addition to prevention strategies

Immediate termination on error truncates the learning signal — the model only learns 'don't do that,' not 'if you do that, here's how to recover.'

---

## The Verifiers Framework

Verifiers is an open-source library (by Prime Intellect) designed to build modular, distributable RL environments for LLM agents. It provides base classes for:
- Single-turn, multi-turn, and tool-calling environments
- Model Context Protocol (MCP) environments
- Stateful tool environments
- Recursive/meta LM environments

The framework explicitly combats **environment fragmentation** — the anti-pattern where RL environments are locked into specific, proprietary training stacks, preventing portability and reuse. By packaging RL environments as independent, distributable modules, Verifiers enables:
- Environment sharing across teams and organizations
- Training on the same environment across different model architectures
- Reproducible, portable RL research

---

## Environment Fragmentation: The Anti-Pattern to Avoid

Environment fragmentation is the condition where RL environments are locked into specific proprietary training stacks, preventing portability and reuse. The consequences:
- Teams rebuild equivalent environments from scratch independently
- Benchmark results become non-comparable across stacks
- Training insights cannot be shared as reusable infrastructure

The mitigation: design RL environments as independent, versioned modules with clean interfaces — the same portability principle that applies to agent skills applies to RL environments.

---

## Connection to Vibey

- **RLVR as the future of skill optimization**: Vibey's skills are currently prompt-engineered. RLVR offers a path to systematically improving skills through verifiable outcome feedback — if an output can be scored (did the funnel page convert? did the email sequence get opens?), it can be a reward signal.
- **The SFT-then-RL pipeline** mirrors the IP Architect methodology: 'do the process first in conversation, then encode it as a skill.' SFT is the 'do it in conversation' phase; RL is the systematic improvement phase that follows.
- **Environment design as IP encoding**: The RL environment (its reward functions, data distribution, and evaluation rubric) is encoded methodology — it embeds what 'good' means for a specific task. Designing the environment IS designing the IP.
- **GRPO's within-batch comparison** is analogous to Vibey's multi-rollout approach for critical outputs: generating multiple variants and selecting the best is a manual GRPO — formalizing it via RL automates the selection.
- **Non-terminating penalties** are the RL equivalent of the Vibey principle that agents should be allowed to recover rather than fail hard: preserve the learning signal, don't cut off the process at the first mistake.
- **The Verifiers portability principle** maps to Vibey's skill distribution architecture: skills should be portable, versioned modules — not locked to a specific agent or workflow implementation.


## Training LLMs from Scratch: Architecture and Data Decisions

*Integrated: 2026-06-08 Batch 9 — from Angelos Perivolaropoulos (Speech-to-Text Lead, ElevenLabs)*

### The Four Building Blocks of Training an LLM from Scratch

Training a language model from scratch relies on four essential building blocks:
1. **Tokenizer** (the most critical decision, determining training speed and data requirements)
2. **Model Architecture** (largely commoditized decoder-only transformers in 2025+)
3. **Training Data** (quality and coverage of token bigrams is the primary constraint)
4. **Training Loop** (where the real differentiation lives in modern models)

### Tokenizer Design as the Primary Bottleneck in LLM Development

Tokenizer selection is the most critical and time-consuming decision when building a language model. ElevenLabs spends roughly six months designing the tokenizer compared to only two months on model architecture for new Text-to-Speech (TTS) models. Tokenizer size must align with the use case: large vocabulary sizes require proportionally large training datasets to cover all bigram combinations.

### Training Methodology Over Model Architecture as the Key AI Differentiator

Modern LLM architectures have become largely commoditized, with newer models focusing on optimizations for context length and scaling rather than core structural changes. The primary differentiator between model generations (such as GPT-4 vs. GPT-4o) lies in the training loop — specifically how fine-tuning, RLHF, and post-training alignment shape the model's behavior and capabilities.

### The Bigram Rule for Tokenizer Training Data

To train a language model effectively from scratch, the training data must expose the model to as many token bigram combinations as possible. For a tokenizer with N tokens, the training dataset should contain at least N^2 data points (bigrams) to ensure adequate coverage and robust learning. This scales non-linearly: doubling the vocabulary size quadruples the minimum data requirement.

---

## Transformer Architecture Deep Reference

*Integrated: 2026-06-08 Batch 9 — internal mechanics for LLM evaluation and skill design*

### The Four Internal Building Blocks of Transformer Architecture

A standard transformer block is composed of four core components:
1. **Multi-Head Self-Attention**: Allows the model to map relationships between tokens. Multiple heads attend to different aspects (e.g., grammar, punctuation, semantics). Each attention head adds approximately $4 \times d_{model}^2$ parameters.
2. **Layer Normalization**: Stabilizes training by normalizing activations before each sub-layer. Reduces internal covariate shift and accelerates convergence.
3. **Feed-Forward Network (FFN)**: A two-layer MLP that typically uses a 4x hidden-layer expansion (e.g., hidden dim 768 → 3072). The FFN is typically the largest parameter contributor per transformer layer, comprising approximately 8x the model dimension squared in parameters.
4. **Residual Connections**: Allow gradients to flow directly through the network, preventing vanishing gradients during deep training. Enable each layer to learn residual corrections rather than complete transformations.

### Transformer Parameter Distribution and Calculation

In a standard GPT-2 style transformer architecture, parameters scale predictably across layers. The attention mechanism per layer requires approximately $4 \times d_{model}^2$ parameters (representing query, key, value, and output projections). The MLP block typically dominates the layer's parameter count, comprising approximately $8 \times d_{model}^2$ parameters (using a 4x hidden dimension expansion). For a model with L layers and a hidden dimension of d, the total parameter count scales approximately as $12 \times L \times d^2$.

### The Embedding Layer Bottleneck in Small Model Design

When designing small-scale language models, pairing a large vocabulary tokenizer (such as GPT-2's 50,000 tokens) with a small hidden dimension (e.g., 384) causes the embedding layer to disproportionately dominate the model's parameter count — sometimes making it up to 3x larger than the rest of the model. The fix: either use a smaller vocabulary tokenizer matched to the model scale, or use weight tying (sharing embedding and unembedding weights) to prevent parameter waste.

### Trade-offs of Character-Level Tokenization

Character-level tokenization minimizes vocabulary size and simplifies bigram coverage during training, making it easy to train on small datasets. However, it scales poorly because models struggle to learn semantic correlations between individual characters compared to subword tokens. Additionally, character-level tokenization significantly increases sequence length for the same text, increasing computational cost and reducing the effective context window.

### The Training Methodology as the Key Differentiator (Applied Context)

For practitioners evaluating AI models (as opposed to training them), the architecture details matter less than the training methodology and alignment techniques applied. The 'same architecture, different training loop' pattern means two models with identical transformer blocks can behave completely differently in production — one optimized for safety, one for capability, one for a specific domain. Evaluating models for deployment in specific contexts should focus on post-training alignment and fine-tuning behavior, not architecture comparisons.

---

## LLM Scaling Heuristics and Training Mechanics

*Integrated: 2026-06-08 Batch 10*

### LLM Scaling Heuristics for Reasoning and Context

To scale an LLM's reasoning capabilities, prioritize increasing layers, attention heads, and context length while keeping the embedding dimension relatively stable. Scaling context length cannot be done naively without architectural modifications due to quadratic memory constraints from full attention. Flash attention, sliding window attention, and ring attention are common mitigation strategies. Increasing depth (layers) is typically more compute-efficient for reasoning capability than increasing width (embedding dimension) alone.

### Learning Rate Scheduling Protocol for LLM Training

A robust learning rate strategy starts with the highest stable learning rate, uses a short warm-up phase (~100 steps) to let weights settle, then applies cosine decay down to a near-zero value. Typically implemented with AdamW. The warm-up prevents instability from large gradient steps on randomly initialized weights.

### The Non-Zero Cosine Decay Principle

When configuring cosine decay for learning rates, avoid decaying completely to zero. Keeping a small residual learning rate (~1-10% of peak) at cycle end ensures the model remains adaptable and makes restarting feasible without re-warming from scratch.

### LLM Training Diagnostic Signals

Specific loss curve patterns diagnose underlying issues:
1. **Train loss not decreasing**: code bug, backward pass likely broken
2. **Train loss down, validation loss up**: overfitting, model memorizes rather than generalizes
3. **Sudden spikes in loss**: corrupted data pipeline batch or unstable learning rate
4. **Loss plateauing early**: learning rate too low, or capacity ceiling hit for the dataset

### Character-Level Loss Progression Benchmarks

During character-level LLM training (vocab size ~65), loss values correlate with capability emergence: ~4.17 = random guessing; ~3.3 = learning bigrams like 'th'; ~2.5 = short common words; ~1.5-2.0 = word structure and basic syntax; <1.5 = coherent phrase generation beginning. These benchmarks are specific to character-level tokenization.

### Architectural Equivalence of Reasoning Models

Reasoning models share the exact same base transformer architecture as standard LLMs. The 'reasoning' capability is unlocked entirely through post-training with high-quality chain-of-thought data, not architecture changes. Even small older models (Llama 1B) can become reasoning models through post-training. The architecture is commodity; the training data and loop are the differentiator.

### Token-Based Mechanism of AI Reasoning

Reasoning models generate hidden 'reasoning tokens' into their own context window, writing logical working step-by-step, then use self-attention to reference these tokens when producing the final response. This is why reasoning mode costs more: the model thinks on paper before answering.

### Post-Training Data as the Primary Capability Driver

Rapid leaps in LLM reasoning benchmarks are primarily driven by improvements in post-training datasets (high-quality chain-of-thought data), not architecture changes. Two identical transformers with different post-training pipelines behave completely differently. Evaluate models for deployment on post-training alignment quality, not raw architecture.

---

## LLM Inference Mechanics: Decoding Strategies and Determinism

*Integrated: 2026-06-08 Batch 10*

### Greedy Decoding in LLM Inference

Greedy decoding always selects the highest-probability token from the logit distribution. Repetitive and uncreative, but highly effective for deterministic tasks like transcription and speech-to-text where creativity is undesirable. The correct default for evaluation and reproducibility testing.

### Temperature Sampling Dynamics

Temperature controls the sharpness of the token probability distribution. Lower temperature narrows it (more deterministic); higher temperature flattens it (more creative, less coherent). 0.7 is widely cited as the optimal balance for creative yet coherent generation. Higher temperatures risk prematurely predicting end-of-text tokens, causing generation to stop abruptly.

### Top-K Sampling as a Safety Guardrail

Top-K sampling restricts token selection to the top K most likely candidates, preventing the model from selecting highly improbable tokens that might be chosen by chance at high temperatures. Top-K and temperature are typically used together rather than as alternatives.

### Achieving LLM Determinism via Seeds

LLM inference is inherently non-deterministic due to GPU-level random number generation. Setting a seed forces consistent values across runs, enabling reproducibility and debugging. Seeds should be used even with greedy decoding to eliminate hidden sources of system randomness.

---


## Inference Speed, Speculative Decoding, and Data Efficiency

*Integrated: 2026-06-08 Batch 12*

### Inference Speed as a Ceiling on Peak Intelligence

Inference speed (tokens per second) is not merely a cost or convenience lever — it is a core capability. In reasoning models where performance scales with thinking time, the speed of token generation directly dictates the **ceiling of the model's peak intelligence**. A faster inference layer with the same model weights produces qualitatively smarter reasoning because more thinking tokens can be generated within the same wall-clock window.

This has direct implications for Vibey's Delphi speed problem: the 1.5-2 minute response times are not just a UX issue. They are a capability ceiling. The model being used at 2-minute latency is, effectively, less intelligent than the same model used at 3-second latency for reasoning-heavy tasks.

### The Computational Asymmetry of LLM Generation and Verification

In transformer architectures, **verifying a sequence of tokens is computationally cheaper than generating them**. Generation must happen autoregressively (one token at a time), whereas verification can process multiple tokens in parallel in a single forward pass. This asymmetry is the foundational exploit behind speculative decoding: use a smaller, faster draft model to generate candidates, then verify them in parallel with the target model.

### Speculative Decoding (Standard)

A latency optimization technique that runs two models in parallel:
1. A small, fast **draft model** generates candidate tokens
2. The large **target model** verifies them in a single forward pass (leveraging the computational asymmetry above)
3. If the target model accepts the draft tokens, the step is taken; if it rejects them, it generates its own token from the rejection point

Result: multiple tokens per forward pass of the large model, reducing effective per-token latency significantly.

### Speculative Streaming Decoding (SSD) — Advanced Technique

An advanced inference optimization that **parallelizes the drafting and verification phases across separate hardware**. Instead of waiting for the target model's verification of round T to finish before starting round T+1, the draft model anticipates likely verification outcomes and begins generating the next candidate sequence speculatively. This eliminates the serial dependency between draft and verification rounds:

- Standard speculative decoding: draft → verify → draft → verify (serial)
- SSD: overlapping draft and verify pipelines (parallel)

SSD delivers simultaneous improvements in both **latency and throughput** — unlike vanilla speculative decoding which typically only improves latency. These gains come from algorithmic optimization rather than systems engineering.

### The Shift from Pre-Training to Inference Compute via Reinforcement Learning

Reinforcement Learning (RL) training compute is beginning to **exceed pre-training compute**. Because RL functions essentially as a wrapper on top of inference, optimizing inference performance has become critical not just for serving models but for training them. This shifts the infrastructure investment thesis: inference optimization is no longer a serving concern — it is a training concern.

Implication: the organizations that invest in inference acceleration today are building a training advantage for tomorrow.

### The Intelligence Per Sample Bottleneck in AI Scaling

As internet text grows at only ~3% annually while pre-training compute scales 4-5x per year, the compute-per-data-point increases roughly 4x year-over-year. This shifts the primary bottleneck of AI development from raw compute to **data efficiency** ('intelligence per sample') and energy efficiency ('intelligence per joule').

The practical consequence: model quality improvements are increasingly constrained by data quality and diversity rather than by raw compute. Throwing more GPU hours at a fixed, lower-quality dataset produces diminishing returns at a faster rate than before.

### Aggressive Regularization Protocol for Data-Constrained Pre-Training

When pre-training models under strict data constraints but unlimited compute, standard scaling recipes lead to overfitting in larger models. To maintain a clean power law scaling and reach optimal performance asymptotes, apply aggressive regularization:
- Scale **weight decay up to 30x larger** than standard recipes
- Increase dropout rates
- Add noise injection during training

This prevents the model from memorizing the limited data and maintains generalization capacity across scales. The protocol produces a clean power law scaling curve even under data-constrained conditions.

### Ensembling Smaller Models to Bypass Data Constraints

In compute-matched, data-constrained scenarios, training and ensembling **multiple smaller models** (e.g., five 300M-parameter models) outperforms a single large model (e.g., one 1.5B-parameter model). This approach yields clean power laws with **lower asymptotes** than regularization alone, offering a viable path to better performance at the same effective compute budget.

The mechanism: ensemble diversity compensates for individual model overfitting on limited data. Each model in the ensemble sees slightly different training batches and develops different local optima, which cancel out in the aggregate predictions.
## Connection to Vibey (LLM Architecture Layer)

- **Tokenizer design as primary bottleneck** is relevant to evaluating any custom or fine-tuned models Vibey might deploy: the tokenizer determines vocabulary coverage of domain-specific terms (marketing copy, funnel language, business jargon). A mismatch between tokenizer vocabulary and the deployment domain degrades performance even with a capable base model.
- **Training methodology over architecture** is the practical evaluation framework for selecting models for Vibey's skills: the training loop, RLHF quality, and fine-tuning focus matter more than raw parameter count when choosing between comparable models for specific skill tasks.
- **The transformer parameter distribution reference** is useful for understanding why model scaling behaves as it does: knowing that the FFN dominates parameter count helps explain why larger models are more expensive per token and why MoE models (which activate only a fraction of the FFN) achieve efficiency gains.
- **Character-level tokenization trade-offs** are a cautionary reference: any domain-specific fine-tuning or custom tokenizer work should default to subword tokenization to preserve semantic coherence and avoid sequence length explosion.
- **The four transformer building blocks** provide the conceptual foundation for understanding why context windows, attention heads, and layer depth produce the capability patterns Vibey relies on.
- **Greedy decoding** is the right choice for Vibey's evaluation/benchmarking runs on skills: reproducible, deterministic output enables fair comparison between skill versions.
- **Temperature and top-K guidance** informs Vibey's skill defaults: 0.7 temperature is a reasonable starting point for creative content skills; lower temperatures (~0.3) are better for factual extraction or structured output skills.
- **Seed-based determinism** is a reliability tool for Vibey's testing infrastructure: setting seeds during skill evaluation ensures that differences in output quality reflect skill changes, not sampling randomness.