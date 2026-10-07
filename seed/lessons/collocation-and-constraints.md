## Where to put the points

The PDE residual is enforced only where we sample it, so the choice of collocation points is part of the method.

| Strategy | How | When it helps |
| --- | --- | --- |
| Uniform grid | Fixed lattice | Simple; risks aliasing with the solution |
| Uniform random | Resample every step | Good default, acts as regularisation |
| Latin hypercube / Sobol | Low-discrepancy sequence | Better coverage for a fixed budget |
| Residual-adaptive | Add points where $|\mathcal{N}[u_\theta]|$ is large | Sharp fronts, boundary layers |

![Uniform random and residual-adaptive collocation points](/figures/collocation.svg "Left: uniform sampling. Right: points concentrated near a steep front, where the residual is largest.")

Residual-adaptive refinement (RAR) repeats a simple loop: train, evaluate the residual on a dense candidate set, add the worst points to the training set, continue.

```python
import torch

def refine(residual_fn, points, n_candidates=10_000, n_add=200):
    candidates = torch.rand(n_candidates, points.shape[1])
    with torch.enable_grad():
        scores = residual_fn(candidates).abs().squeeze()
    worst = torch.topk(scores, n_add).indices
    return torch.cat([points, candidates[worst].detach()])
```

## Soft and hard constraints

So far the boundary and initial conditions have been **soft**: penalty terms the optimiser may trade against the residual. The alternative is to build them into the network so they hold exactly, whatever the parameters.

For $u(0, t) = u(1, t) = 0$ and $u(x, 0) = u_0(x)$, use the ansatz

$$
u_\theta(x, t) = u_0(x) + t\, x (1 - x)\, N_\theta(x, t),
$$

where $N_\theta$ is an unconstrained network. At $t = 0$ the second term vanishes, so the initial condition holds. At $x = 0$ and $x = 1$ the factor $x(1 - x)$ vanishes, and $u_0$ already satisfies the boundary values.

```python
def u_hard(net, x, t):
    raw = net(torch.cat([x, t], dim=1))
    return torch.sin(torch.pi * x) + t * x * (1 - x) * raw
```

The loss now has a single term, the PDE residual, and there are no weights to tune between competing objectives.

| | Soft constraints | Hard constraints |
| --- | --- | --- |
| Implementation | Trivial | Needs a problem-specific ansatz |
| Boundary error | Small but non-zero | Exactly zero |
| Loss balancing | Required | Not needed |
| Complex geometry | Easy | Needs a distance function |

## Periodic boundaries

Periodicity can also be imposed exactly, by feeding the network periodic features of the coordinate instead of the coordinate itself:

$$
x \mapsto \left(\cos\frac{2\pi x}{L},\ \sin\frac{2\pi x}{L}\right).
$$

Every function of these features is automatically $L$-periodic in $x$, including all its derivatives.

## Exercises

1. Verify by hand that the ansatz above satisfies all three conditions for any $N_\theta$.
2. Rewrite the example from the previous lesson with hard constraints. Compare the error after the same number of steps.
3. Propose a hard-constraint ansatz for $u(0) = a$, $u(1) = b$ in a one-dimensional steady problem.
