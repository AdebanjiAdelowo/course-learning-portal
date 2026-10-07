import type { SeedCourse } from "./types";

/**
 * Demo course. Everything a student sees comes from this file and the Markdown in
 * `seed/lessons`. Replace both to publish your own course, then run `npm run seed:content`.
 *
 * Text containing LaTeX uses String.raw so that backslashes survive.
 */
const md = String.raw;

export const course: SeedCourse = {
  slug: "scientific-machine-learning",
  title: "Foundations of Scientific Machine Learning",
  subtitle: "From finite differences to neural operators, with verification at every step",
  description:
    "An eight-week graduate course on combining numerical analysis with deep learning. You will build classical solvers, physics-informed networks and operator surrogates, and learn to verify each one against a reference solution.",
  level: "Graduate",
  durationWeeks: 8,
  outcomes: [
    "Discretise a PDE with finite differences and demonstrate its order of accuracy",
    "Explain how automatic differentiation makes physics-informed losses possible",
    "Train a physics-informed network and diagnose its common failure modes",
    "Build and evaluate a neural-operator surrogate for a parametric PDE",
    "Report accuracy, cost and limitations in a way another researcher can check",
  ],
  prerequisites: [
    "Multivariable calculus and linear algebra",
    "Working knowledge of Python and NumPy",
    "A first course in differential equations",
    "Some exposure to PyTorch is helpful but not required",
  ],
  instructor: {
    email: "instructor@example.com",
    fullName: "Dr. Helena Voss",
    timezone: "Europe/Rome",
    bio: "Helena Voss is a computational scientist working on numerical methods for multiphase flow and on learned surrogates for PDE solvers. She has taught numerical analysis and scientific computing at graduate level for nine years. This biography is placeholder text for the demo course.",
  },

  modules: [
    {
      slug: "numerical-foundations",
      title: "Numerical foundations",
      description:
        "The classical toolkit: model equations, finite differences, and the stability conditions every solver, learned or not, has to respect.",
      requiresPrevious: false,
      lessons: [
        {
          slug: "differential-equations-as-models",
          title: "Differential equations as models",
          summary:
            "What it means to pose a PDE problem properly, and the reference solution we will measure everything against.",
          durationMinutes: 20,
          objectives: [
            "Classify the heat, advection and Poisson equations by their behaviour",
            "State the three conditions for a well-posed problem",
            "Verify an analytical solution by substitution",
          ],
          resources: [
            {
              title: "Heat-equation reference solution (CSV)",
              description: "The exact solution sampled on a 21 by 11 grid in x and t.",
              kind: "dataset",
              url: "/resources/heat-reference-solution.csv",
            },
          ],
        },
        {
          slug: "finite-differences",
          title: "Finite differences and discretisation error",
          summary: "Deriving difference formulas from Taylor series and measuring their order of accuracy.",
          durationMinutes: 25,
          objectives: [
            "Derive forward, central and second-derivative formulas",
            "Run a convergence study and compute the observed order",
            "Explain why the error rises again for very small grid spacing",
          ],
          resources: [
            {
              title: "Finite-difference reference sheet",
              description: "Formulas, stability limits and the observed-order calculation on one page.",
              kind: "pdf",
              url: "/resources/finite-difference-reference-sheet.pdf",
            },
            {
              title: "LeVeque: Finite Difference Methods for Ordinary and Partial Differential Equations",
              description: "Chapters 1 and 2 cover this lesson in depth.",
              kind: "reading",
              url: "https://faculty.washington.edu/rjl/fdmbook/",
            },
          ],
        },
        {
          slug: "stability-and-cfl",
          title: "Stability and the CFL condition",
          summary: "Why an accurate scheme can still blow up, and how von Neumann analysis predicts it.",
          durationMinutes: 30,
          objectives: [
            "Derive the amplification factor of the FTCS scheme",
            "State the stability limits for explicit diffusion and advection schemes",
            "Use the Lax equivalence theorem to connect consistency, stability and convergence",
          ],
        },
      ],
      quiz: {
        slug: "numerical-foundations-quiz",
        title: "Numerical foundations check",
        description: "Five questions on well-posedness, order of accuracy and stability.",
        passPercent: 70,
        questions: [
          {
            type: "multiple_choice",
            prompt: md`What is the truncation error of the central difference $\dfrac{u_{i+1} - u_{i-1}}{2\Delta x}$ as an approximation of $u'(x_i)$?`,
            options: [md`$\mathcal{O}(\Delta x)$`, md`$\mathcal{O}(\Delta x^2)$`, md`$\mathcal{O}(\Delta x^3)$`, md`$\mathcal{O}(1)$`],
            answer: 1,
            explanation: md`The odd-order terms of the two Taylor expansions cancel, so the leading error is $\frac{\Delta x^2}{6} u'''(x_i)$.`,
          },
          {
            type: "true_false",
            prompt: "A consistent finite-difference scheme always converges to the true solution as the grid is refined.",
            answer: false,
            explanation:
              "Consistency alone is not enough. By the Lax equivalence theorem a consistent scheme for a well-posed linear problem converges if and only if it is also stable.",
          },
          {
            type: "short_answer",
            prompt: md`For the FTCS scheme applied to $u_t = \alpha u_{xx}$, what is the largest stable value of $r = \alpha\,\Delta t / \Delta x^2$? Answer as a decimal.`,
            accepted: ["0.5", "1/2"],
            explanation: md`The amplification factor is $G = 1 - 4r\sin^2(k\Delta x/2)$. Requiring $|G| \le 1$ for every wavenumber gives $r \le \tfrac{1}{2}$.`,
          },
          {
            type: "multiple_select",
            prompt: "Which of the following does Hadamard's definition of a well-posed problem require?",
            options: [
              "A solution exists",
              "The solution is unique",
              "The solution depends continuously on the data",
              "The solution is infinitely differentiable",
              "The solution can be written in closed form",
            ],
            answers: [0, 1, 2],
            explanation:
              "Existence, uniqueness and continuous dependence on the data. Smoothness and a closed-form expression are not required: most well-posed problems have neither.",
            points: 2,
          },
          {
            type: "multiple_choice",
            prompt: md`You halve $\Delta x$ in an FTCS heat-equation solver and keep $r$ fixed. How does the time step change?`,
            options: ["It stays the same", "It is halved", "It is divided by four", "It is doubled"],
            answer: 2,
            explanation: md`$\Delta t = r\,\Delta x^2 / \alpha$, so halving $\Delta x$ divides $\Delta t$ by four. This quadratic restriction is why explicit diffusion solvers become expensive on fine grids.`,
          },
        ],
      },
      project: {
        slug: "verified-heat-solver",
        title: "A verified 1D heat-equation solver",
        summary: "Implement FTCS, demonstrate second-order convergence in space, and locate the stability limit numerically.",
        description: md`Build an explicit finite-difference solver for

$$
u_t = \alpha\, u_{xx}, \qquad x \in (0, 1), \quad u(0, t) = u(1, t) = 0, \quad u(x, 0) = \sin(\pi x),
$$

and verify it against the analytical solution $u = e^{-\alpha\pi^2 t}\sin(\pi x)$.

The point of the project is not the solver, which is a few lines, but the **evidence** that it is correct. A reader should be able to look at your convergence table and stability experiment and be convinced without reading the code.`,
        objectives: [
          "Implement the FTCS scheme with Dirichlet boundary conditions",
          "Measure the observed order of accuracy from a grid-refinement study",
          "Demonstrate the stability limit experimentally",
        ],
        requirements: [
          "A convergence table for at least four grid sizes at fixed r, with the observed order between successive grids",
          "A plot or table showing stable behaviour for r below 0.5 and growth above it",
          "Errors reported in the relative L2 norm at a stated final time",
          "A short README explaining how to reproduce every number",
        ],
        submissionInstructions:
          "Push your notebook or scripts to a repository and paste the link below. Include the commit hash in your notes if you keep working after submitting.",
        rubric: [
          { criterion: "Correctness", description: "The solver reproduces the reference solution and the boundary conditions hold exactly.", points: 30 },
          { criterion: "Convergence study", description: "Observed order is computed correctly and matches theory, or the discrepancy is explained.", points: 30 },
          { criterion: "Stability experiment", description: "The limit is located and connected to the von Neumann analysis.", points: 20 },
          { criterion: "Reproducibility", description: "Another student can run the code and obtain the same numbers.", points: 20 },
        ],
        dueInDays: -10,
        resources: [
          {
            title: "Project 1 starter notebook",
            description: "Scaffold with the reference solution and the convergence loop.",
            kind: "notebook",
            url: "/resources/project-1-heat-solver-starter.ipynb",
          },
        ],
      },
    },

    {
      slug: "networks-as-approximators",
      title: "Neural networks as function approximators",
      description:
        "What networks can represent, how automatic differentiation gives exact derivatives, and why training favours smooth functions.",
      lessons: [
        {
          slug: "universal-approximation",
          title: "Universal approximation in practice",
          summary: "What the theorem promises, what it leaves open, and how activation choice matters for PDEs.",
          durationMinutes: 25,
          videoUrl: "https://www.youtube.com/watch?v=aircAruvnKk",
          objectives: [
            "State the universal approximation theorem and its limits",
            "Compare a network with a classical basis expansion",
            "Choose an activation that is smooth enough for a given PDE",
          ],
        },
        {
          slug: "automatic-differentiation",
          title: "Automatic differentiation",
          summary: "Forward and reverse mode, and how to take derivatives of a network with respect to its inputs.",
          durationMinutes: 30,
          objectives: [
            "Distinguish numerical, symbolic and automatic differentiation",
            "Carry out reverse mode by hand on a small computational graph",
            "Compute second derivatives with respect to inputs in PyTorch",
          ],
          resources: [
            {
              title: "Baydin et al.: Automatic differentiation in machine learning, a survey",
              kind: "reading",
              url: "https://arxiv.org/abs/1502.05767",
            },
            {
              title: "PyTorch autograd mechanics",
              description: "Official notes on how the graph is recorded and freed.",
              kind: "link",
              url: "https://pytorch.org/docs/stable/notes/autograd.html",
            },
            {
              title: "Backpropagation calculus (3Blue1Brown)",
              description: "A visual derivation of the chain rule through a network.",
              kind: "video",
              url: "https://www.youtube.com/watch?v=tIeHLnjs5U8",
            },
          ],
        },
        {
          slug: "training-dynamics-and-spectral-bias",
          title: "Training dynamics and spectral bias",
          summary: "Why networks fit low frequencies first, and what Fourier features do about it.",
          durationMinutes: 30,
          objectives: [
            "Describe spectral bias using the neural tangent kernel",
            "Explain why spectral bias is a problem for PDE solutions with sharp features",
            "Implement Fourier feature inputs and choose their scale",
          ],
          resources: [
            {
              title: "Rahaman et al.: On the spectral bias of neural networks",
              kind: "reading",
              url: "https://arxiv.org/abs/1806.08734",
            },
          ],
        },
      ],
      quiz: {
        slug: "approximation-and-autodiff-quiz",
        title: "Approximation and autodiff check",
        description: "Five questions on universal approximation, automatic differentiation and spectral bias.",
        passPercent: 70,
        questions: [
          {
            type: "multiple_choice",
            prompt: "What does the universal approximation theorem guarantee?",
            options: [
              "Gradient descent finds the best parameters for any continuous target",
              "For any continuous target on a compact set, parameters exist that approximate it to any tolerance",
              "A network of fixed width can represent every continuous function exactly",
              "A trained network generalises to inputs outside the training set",
            ],
            answer: 1,
            explanation:
              "It is an existence result. It says nothing about how wide the network must be, whether training finds the parameters, or how the network behaves between or beyond the training points.",
          },
          {
            type: "true_false",
            prompt: "Reverse-mode automatic differentiation obtains the gradient of a scalar loss with respect to all parameters at a cost comparable to a few evaluations of the loss.",
            answer: true,
            explanation:
              "One backward pass gives the derivative of one output with respect to every input. Its cost is a small constant multiple of the forward pass, independent of the number of parameters.",
          },
          {
            type: "multiple_choice",
            prompt: md`Why is ReLU a poor activation for a network whose loss contains $u_{xx}$?`,
            options: [
              "It is too expensive to evaluate",
              "Its second derivative is zero almost everywhere",
              "It is not a universal approximator",
              "It cannot be differentiated automatically",
            ],
            answer: 1,
            explanation: md`A ReLU network is piecewise linear in its input, so $u_{xx} = 0$ almost everywhere and the PDE residual carries no information about curvature.`,
          },
          {
            type: "multiple_select",
            prompt: "Which of these are reasonable measures against spectral bias?",
            options: [
              "Mapping inputs through Fourier features",
              "Normalising inputs to a standard range",
              "Replacing tanh with ReLU",
              "Training for fewer steps",
            ],
            answers: [0, 1],
            explanation:
              "Fourier features make high frequencies accessible and input normalisation controls the effective frequency of the target. ReLU does not help, and stopping earlier leaves high frequencies even less resolved.",
            points: 2,
          },
          {
            type: "short_answer",
            prompt: "Which keyword argument of `torch.autograd.grad` must be set so that the result can itself be differentiated?",
            accepted: ["create_graph", "create_graph=True", "create_graph = True"],
            explanation:
              "`create_graph=True` records the operations of the derivative computation, which is required for second derivatives and for back-propagating through a physics loss.",
          },
        ],
      },
      project: {
        slug: "fit-a-function-and-its-derivative",
        title: "Fit a function and its derivative",
        summary: "Train a network on a two-scale target, measure the error in the function and in its second derivative, and test one remedy.",
        description: md`Fit the target

$$
g(x) = \sin(2\pi x) + 0.3 \sin(24\pi x), \qquad x \in [0, 1],
$$

with a fully connected tanh network, then with the same network preceded by Fourier features.

For each model report the relative $L^2$ error of $g$ **and** of $g''$, computed by automatic differentiation on a held-out grid. The second derivative is where the difference between the two models becomes visible.`,
        objectives: [
          "Observe spectral bias in a controlled experiment",
          "Compute input derivatives of a network with automatic differentiation",
          "Compare a baseline and a remedy under an equal training budget",
        ],
        requirements: [
          "Both models trained with the same optimiser, step count and three random seeds",
          "Errors in the function and the second derivative, on points not used for training",
          "A plot of the fit at three stages of training for the baseline",
          "One paragraph on how you chose the Fourier feature scale, including values that failed",
        ],
        submissionInstructions:
          "Submit a link to your repository or hosted notebook. Make sure the figures are rendered in the notebook you link.",
        rubric: [
          { criterion: "Experiment design", description: "Equal budgets, fixed seeds and a held-out evaluation grid.", points: 25 },
          { criterion: "Derivative evaluation", description: "Second derivatives computed correctly and checked against the analytical value.", points: 25 },
          { criterion: "Analysis", description: "Results are interpreted in terms of spectral bias; failed settings are reported.", points: 30 },
          { criterion: "Presentation", description: "Clear figures, labelled axes, stated norms.", points: 20 },
        ],
        dueInDays: 5,
      },
    },

    {
      slug: "physics-informed-networks",
      title: "Physics-informed neural networks",
      description:
        "Solving a PDE by minimising its residual: the loss, the sampling, the ways it goes wrong, and how to check the answer.",
      lessons: [
        {
          slug: "the-pinn-loss",
          title: "The PINN loss",
          summary: "Turning a boundary-value problem into an optimisation problem with no labelled data.",
          durationMinutes: 30,
          objectives: [
            "Write the composite loss for a time-dependent PDE",
            "Implement a PDE residual with automatic differentiation",
            "Explain why a small loss does not imply a small error",
          ],
          resources: [
            {
              title: "Raissi, Perdikaris and Karniadakis: Physics-informed neural networks",
              description: "The paper that introduced the method (Journal of Computational Physics, 2019).",
              kind: "reading",
              url: "https://doi.org/10.1016/j.jcp.2018.10.045",
            },
            {
              title: "DeepXDE",
              description: "A widely used open-source library for physics-informed learning.",
              kind: "code",
              url: "https://github.com/lululxvi/deepxde",
            },
          ],
        },
        {
          slug: "collocation-and-constraints",
          title: "Collocation points and hard constraints",
          summary: "Where to sample the residual, and how to make boundary conditions hold exactly.",
          durationMinutes: 25,
          objectives: [
            "Compare uniform, low-discrepancy and residual-adaptive sampling",
            "Construct an ansatz that satisfies initial and boundary conditions exactly",
            "Impose periodic boundaries through the input features",
          ],
        },
        {
          slug: "failure-modes-and-loss-balancing",
          title: "Failure modes and loss balancing",
          summary: "Recognising when a PINN has converged to the wrong answer, and the standard fixes.",
          durationMinutes: 30,
          objectives: [
            "Diagnose gradient imbalance between loss terms",
            "Implement gradient-norm loss balancing",
            "Describe causal weighting and curriculum training",
          ],
          resources: [
            {
              title: "Wang, Teng and Perdikaris: Understanding and mitigating gradient pathologies in PINNs",
              kind: "reading",
              url: "https://arxiv.org/abs/2001.04536",
            },
            {
              title: "Krishnapriyan et al.: Characterizing possible failure modes in PINNs",
              kind: "reading",
              url: "https://arxiv.org/abs/2109.01050",
            },
          ],
        },
        {
          slug: "verification-against-reference",
          title: "Verification against a reference solution",
          summary: "Error norms, manufactured solutions and a protocol for reporting results that others can check.",
          durationMinutes: 25,
          objectives: [
            "Build a test problem with the method of manufactured solutions",
            "Report relative L2 and maximum errors on a held-out grid",
            "Pair every speed figure with the accuracy of the same run",
          ],
        },
      ],
      quiz: {
        slug: "physics-informed-networks-quiz",
        title: "Physics-informed networks check",
        description: "Five questions on the PINN loss, constraints, failure modes and verification.",
        passPercent: 70,
        questions: [
          {
            type: "multiple_choice",
            prompt: "A standard PINN for the heat equation is trained without any solved examples. What supervises it?",
            options: [
              "Labels generated by a finite-difference solver",
              "The PDE residual together with the boundary and initial conditions",
              "A pretrained network for a similar equation",
              "Nothing; the network is used untrained",
            ],
            answer: 1,
            explanation:
              "The loss penalises the PDE residual at collocation points and the mismatch with the boundary and initial data. No solution values in the interior are needed.",
          },
          {
            type: "true_false",
            prompt: "If the PINN loss is very small, the error with respect to the true solution must also be small.",
            answer: false,
            explanation:
              "The loss measures a residual at sampled points. A small residual is compatible with a large error, for example when the network has converged to a different solution of the PDE that violates under-weighted boundary conditions.",
          },
          {
            type: "multiple_choice",
            prompt: md`With the ansatz $u_\theta(x,t) = \sin(\pi x) + t\,x(1-x)\,N_\theta(x,t)$, what is $u_\theta(x, 0)$?`,
            options: [md`$0$`, md`$\sin(\pi x)$, for any $N_\theta$`, md`$N_\theta(x, 0)$`, md`It depends on training`],
            answer: 1,
            explanation: md`At $t = 0$ the second term vanishes identically, so the initial condition holds exactly, whatever the parameters. This is what makes the constraint "hard".`,
          },
          {
            type: "multiple_select",
            prompt: "Which of these are recognised causes of PINN training failure?",
            options: [
              "Gradient imbalance between loss terms",
              "Spectral bias of the network",
              "Training late times before early times are resolved",
              "Using automatic differentiation instead of finite differences",
              "Resampling collocation points during training",
            ],
            answers: [0, 1, 2],
            explanation:
              "Gradient imbalance, spectral bias and violated causality are the three failure modes from the lesson. Automatic differentiation is exact, and resampling points is a helpful default.",
            points: 2,
          },
          {
            type: "short_answer",
            prompt: "Name the verification method in which you choose the exact solution first and derive the forcing term from it.",
            accepted: ["manufactured solutions", "method of manufactured solutions", "manufactured solution", "mms"],
            explanation:
              "The method of manufactured solutions: pick a smooth solution, apply the differential operator to obtain the forcing, and solve the resulting problem, whose exact answer is known by construction.",
          },
        ],
      },
      project: {
        slug: "pinn-advection-diffusion",
        title: "A PINN for advection-diffusion",
        summary: "Solve a one-dimensional advection-diffusion problem with a PINN, verify it, and document where it stops working.",
        description: md`Solve

$$
u_t + c\,u_x = \nu\, u_{xx}, \qquad x \in [0, 2\pi) \ \text{periodic}, \quad u(x, 0) = \sin x,
$$

whose exact solution is $u = e^{-\nu t}\sin(x - ct)$.

Start with $c = 1$, $\nu = 0.1$. Once that is verified, increase $c$ until the method fails, and record the failure. Then apply **one** remedy from Module 3 and report whether it helps.`,
        objectives: [
          "Implement a PINN with exact periodic boundary conditions",
          "Verify the result against the analytical solution in two norms",
          "Characterise a failure and test a remedy under a fixed budget",
        ],
        requirements: [
          "Relative L2 and maximum error on a held-out grid, over at least three seeds",
          "A table of error against advection speed, including the settings where training fails",
          "Wall time and hardware for every reported run",
          "One remedy evaluated with the same training budget as the baseline",
        ],
        submissionInstructions:
          "Submit a repository link. The README should contain the results table and the exact commands used to produce it.",
        rubric: [
          { criterion: "Implementation", description: "Residual, periodic features and training loop are correct.", points: 25 },
          { criterion: "Verification", description: "Errors in two norms, multiple seeds, held-out evaluation.", points: 30 },
          { criterion: "Failure analysis", description: "The failure is located, reported with settings and explained.", points: 25 },
          { criterion: "Reporting", description: "Cost stated; accuracy and speed paired from the same runs.", points: 20 },
        ],
        dueInDays: 19,
      },
    },

    {
      slug: "neural-operators",
      title: "Neural operators",
      description:
        "Learning the map from inputs to solutions, so that a new problem instance costs a forward pass instead of a solve.",
      availableInDays: 10,
      lessons: [
        {
          slug: "from-functions-to-operators",
          title: "From functions to operators",
          summary: "What changes when the unknown is a map between function spaces, and how DeepONet represents one.",
          durationMinutes: 25,
          objectives: [
            "Distinguish learning a solution from learning a solution operator",
            "Explain discretisation invariance",
            "Describe the branch and trunk networks of DeepONet",
          ],
          resources: [
            {
              title: "Lu et al.: DeepONet",
              kind: "reading",
              url: "https://arxiv.org/abs/1910.03193",
            },
          ],
        },
        {
          slug: "fourier-neural-operator",
          title: "The Fourier neural operator",
          summary: "Evaluating the kernel integral in Fourier space, and what mode truncation buys and costs.",
          durationMinutes: 30,
          objectives: [
            "Derive the spectral form of a translation-invariant kernel integral",
            "Implement a two-dimensional spectral convolution layer",
            "State the practical limits of the architecture",
          ],
          resources: [
            {
              title: "Li et al.: Fourier neural operator for parametric PDEs",
              kind: "reading",
              url: "https://arxiv.org/abs/2010.08895",
            },
            {
              title: "neuraloperator library",
              description: "Reference implementations of FNO and related architectures.",
              kind: "code",
              url: "https://github.com/neuraloperator/neuraloperator",
            },
          ],
        },
        {
          slug: "evaluating-surrogates",
          title: "Evaluating surrogates honestly",
          summary: "Splits, metrics, physical checks and cost accounting for learned solvers.",
          durationMinutes: 25,
          objectives: [
            "Design train and test splits that measure generalisation",
            "Report error distributions, not only means",
            "Compute the break-even point of a surrogate against its baseline",
          ],
          resources: [
            {
              title: "Kovachki et al.: Neural operator, learning maps between function spaces",
              kind: "reading",
              url: "https://arxiv.org/abs/2108.08481",
            },
          ],
        },
      ],
      quiz: {
        slug: "neural-operators-quiz",
        title: "Neural operators check",
        description: "Five questions on operator learning, the FNO and evaluation practice.",
        passPercent: 70,
        questions: [
          {
            type: "multiple_choice",
            prompt: "What does a neural operator learn?",
            options: [
              "The solution of one PDE instance",
              "A map from input functions to solution functions",
              "The coefficients of a finite-difference stencil",
              "A time-stepping scheme with a fixed step",
            ],
            answer: 1,
            explanation:
              "The operator maps an input function, such as a coefficient field or an initial condition, to the corresponding solution, so a new instance needs only a forward pass.",
          },
          {
            type: "true_false",
            prompt: "The number of parameters in an FNO spectral layer grows with the resolution of the grid it is applied to.",
            answer: false,
            explanation:
              "Only a fixed number of Fourier modes is retained, so the weight tensors have the same size on every grid. This is what allows evaluation at resolutions other than the training one.",
          },
          {
            type: "multiple_choice",
            prompt: "In DeepONet, what is the input to the branch network?",
            options: [
              "The coordinates of the query point",
              "The input function sampled at fixed sensor locations",
              "The PDE residual",
              "The output of the trunk network",
            ],
            answer: 1,
            explanation:
              "The branch network encodes the input function from its values at the sensors. The trunk network takes the query coordinates, and the prediction is the inner product of the two outputs.",
          },
          {
            type: "multiple_select",
            prompt: "Which of these belong in an honest report on a surrogate model?",
            options: [
              "A fixed train and test split, saved with the results",
              "The worst-case error as well as the mean",
              "The cost of data generation and training",
              "A baseline timed on the same hardware",
              "Only the best of several random seeds",
            ],
            answers: [0, 1, 2, 3],
            explanation:
              "A reader needs the split, the error distribution, the full cost and a fair baseline. Reporting only the best seed hides the variability of training.",
            points: 2,
          },
          {
            type: "short_answer",
            prompt: "Data generation and training take 2 hours in total. The classical solver needs 3.6 s per sample and the surrogate's inference time is negligible. How many solves are needed to break even?",
            accepted: ["2000", "2,000", "2000 solves"],
            explanation: md`Two hours is $7200$ s, and each surrogate evaluation saves $3.6$ s, so the break-even point is $7200 / 3.6 = 2000$ solves.`,
          },
        ],
      },
      project: {
        slug: "darcy-flow-surrogate",
        title: "Capstone: a surrogate for Darcy flow",
        summary: "Train an operator model for two-dimensional Darcy flow and deliver an evaluation another researcher could audit.",
        description: md`Learn the map from permeability $a(x)$ to pressure $u(x)$ for

$$
-\nabla \cdot \left( a(x)\, \nabla u(x) \right) = 1 \quad \text{in } (0, 1)^2, \qquad u = 0 \ \text{on the boundary}.
$$

Generate your own data with a finite-difference solver, or use a public Darcy dataset, and train an FNO or DeepONet.

The deliverable is a short report following the template from the last lesson. Its most important section is **Known failures**.`,
        objectives: [
          "Train a neural operator on a parametric elliptic PDE",
          "Evaluate it in and out of distribution, and at a second resolution",
          "Account for the full cost and compute the break-even point",
        ],
        requirements: [
          "A fixed, saved train and test split and at least three seeds",
          "Mean, median, 95th percentile and worst-case relative L2 error",
          "Evaluation at a resolution different from the training one, against a solver run at that resolution",
          "Inference and baseline timings from the same hardware, each paired with its accuracy",
          "A section listing inputs on which the model performs poorly",
        ],
        submissionInstructions:
          "Submit a repository link containing the report (Markdown or PDF), the training configuration and the evaluation script.",
        rubric: [
          { criterion: "Model and training", description: "A working operator model with a documented configuration.", points: 20 },
          { criterion: "Evaluation design", description: "Meaningful splits, error distribution, resolution test.", points: 30 },
          { criterion: "Cost accounting", description: "Break-even analysis with a fair baseline.", points: 20 },
          { criterion: "Limitations", description: "Failures are found, shown and discussed.", points: 20 },
          { criterion: "Reproducibility", description: "Seeds, split indices and commands are provided.", points: 10 },
        ],
        dueInDays: 40,
      },
    },
  ],

  liveSessions: [
    {
      title: "Kick-off seminar: how the course works",
      description: "Course structure, the verification habit, and a walkthrough of Project 1.",
      startsInDays: -21,
      startTime: "17:00",
      durationMinutes: 60,
      timezone: "Europe/Rome",
      moduleSlug: "numerical-foundations",
      recordingUrl: "https://video.example.com/recordings/kick-off-seminar",
      slidesUrl: "/resources/session-1-slides.pdf",
      notes: md`**Main points**

- Each module ends with a quiz (pass mark 70%) and a project reviewed against a rubric.
- Modules unlock once the lessons of the previous module are complete.
- Every numerical result in a project needs a reference to compare against.

**Questions raised**

1. *Can projects be done in JAX?* Yes. The lessons use PyTorch, but any framework with automatic differentiation is accepted.
2. *How strict are deadlines?* Late work is still reviewed. Tell us in advance if you need more time.`,
      resources: [
        {
          title: "Finite-difference reference sheet",
          description: "Handed out during the seminar.",
          kind: "pdf",
          url: "/resources/finite-difference-reference-sheet.pdf",
        },
      ],
    },
    {
      title: "Office hours: convergence studies",
      description: "Open session on Project 1. We debugged two boundary-condition errors live.",
      startsInDays: -9,
      startTime: "17:00",
      durationMinutes: 45,
      timezone: "Europe/Rome",
      moduleSlug: "numerical-foundations",
      recordingUrl: "https://video.example.com/recordings/office-hours-convergence",
      notes: md`The two bugs we found, both common:

- The boundary rows were updated with the interior formula, which reduced the observed order to one.
- The error was measured at a time that was not a multiple of $\Delta t$, so the comparison was against the wrong reference time.`,
    },
    {
      title: "Seminar: automatic differentiation from scratch",
      description: "We build a 60-line reverse-mode engine and use it to differentiate a small network twice.",
      startsInDays: 2,
      startTime: "17:00",
      durationMinutes: 75,
      timezone: "Europe/Rome",
      moduleSlug: "networks-as-approximators",
      meetingUrl: "https://meet.example.com/isocline-seminar",
    },
    {
      title: "Seminar: why PINNs fail, and what to do about it",
      description: "A live reproduction of the advection failure, followed by three remedies compared under one budget.",
      startsInDays: 16,
      startTime: "17:00",
      durationMinutes: 75,
      timezone: "Europe/Rome",
      moduleSlug: "physics-informed-networks",
      meetingUrl: "https://meet.example.com/isocline-seminar",
    },
    {
      title: "Capstone clinic",
      description: "Bring your Darcy-flow evaluation plan for feedback before you start training.",
      startsInDays: 30,
      startTime: "16:00",
      durationMinutes: 90,
      timezone: "Europe/Rome",
      moduleSlug: "neural-operators",
      meetingUrl: "https://meet.example.com/isocline-seminar",
    },
  ],

  announcements: [
    {
      title: "Module 4 opens soon",
      body: "The neural-operator module unlocks on its scheduled date for everyone. If you are ahead, the further reading under **Resources** is a good way in.",
      pinned: true,
      publishedDaysAgo: 1,
    },
    {
      title: "Project 1 feedback is out",
      body: "Reviews for the heat-equation solver have been posted. Common theme: state the final time and the norm next to every error you report.",
      publishedDaysAgo: 4,
    },
    {
      title: "Recording and notes from the kick-off seminar",
      body: "The recording, slides and notes are now under **Live sessions**.",
      publishedDaysAgo: 20,
    },
  ],

  resources: [
    {
      title: "The Turing Way: guide for reproducible research",
      description: "Background reading for the reproducibility criteria used in every project rubric.",
      kind: "reading",
      url: "https://book.the-turing-way.org/reproducible-research/reproducible-research",
    },
  ],
};
