## From solving to minimising

A classical solver discretises the equation and solves the resulting algebraic system. A **physics-informed neural network** (PINN) takes a different route: represent the solution by a network $u_\theta(x, t)$ and choose $\theta$ so that the equation is satisfied as well as possible.

Write the problem abstractly as

$$
\mathcal{N}[u] = 0 \ \text{ in } \Omega, \qquad \mathcal{B}[u] = g \ \text{ on } \partial\Omega, \qquad u(x, 0) = u_0(x).
$$

For the heat equation, $\mathcal{N}[u] = u_t - \alpha u_{xx}$.

## The composite loss

Sample **collocation points** in the interior, on the boundary and on the initial line. The loss is a weighted sum of three mean squared residuals:

$$
\mathcal{L}(\theta) = \underbrace{\frac{\lambda_r}{N_r}\sum_{i=1}^{N_r} \left|\mathcal{N}[u_\theta](x_i, t_i)\right|^2}_{\text{PDE residual}}
+ \underbrace{\frac{\lambda_b}{N_b}\sum_{j=1}^{N_b} \left|\mathcal{B}[u_\theta](x_j, t_j) - g_j\right|^2}_{\text{boundary}}
+ \underbrace{\frac{\lambda_0}{N_0}\sum_{k=1}^{N_0} \left|u_\theta(x_k, 0) - u_0(x_k)\right|^2}_{\text{initial}}.
$$

No labelled solution data appears anywhere. The derivatives inside $\mathcal{N}$ are computed by automatic differentiation with respect to the network inputs, exactly as in the previous module.

## A complete minimal example

```python
import torch
from torch import nn

torch.manual_seed(0)
alpha = 0.1
net = nn.Sequential(nn.Linear(2, 32), nn.Tanh(), nn.Linear(32, 32), nn.Tanh(), nn.Linear(32, 1))

def residual(x, t):
    x.requires_grad_(True)
    t.requires_grad_(True)
    u = net(torch.cat([x, t], dim=1))
    ones = torch.ones_like(u)
    (u_t,) = torch.autograd.grad(u, t, ones, create_graph=True)
    (u_x,) = torch.autograd.grad(u, x, ones, create_graph=True)
    (u_xx,) = torch.autograd.grad(u_x, x, ones, create_graph=True)
    return u_t - alpha * u_xx

def loss_fn():
    x_r, t_r = torch.rand(1000, 1), torch.rand(1000, 1)
    x_0 = torch.rand(200, 1)
    t_b = torch.rand(200, 1)
    zeros, ones = torch.zeros(200, 1), torch.ones(200, 1)

    pde = residual(x_r, t_r).pow(2).mean()
    initial = (net(torch.cat([x_0, zeros], 1)) - torch.sin(torch.pi * x_0)).pow(2).mean()
    boundary = net(torch.cat([zeros, t_b], 1)).pow(2).mean() + net(torch.cat([ones, t_b], 1)).pow(2).mean()
    return pde + initial + boundary

optimiser = torch.optim.Adam(net.parameters(), lr=1e-3)
for step in range(5000):
    optimiser.zero_grad()
    loss = loss_fn()
    loss.backward()
    optimiser.step()
```

## What a small loss does and does not mean

A low value of $\mathcal{L}$ says the residual is small **at the collocation points**. It does not, by itself, say the error $\|u_\theta - u\|$ is small. Two cautions follow.

- The residual and the error are different quantities, linked only through the stability of the PDE. For some equations a tiny residual is compatible with a large error.
- The network can satisfy the PDE residual with the wrong solution if the boundary or initial terms are under-weighted. The trivial solution $u \equiv 0$ has zero residual for the heat equation.

> **Always compare against a reference.** In the next lessons we will verify every PINN against an analytical solution or a converged classical solver, and report the error in a norm, not the loss.

## Exercises

1. Run the example and compute the relative $L^2$ error against $e^{-\alpha\pi^2 t}\sin(\pi x)$ on a $100 \times 100$ grid.
2. Set the initial-condition term to zero weight. What does the network converge to, and why?
3. For the advection equation $u_t + c\,u_x = 0$, write the residual function. How many calls to `autograd.grad` does it need?
