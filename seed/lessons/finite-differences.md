## Replacing derivatives with differences

A computer stores a field at a finite set of points $x_i = i\,\Delta x$. The idea behind **finite differences** is to replace each derivative with a combination of neighbouring values, and Taylor's theorem tells us how much we lose.

Expanding around $x$:

$$
u(x \pm \Delta x) = u(x) \pm \Delta x\, u'(x) + \frac{\Delta x^2}{2} u''(x) \pm \frac{\Delta x^3}{6} u'''(x) + \mathcal{O}(\Delta x^4).
$$

From this we can read off three standard formulas.

| Name | Formula | Truncation error |
| --- | --- | --- |
| Forward difference | $\dfrac{u_{i+1} - u_i}{\Delta x}$ | $\mathcal{O}(\Delta x)$ |
| Central difference | $\dfrac{u_{i+1} - u_{i-1}}{2\Delta x}$ | $\mathcal{O}(\Delta x^2)$ |
| Second derivative | $\dfrac{u_{i+1} - 2u_i + u_{i-1}}{\Delta x^2}$ | $\mathcal{O}(\Delta x^2)$ |

The exponent is the **order of accuracy**. Halving $\Delta x$ halves the error of a first-order formula and quarters the error of a second-order one.

## Measuring the order

Never take the order of a method on trust. Measure it: compute the error for a sequence of grid spacings and look at the slope on a log-log plot.

```python
import numpy as np

f, df = np.sin, np.cos
x0 = 1.0

for dx in [0.1, 0.05, 0.025, 0.0125]:
    forward = (f(x0 + dx) - f(x0)) / dx
    central = (f(x0 + dx) - f(x0 - dx)) / (2 * dx)
    print(f"{dx:7.4f}  {abs(forward - df(x0)):.3e}  {abs(central - df(x0)):.3e}")
```

The observed order between two resolutions is

$$
p \approx \frac{\log\left(E(\Delta x_1) / E(\Delta x_2)\right)}{\log\left(\Delta x_1 / \Delta x_2\right)}.
$$

![Error of forward and central differences against grid spacing](/figures/fd-convergence.svg "Measured errors for d/dx sin(x) at x = 1. The slopes are 1 and 2, until rounding error takes over.")

Notice that the error does not improve for ever. Below a certain $\Delta x$ the subtraction $u_{i+1} - u_{i-1}$ loses significant digits and **rounding error** grows like $\varepsilon / \Delta x$, where $\varepsilon \approx 10^{-16}$ in double precision. Total error is the sum of both effects, so there is an optimal spacing.

> **Verification habit.** A convergence study is the cheapest strong test you have. If the measured order is not the theoretical one, there is a bug, and it is almost always in the boundary treatment.

## Exercises

1. Add the two Taylor expansions above to derive the second-derivative formula and its leading error term.
2. Run the script and compute the observed order for each column.
3. Derive a second-order *one-sided* approximation of $u'(x_0)$ using $u_0$, $u_1$ and $u_2$. Where would you need it?
