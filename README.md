# AwesomeJS Monorepo

A **monorepo for frontend JS libraries** built to align with the [BeamJS](https://github.com/QuaNode/beamjs) roadmap of **unified developer experiences**.

This repo hosts:
- Angular libraries (e.g., `@awesome/charts`)
- Future React/Vue/Svelte packages
- Demo applications showing integration patterns
- A modular structure compatible with BeamJS workflows, services, and behaviors

---

## Roadmap

BeamJS emphasize:
- **Unified abstractions** across tools, databases, and AI behaviors
- **Composable workflows** (functional chaining, services, contexts)
- **Cross-framework interoperability**

This monorepo adopts that roadmap for frontend development:
- Each library is to support the tech-agnostic objective
- Demos live in `examples/`
- Libraries live in `packages/`
- Shared configs keep things lightweight and easy to extend

---

## Repository Layout

```
packages/
  charts/        → Angular charts library
dist/
  charts/        → Build output of charts library
examples/
  charts/        → Angular demo app
```

---

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- PowerShell (Windows) or any POSIX shell (macOS/Linux)

---

## Getting Started

1. **Install dependencies**
   ```bash
   cd packages/charts && npm ci
   cd ../../examples/charts && npm ci
   ```

2. **Build the library**
   ```bash
   cd packages/charts && npm run build
   ```

3. **Run the demo app**
   ```bash
   cd ../../examples/charts && npm start
   ```

---

## Usage Example

```ts
import { echartsBaseModel, echartsDerivativeModel, LLMService } from '@awesome/charts';
```

---

## Adding a New Package

1. Create `packages/<new-lib>` with:
   - `package.json`
   - Build config (`ng-package.json` or equivalent for React/Vue)
   - `src/public-api.ts` or `src/index.ts`

2. Create `examples/<new-lib>-example` with path mapping:

   ```json
   {
     "compilerOptions": {
       "paths": { "@awesome/<new-lib>": ["../../dist/<new-lib>"] }
     }
   }
   ```

3. Build & run.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for coding standards, workflows, and PR guidelines.

---

## License

MIT