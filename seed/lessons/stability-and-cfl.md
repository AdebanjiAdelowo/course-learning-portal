## An accurate scheme can still fail

Discretise the heat equation $u_t = \alpha u_{xx}$ with a forward difference in time and a central difference in space. Writing $u_i^n \approx u(x_i, t_n)$:

$$
u_i^{n+1} = u_i^n + r\left(u_{i+1}^n - 2u_i^n + u_{i-1}^n\right), \qquad r = \frac{\alpha\,\Delta t}{\Delta x^2}.
$$

This is the **FTCS** scheme (forward time, centred space). Each formula is consistent, so we might expect the result to converge as the grid is refined. It does, but only when $r$ is small enough.

![Stable and unstable FTCS solutions](/figures/ftcs-stability.svg "With r = 0.45 the scheme follows the exact solution. With r = 0.55 a perturbation of size 1e-6 in the initial data grows to dominate within 160 steps.")

## Von Neumann analysis

Insert a single Fourier mode $u_i^n = G^n e^{\mathrm{i} k x_i}$ into the scheme. The mode is multiplied each step by the **amplification factor**

$$
G(k) = 1 - 4r \sin^2\!\left(\frac{k\,\Delta x}{2}\right).
$$

Errors stay bounded when $|G| \le 1$ for every wavenumber. The worst case is $\sin^2 = 1$, which gives the stability condition

$$
r = \frac{\alpha\,\Delta t}{\Delta x^2} \le \frac{1}{2}.
$$

The consequence is severe: halving $\Delta x$ forces $\Delta t$ to shrink by a factor of four. For advection, $u_t + c\,u_x = 0$, the analogous restriction is the **Courant-Friedrichs-Lewy (CFL) condition**

$$
C = \frac{|c|\,\Delta t}{\Delta x} \le 1,
$$

which says the numerical domain of dependence must contain the physical one: information may not travel more than one cell per step.

## Lax equivalence

For linear problems the three ideas of this module fit together in one statement:

> **Consistency + stability = convergence.** A consistent scheme for a well-posed linear problem converges if and only if it is stable.

```python
import numpy as np

def ftcs(u0, r, steps):
    """Advance the heat equation with fixed zero boundary values."""
    u = u0.copy()
    for _ in range(steps):
        u[1:-1] += r * (u[2:] - 2 * u[1:-1] + u[:-2])
    return u

x = np.linspace(0.0, 1.0, 41)
for r in (0.45, 0.55):
    u = ftcs(np.sin(np.pi * x), r, steps=400)
    print(f"r = {r}: max |u| = {np.abs(u).max():.3e}")
```

## Why this matters for machine learning

Learned solvers inherit these constraints in disguise. A network that rolls a state forward in time is an explicit scheme, and its rollouts can be unstable for the same reason FTCS is. When we evaluate surrogates in Module 4, long-rollout stability will be one of the tests.

## Exercises

1. Derive $G(k)$ by substituting the Fourier mode into the FTCS update.
2. Run the script. For $r = 0.55$, which wavenumber grows fastest, and does that match what you see in the solution?
3. The implicit (backward Euler) scheme has $G = 1 / (1 + 4r\sin^2(k\Delta x / 2))$. What does this say about its stability, and what do you pay for it?
