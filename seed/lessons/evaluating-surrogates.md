## What a surrogate is for

A surrogate replaces an expensive solver inside a larger task. It is worth using only if it is accurate enough for that task **and** cheaper once training is paid for. Both halves need evidence.

## Splits that mean something

Solutions generated from nearby parameters are highly correlated. A random split can place near-duplicates in training and test sets and report an error that will not survive contact with new inputs.

| Split | What it measures |
| --- | --- |
| Random, in-distribution | Interpolation between training samples |
| Held-out parameter range | Extrapolation in the input |
| Different resolution | Discretisation invariance |
| Different forcing or geometry | Robustness to shift |

Fix the split before training, save the indices, and never tune hyperparameters on the test set.

## Metrics

The standard metric is the mean relative $L^2$ error over the test set:

$$
\bar E = \frac{1}{N}\sum_{i=1}^{N} \frac{\left\| \mathcal{G}_\theta(a_i) - u_i \right\|_2}{\left\| u_i \right\|_2}.
$$

An average hides the tail. Also report the median, the 95th percentile and the worst case, and look at the worst samples directly. For time-dependent problems add the error as a function of rollout step: a model with one percent single-step error can diverge after fifty steps.

Physical checks are independent of any reference solution and often more revealing:

- **Conservation.** Is mass or energy conserved to the expected tolerance?
- **Boundary conditions.** What is the maximum violation on $\partial\Omega$?
- **PDE residual.** Evaluate $\mathcal{N}[\mathcal{G}_\theta(a)]$ with finite differences on the output.

## Cost, counted fully

$$
\text{break-even number of solves} = \frac{T_{\text{data}} + T_{\text{train}}}{T_{\text{solver}} - T_{\text{surrogate}}}.
$$

If you will run fewer evaluations than this, the classical solver is the faster choice overall.

```python
import time
import torch

@torch.no_grad()
def timed(model, batch, repeats=20):
    model(batch)  # warm-up
    if batch.is_cuda:
        torch.cuda.synchronize()
    start = time.perf_counter()
    for _ in range(repeats):
        model(batch)
    if batch.is_cuda:
        torch.cuda.synchronize()
    return (time.perf_counter() - start) / repeats / len(batch)
```

Time the baseline on the same hardware, at the accuracy the surrogate actually achieves. Comparing a GPU surrogate with a single-threaded solver converged to $10^{-10}$ answers a question nobody asked.

## A reporting template

| Item | Example |
| --- | --- |
| Task and data | Darcy flow, 1000 training and 200 test samples at $64^2$ |
| Split | Fixed indices, saved with the results |
| Error | Mean 1.1%, median 0.9%, 95th percentile 2.4%, worst 6.8% |
| Seeds | 3, standard deviation of the mean 0.1% |
| Cost | Data 40 min, training 25 min on one T4; inference 2 ms per sample |
| Baseline | Finite-difference solver, 0.6 s per sample at 0.5% error |
| Known failures | Error above 5% for inputs with contrast greater than 100 |

> **The last row is the most useful one.** A stated limitation tells a reader where the model can be trusted. Its absence tells them nothing.

## Exercises

1. A surrogate needs 3 hours of data generation and 1 hour of training. The solver takes 4 s per sample and the surrogate 5 ms. What is the break-even number of solves?
2. Design a held-out split for Darcy flow that tests extrapolation in permeability contrast.
3. Your model has 0.8% mean error and 14% worst-case error. Write the two sentences you would put in a report.
