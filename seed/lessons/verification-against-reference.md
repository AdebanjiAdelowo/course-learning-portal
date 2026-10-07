## The question a loss cannot answer

Is the trained network close to the true solution? The loss measures a residual at sampled points. Verification measures the **error**, and requires something to compare against.

## Sources of reference solutions

1. **Analytical solutions**, when they exist. Exact, cheap, limited to simple problems.
2. **Manufactured solutions.** Choose any smooth $u^\star$, compute $f = \mathcal{N}[u^\star]$ symbolically, and solve $\mathcal{N}[u] = f$. The exact answer is $u^\star$ by construction.
3. **A converged classical solver.** Refine a finite difference or finite element solution until it stops changing, and estimate its own error first.

The third option deserves care. A reference is only useful if its error is much smaller than the error you are trying to measure.

## Error norms

Report errors in a stated norm, on a grid that is independent of the training points:

$$
E_{L^2} = \frac{\left\| u_\theta - u \right\|_2}{\left\| u \right\|_2}, \qquad
E_{\infty} = \max_i \left| u_\theta(x_i) - u(x_i) \right|.
$$

The relative $L^2$ error summarises the overall fit. The maximum error exposes localised failures that an average hides. Report both.

```python
import torch

@torch.no_grad()
def errors(model, exact, n=201):
    x = torch.linspace(0, 1, n)
    t = torch.linspace(0, 1, n)
    X, T = torch.meshgrid(x, t, indexing="ij")
    inputs = torch.stack([X.flatten(), T.flatten()], dim=1)
    prediction = model(inputs).squeeze()
    truth = exact(inputs[:, 0], inputs[:, 1])
    relative_l2 = (prediction - truth).norm() / truth.norm()
    max_error = (prediction - truth).abs().max()
    return relative_l2.item(), max_error.item()
```

## A minimal verification protocol

| Step | What to do | Why |
| --- | --- | --- |
| 1 | Fix and record the random seed | Reproducibility |
| 2 | Evaluate on a held-out grid | Collocation points flatter the result |
| 3 | Report relative $L^2$ and maximum error | Average and worst case |
| 4 | Repeat over at least three seeds | Training is stochastic |
| 5 | Report the cost: steps, wall time, hardware | Accuracy without cost is not a comparison |
| 6 | State the baseline and its settings | Shows what the error is being compared with |

## Comparing honestly

A fair comparison between a PINN and a classical solver holds one quantity fixed and reports the other. "The network is faster" means little without the accuracy it achieved; "the network is accurate" means little without the time it took. Pair each speed figure with the error **from the same run**.

> **A common trap.** Quoting the best accuracy from one configuration and the best speed from another describes a method that does not exist.

## Exercises

1. Use the method of manufactured solutions to build a test problem for $-u'' + u = f$ on $[0, 1]$ with $u^\star = \sin(2\pi x)$.
2. Evaluate your heat-equation PINN with the function above over five seeds. Report the mean and standard deviation of both norms.
3. Solve the same problem with FTCS on a $101$-point grid. Record its error and wall time, and write two sentences comparing the two methods.
