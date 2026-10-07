## Networks learn smooth things first

Train a network on a target containing a slow oscillation and a fast one. The loss curve falls quickly, flattens, then creeps down. Inspecting the fit shows why: the low-frequency component is captured within a few hundred steps, while the high-frequency one takes orders of magnitude longer. This is **spectral bias**, sometimes called the frequency principle.

## A linearised view

Near initialisation, a wide network trained by gradient descent behaves like a linear model. The residual $r = f_\theta - y$ on the training points evolves as

$$
\frac{\mathrm{d} r}{\mathrm{d} t} = -K\, r, \qquad K_{ij} = \nabla_\theta f(x_i) \cdot \nabla_\theta f(x_j),
$$

where $K$ is the **neural tangent kernel**. Decomposing $r$ in the eigenvectors of $K$, each component decays independently:

$$
r_k(t) = r_k(0)\, e^{-\lambda_k t}.
$$

For standard architectures the large eigenvalues $\lambda_k$ belong to smooth, low-frequency eigenvectors. High-frequency components sit in directions with tiny eigenvalues and converge slowly.

| Frequency of component | Typical eigenvalue | Time to fit |
| --- | --- | --- |
| Low | Large | Short |
| Medium | Moderate | Long |
| High | Very small | Often longer than you will train |

## Why this is central to scientific problems

Many PDE solutions have sharp features: boundary layers, shocks, turbulent fine scales. Spectral bias means a plain network will smear them. It also interacts badly with physics-informed losses, as we will see in Module 3, because the PDE residual amplifies high frequencies by a factor $k^2$ for a second derivative.

## Remedies

**Fourier features** map the input through sinusoids before the first layer:

$$
\gamma(x) = \left[\cos(2\pi B x),\ \sin(2\pi B x)\right], \qquad B_{ij} \sim \mathcal{N}(0, \sigma^2).
$$

The scale $\sigma$ sets which frequencies are easy to learn. Too small and nothing changes; too large and the network fits noise between the training points.

```python
import torch
from torch import nn

class FourierFeatures(nn.Module):
    def __init__(self, in_dim: int, n_features: int, sigma: float):
        super().__init__()
        self.register_buffer("B", sigma * torch.randn(in_dim, n_features))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        projection = 2 * torch.pi * x @ self.B
        return torch.cat([projection.cos(), projection.sin()], dim=-1)
```

Other practical levers: normalise inputs to $[-1, 1]$, use a learning-rate schedule, and prefer smooth activations.

> **Report honestly.** When you compare a remedy against a baseline, both must be trained with the same budget and evaluated on the same held-out points. A method tuned for an afternoon will always beat a baseline run once.

## Exercises

1. Fit $y = \sin(2\pi x) + 0.5\sin(40\pi x)$ on $[0, 1]$ with a plain tanh network. Plot the fit after 100, 1000 and 10 000 steps.
2. Add the `FourierFeatures` layer with $\sigma \in \{1, 10, 100\}$. Which value works best, and how does each fail?
3. Explain why input normalisation changes the effective frequency of the target.
