## When training converges to the wrong answer

PINNs fail in characteristic ways. Recognising the pattern saves days of tuning the wrong thing.

| Symptom | Likely cause |
| --- | --- |
| Loss decreases, solution is nearly zero or constant | Boundary and initial terms dominated by the residual term |
| Smooth regions fine, sharp features smeared | Spectral bias |
| Works for small coefficients, fails as they grow | Ill-conditioned loss landscape |
| Correct at early times, wrong later | Causality violated: late times trained before early ones are right |

## Gradient imbalance

Consider the loss $\mathcal{L} = \lambda_r \mathcal{L}_r + \lambda_b \mathcal{L}_b$. The update direction is $\lambda_r \nabla_\theta \mathcal{L}_r + \lambda_b \nabla_\theta \mathcal{L}_b$. If one gradient is a thousand times larger than the other, the smaller term is effectively ignored, whatever its value.

The residual term contains second derivatives of the network. For a component of wavenumber $k$, these scale like $k^2$, so $\nabla_\theta \mathcal{L}_r$ is often far larger than $\nabla_\theta \mathcal{L}_b$. The network then finds *a* solution of the PDE that does not satisfy the boundary conditions.

## Balancing strategies

**Gradient-norm balancing** rescales the weights during training so both gradients have comparable size:

$$
\hat\lambda_b = \frac{\max_\theta \left|\nabla_\theta \mathcal{L}_r\right|}{\operatorname{mean}_\theta \left|\nabla_\theta \mathcal{L}_b\right|}, \qquad
\lambda_b \leftarrow (1 - \beta)\,\lambda_b + \beta\,\hat\lambda_b .
$$

```python
def grad_stats(loss, params):
    grads = torch.autograd.grad(loss, params, retain_graph=True, allow_unused=True)
    flat = torch.cat([g.flatten() for g in grads if g is not None])
    return flat.abs().max(), flat.abs().mean()

max_r, _ = grad_stats(loss_r, params)
_, mean_b = grad_stats(loss_b, params)
lambda_b = 0.9 * lambda_b + 0.1 * (max_r / mean_b).item()
```

Other effective measures:

- **Hard constraints**, which remove the competing terms altogether.
- **Non-dimensionalisation**, so that all quantities are of order one before training starts.
- **Causal weighting** for time-dependent problems: weight the residual at time $t$ by $\exp\left(-\epsilon \sum_{s < t} \mathcal{L}_r(s)\right)$, so later times only count once earlier ones are resolved.
- **Curriculum training**: solve an easy version first (small advection speed, low Reynolds number) and increase the difficulty gradually.

## A worked warning: advection

For $u_t + \beta u_x = 0$ with $u(x, 0) = \sin x$ on a periodic domain, a standard PINN reaches about one percent error at $\beta = 1$ and fails completely by $\beta = 30$, converging to a nearly constant function. Nothing in the loss value signals the failure: it is small in both cases. The only reliable detector is the comparison with the exact solution $u = \sin(x - \beta t)$.

> **Negative results are results.** If a configuration fails, record it with its settings. A table that lists only the runs that worked is not evidence that the method works.

## Exercises

1. Log the maximum gradient of each loss term every 100 steps for the heat-equation example. By what factor do they differ?
2. Implement gradient-norm balancing and compare the boundary error with and without it.
3. Reproduce the advection failure for $\beta \in \{1, 10, 30\}$ and report the relative $L^2$ error for each.
