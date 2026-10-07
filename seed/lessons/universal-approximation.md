## Networks as a family of functions

A fully connected network with one hidden layer of width $m$ represents

$$
f_\theta(x) = \sum_{j=1}^{m} a_j\, \sigma(w_j x + b_j) + c,
$$

with parameters $\theta = \{a_j, w_j, b_j, c\}$ and a fixed nonlinearity $\sigma$. Compare this with a classical expansion $u(x) \approx \sum_j a_j \phi_j(x)$: the difference is that the **basis functions themselves are trainable**. A finite element basis is fixed by the mesh; a network moves its basis to where the function needs it.

## What the theorem says, and what it does not

The **universal approximation theorem** (Cybenko 1989, Hornik 1991) states that for any continuous $g$ on a compact set and any tolerance $\varepsilon > 0$, there is a width $m$ and a set of parameters such that

$$
\sup_x \left| f_\theta(x) - g(x) \right| < \varepsilon.
$$

It is an *existence* result. It is silent on three questions that matter in practice:

- **How large must $m$ be?** Possibly enormous.
- **Can gradient descent find those parameters?** Not guaranteed.
- **Does the network generalise between training points?** A separate question entirely.

The video below builds the intuition for what a layer of neurons computes. Watch it before continuing if the notation above is new to you.

## Seeing it in code

```python
import torch
from torch import nn

torch.manual_seed(0)
x = torch.linspace(-1, 1, 200).unsqueeze(1)
y = torch.sin(3 * torch.pi * x)

model = nn.Sequential(nn.Linear(1, 64), nn.Tanh(), nn.Linear(64, 64), nn.Tanh(), nn.Linear(64, 1))
optimiser = torch.optim.Adam(model.parameters(), lr=1e-3)

for step in range(5000):
    optimiser.zero_grad()
    loss = ((model(x) - y) ** 2).mean()
    loss.backward()
    optimiser.step()

print(f"final mean squared error: {loss.item():.2e}")
```

Run this with widths 4, 16 and 64. The theorem promises that a large enough width works; the experiment shows you how the error actually falls and where optimisation, not capacity, becomes the limit.

## Choosing an activation for scientific problems

| Activation | Smoothness | Note for PDE work |
| --- | --- | --- |
| ReLU | $C^0$ | Second derivative is zero almost everywhere, so it cannot represent $u_{xx}$ |
| Tanh | $C^\infty$ | The standard choice for physics-informed networks |
| Sine | $C^\infty$ | Good for oscillatory solutions, sensitive to initialisation |
| GELU | $C^\infty$ | Common in neural operators |

The first row is the important one. When the loss contains derivatives of the network, the activation must be differentiable as many times as the PDE requires.

## Exercises

1. Run the script for each width and record the final error. Is the improvement monotone?
2. Replace `nn.Tanh()` with `nn.ReLU()`. Plot the fitted function and its second derivative. What do you observe?
3. Explain in two sentences why the theorem does not contradict the fact that some networks fail to fit simple functions.
