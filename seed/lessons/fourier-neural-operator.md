## Evaluating the integral in Fourier space

The kernel integral of a neural operator layer costs $\mathcal{O}(n^2)$ on $n$ grid points if evaluated directly. The **Fourier neural operator** (FNO) assumes the kernel is translation invariant, $\kappa(x, y) = \kappa(x - y)$. The integral is then a convolution, and convolutions are products in Fourier space:

$$
\left(\mathcal{K} v\right)(x) = \mathcal{F}^{-1}\!\left( R_\theta(k) \cdot \mathcal{F}[v](k) \right)(x).
$$

The learned parameters are the complex weights $R_\theta(k)$, one matrix per retained wavenumber. With the fast Fourier transform the cost falls to $\mathcal{O}(n \log n)$.

## Architecture

1. **Lift.** A pointwise layer $P$ raises the input $a(x)$, concatenated with the coordinates, to $d_v$ channels.
2. **Fourier layers.** Repeat $L$ times:
   $$
   v_{l+1}(x) = \sigma\!\left( W_l\, v_l(x) + \mathcal{F}^{-1}\!\left( R_l \cdot \mathcal{F}[v_l] \right)(x) \right).
   $$
3. **Project.** A pointwise layer $Q$ maps back to the output dimension.

Only the lowest $k_{\max}$ modes in each direction are kept. Truncation is what makes the parameter count independent of the grid, and it is the key hyperparameter.

| Hyperparameter | Typical value | Effect of increasing it |
| --- | --- | --- |
| Modes $k_{\max}$ | 12 to 24 | Resolves finer features; more parameters, more overfitting |
| Width $d_v$ | 32 to 64 | More capacity per mode |
| Layers $L$ | 4 | Deeper nonlinear interaction |

## One spectral layer

```python
import torch
from torch import nn

class SpectralConv2d(nn.Module):
    def __init__(self, channels: int, modes: int):
        super().__init__()
        self.modes = modes
        scale = 1 / channels**2
        shape = (channels, channels, modes, modes)
        self.w_pos = nn.Parameter(scale * torch.randn(*shape, dtype=torch.cfloat))
        self.w_neg = nn.Parameter(scale * torch.randn(*shape, dtype=torch.cfloat))

    def forward(self, v: torch.Tensor) -> torch.Tensor:
        batch, channels, nx, ny = v.shape
        m = self.modes
        v_hat = torch.fft.rfft2(v)
        out = torch.zeros(batch, channels, nx, ny // 2 + 1, dtype=torch.cfloat, device=v.device)
        out[:, :, :m, :m] = torch.einsum("bixy,ioxy->boxy", v_hat[:, :, :m, :m], self.w_pos)
        out[:, :, -m:, :m] = torch.einsum("bixy,ioxy->boxy", v_hat[:, :, -m:, :m], self.w_neg)
        return torch.fft.irfft2(out, s=(nx, ny))
```

Nothing in this layer depends on `nx` or `ny` except the transforms. The same weights apply to any grid at least $2 k_{\max}$ points wide, which is how an FNO trained at one resolution can be evaluated at another.

## Limits to keep in mind

- **Periodicity.** The FFT assumes a periodic field. For other boundary conditions the domain is usually padded, which works in practice but is not exact.
- **Regular grids.** The basic FNO needs a uniform rectangular grid. Complex geometries need extensions such as geometry-aware variants or graph-based operators.
- **Zero-shot super-resolution is not free.** A model evaluated at a finer grid can only reproduce frequencies up to $k_{\max}$. Always measure the error at the new resolution against a solver run at that resolution.

## Exercises

1. Count the parameters of one `SpectralConv2d` layer with 32 channels and 12 modes. How does the count change if the grid is refined from $64^2$ to $256^2$?
2. Why are two weight tensors needed for a real-valued two-dimensional transform?
3. A model trained with $k_{\max} = 12$ is evaluated on data with significant energy at wavenumber 30. What do you expect, and how would you confirm it?
