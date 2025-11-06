# ArgoCD Component

A Pulumi ComponentResource for deploying ArgoCD to Kubernetes clusters using the official Helm chart.

## Features

- Deploys ArgoCD from the official OCI Helm chart (`oci://ghcr.io/argoproj/argo-helm/argo-cd`)
- Automatically creates the `argocd` namespace
- Uses the latest version of the ArgoCD Helm chart
- Waits for all resources to be ready before completing
- Compatible with Pulumi Kubernetes provider v4

## Usage

### TypeScript

```typescript
import { ArgoCDComponent } from "@ediri/argocd-component";

const argocd = new ArgoCDComponent("my-argocd");
```

### Python

```python
from ediri_argocd_component import ArgoCDComponent

argocd = ArgoCDComponent("my-argocd")
```

### Go

```go
import (
    argocd "github.com/dirien/pulumi-ai-workshop-components"
)

argocdComponent, err := argocd.NewArgoCDComponent(ctx, "my-argocd", nil)
```

### C#

```csharp
using Ediri.ArgoCDComponent;

var argocd = new ArgoCDComponent("my-argocd");
```

## Configuration

This component uses the default Kubernetes provider. Ensure your Kubernetes context is configured correctly before deploying.

### Server-Side Apply

To enable server-side apply for all resources managed by the Kubernetes provider, configure the provider with:

```typescript
import * as k8s from "@pulumi/kubernetes";

const provider = new k8s.Provider("k8s-provider", {
    enableServerSideApply: true,
});

const argocd = new ArgoCDComponent("my-argocd", {
    provider: provider,
});
```

## Requirements

- Pulumi CLI v3.0.0 or later
- Kubernetes cluster with appropriate permissions
- Pulumi Kubernetes provider v4.0.0 or later

## What Gets Deployed

This component creates:
- A Kubernetes namespace named `argocd`
- ArgoCD Helm release with all standard ArgoCD components:
  - ArgoCD Server
  - ArgoCD Application Controller
  - ArgoCD Repo Server
  - ArgoCD Redis
  - ArgoCD Dex Server (optional)
  - ArgoCD Notifications Controller (optional)

## Accessing ArgoCD

After deployment, you can access the ArgoCD UI by port-forwarding:

```bash
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

Then access the UI at `https://localhost:8080`.

The default admin password can be retrieved with:

```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

## License

Apache-2.0
