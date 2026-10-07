## Three ways to differentiate a program

Physics-informed learning needs derivatives of a network's output with respect to its *inputs*, not only its parameters. There are three ways to get them.

| Method | Idea | Weakness |
| --- | --- | --- |
| Numerical | $\dfrac{f(x + h) - f(x)}{h}$ | Truncation and rounding error (Module 1) |
| Symbolic | Manipulate the expression | Expression swell; awkward for programs with control flow |
| Automatic | Apply the chain rule to each elementary operation | Memory, in reverse mode |

**Automatic differentiation** (AD) is exact to rounding error and costs a small constant multiple of evaluating the function. It is neither a finite difference nor a symbolic formula.

## The computational graph

Any program is a composition of elementary operations. For $y = \sin(x_1 x_2) + x_1^2$:

$$
v_1 = x_1 x_2, \quad v_2 = \sin(v_1), \quad v_3 = x_1^2, \quad y = v_2 + v_3.
$$

**Forward mode** carries a derivative alongside each value, from inputs to outputs. One pass gives the derivative with respect to *one input*.

**Reverse mode** first evaluates the program, then propagates sensitivities $\bar v_i = \partial y / \partial v_i$ from the output back to the inputs:

$$
\bar v_2 = 1, \quad \bar v_3 = 1, \quad \bar v_1 = \bar v_2 \cos(v_1), \quad \bar x_1 = \bar v_1 x_2 + 2 x_1 \bar v_3, \quad \bar x_2 = \bar v_1 x_1.
$$

One pass gives the derivative of *one output* with respect to every input. A loss is a single number depending on millions of parameters, which is why training uses reverse mode. Backpropagation is reverse-mode AD applied to a network.

> **Rule of thumb.** For $f : \mathbb{R}^n \to \mathbb{R}^m$, forward mode costs about $n$ passes for the full Jacobian and reverse mode about $m$. Choose by which is smaller.

## Derivatives with respect to inputs

```python
import torch

x = torch.linspace(0, 1, 5, requires_grad=True).unsqueeze(1)
u = torch.sin(torch.pi * x)

# create_graph=True keeps the graph so we can differentiate again.
(u_x,) = torch.autograd.grad(u, x, torch.ones_like(u), create_graph=True)
(u_xx,) = torch.autograd.grad(u_x, x, torch.ones_like(u_x), create_graph=True)

print(torch.allclose(u_xx, -torch.pi**2 * u, atol=1e-5))  # True
```

Two details in this snippet cause most first-week bugs:

- `requires_grad=True` must be set on the **input** tensor, before the forward pass.
- `create_graph=True` is needed for every derivative you intend to differentiate again, including the final backward pass through a physics loss.

## Checking a derivative

Automatic differentiation is exact, but your use of it may not be. The standard test compares against a central difference in double precision:

$$
\left| \frac{f(x + h) - f(x - h)}{2h} - f'_{\text{AD}}(x) \right| \lesssim 10^{-8} \quad \text{for } h \approx 10^{-5}.
$$

## Exercises

1. Draw the computational graph for $y = x_1 e^{x_2} + x_2$ and carry out reverse mode by hand at $(x_1, x_2) = (1, 0)$.
2. Modify the snippet to verify that $u = e^{-\pi^2 t}\sin(\pi x)$ satisfies $u_t = u_{xx}$ at random points $(x, t)$.
3. Remove `create_graph=True` from the first call. Read the error message and explain it.
