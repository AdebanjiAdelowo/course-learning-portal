## Why start with equations?

Scientific machine learning sits between two traditions. Numerical analysis starts from a known equation and asks how to solve it accurately. Machine learning starts from data and asks which function explains it. Before combining them, we need a shared vocabulary for the equations themselves.

A **partial differential equation** (PDE) relates an unknown field $u(x, t)$ to its own derivatives. Three model problems cover most of what we need in this course.

| Equation | Form | Typical behaviour |
| --- | --- | --- |
| Heat (diffusion) | $u_t = \alpha\, u_{xx}$ | Smooths and decays |
| Advection | $u_t + c\, u_x = 0$ | Transports without changing shape |
| Poisson | $-\nabla^2 u = f$ | Steady state, no time |

## A problem is more than an equation

The equation alone does not determine a solution. A **well-posed problem** needs three ingredients:

1. the PDE, valid in the interior of the domain $\Omega$;
2. **boundary conditions** on $\partial\Omega$, for example a fixed value (Dirichlet) or a fixed flux (Neumann);
3. for time-dependent problems, an **initial condition** $u(x, 0) = u_0(x)$.

Hadamard's definition asks that a solution *exists*, is *unique*, and *depends continuously on the data*. The third requirement matters most to us: if a small change in the input can produce an arbitrarily large change in the output, no numerical method and no neural network will give a trustworthy answer.

> **Keep this in mind.** Every method in this course, classical or learned, is an approximation of a well-posed problem. When a model misbehaves, the first question is whether the problem you posed is the one you meant.

## A solution we can check by hand

Take the heat equation on $[0, 1]$ with $u(0, t) = u(1, t) = 0$ and $u(x, 0) = \sin(\pi x)$. Separation of variables gives

$$
u(x, t) = e^{-\alpha \pi^2 t} \sin(\pi x).
$$

Substituting back: $u_t = -\alpha\pi^2 u$ and $u_{xx} = -\pi^2 u$, so $u_t = \alpha u_{xx}$ holds exactly. We will use this solution throughout Module 1 as a **reference**: a known answer against which every solver can be measured.

![Exact solution of the heat equation at four times](/figures/heat-decay.svg "The sine profile keeps its shape and decays at the rate exp(-απ²t).")

```python
import numpy as np

def exact_heat(x, t, alpha=1.0):
    """Reference solution for u_t = alpha * u_xx with u(x, 0) = sin(pi x)."""
    return np.exp(-alpha * np.pi**2 * t) * np.sin(np.pi * x)

x = np.linspace(0.0, 1.0, 5)
print(exact_heat(x, t=0.1))
```

## Exercises

1. Verify by substitution that $u(x, t) = e^{-4\alpha\pi^2 t}\sin(2\pi x)$ also solves the heat equation with the same boundary conditions. What does the factor of 4 tell you about high-frequency components?
2. The backward heat equation $u_t = -\alpha u_{xx}$ is a classic ill-posed problem. Using the solution above with $\alpha$ replaced by $-\alpha$, explain which of Hadamard's conditions fails.
3. Write down a complete, well-posed problem for the temperature in a rod that is insulated at both ends.
