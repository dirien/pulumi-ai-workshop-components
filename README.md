# ArgoCD Component

A Pulumi ComponentResource for deploying ArgoCD to Kubernetes clusters with an app-of-apps pattern.

## Overview

This component abstracts the deployment of ArgoCD and configures it with an app-of-apps pattern for GitOps-based application management. It:

- Creates an `argocd` namespace
- Deploys the ArgoCD Helm chart from `oci://ghcr.io/argoproj/argo-helm/argo-cd`
- Deploys the argocd-apps Helm chart with app-of-apps configuration
- Configures automated sync with pruning and self-healing
- Uses server-side apply for better conflict resolution
- Automatically creates namespaces as needed

## Features

- **App-of-Apps Pattern**: Automatically discovers and syncs Kubernetes manifests from a Git repository
- **Automated Sync**: Enables automatic synchronization with pruning and self-healing
- **Smart Exclusions**: Excludes values files, dashboards, policies, and provider configs from sync
- **Server-Side Apply**: Uses Kubernetes server-side apply for improved resource management
- **Configurable**: Supports custom repository URL, branch, and path

## Inputs

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `repoUrl` | `string` | The Git repository URL to sync applications from | **Required** |
| `branch` | `string` | The Git branch to sync from | `"main"` |
| `path` | `string` | The path within the repository to sync from | `"."` |
| `provider` | `k8s.Provider` | The Kubernetes provider to use | Default provider |

## Outputs

| Property | Type | Description |
|----------|------|-------------|
| `namespace` | `k8s.core.v1.Namespace` | The ArgoCD namespace |
| `argoCDRelease` | `k8s.helm.v3.Release` | The ArgoCD Helm release |
| `argoAppsRelease` | `k8s.helm.v3.Release` | The argocd-apps Helm release |
| `serverUrl` | `string` | The ArgoCD server URL (LoadBalancer endpoint) |

## Usage

### Specify Package in `Pulumi.yaml`

Add the following to your `Pulumi.yaml` file:

```yaml
name: my-argocd-project
runtime: nodejs
description: Deploy ArgoCD with app-of-apps

packages:
  argocd-component: git://github.com/dirien/pulumi-ai-workshop-components
```

### Use in Your Pulumi Program

#### TypeScript

```typescript
import * as pulumi from "@pulumi/pulumi";
import { ArgoCDComponent } from "@ediri/argocd-component";

// Deploy ArgoCD with app-of-apps pointing to your GitOps repository
const argocd = new ArgoCDComponent("my-argocd", {
    repoUrl: "https://github.com/myorg/my-gitops-repo",
    branch: "main",
    path: "kubernetes/apps",
});

// Export the ArgoCD server URL
export const argoCDUrl = argocd.serverUrl;
```

#### Python

```python
import pulumi
from ediri_argocd_component import ArgoCDComponent

# Deploy ArgoCD with app-of-apps pointing to your GitOps repository
argocd = ArgoCDComponent("my-argocd",
    repo_url="https://github.com/myorg/my-gitops-repo",
    branch="main",
    path="kubernetes/apps"
)

# Export the ArgoCD server URL
pulumi.export("argoCDUrl", argocd.server_url)
```

#### Go

```go
package main

import (
    argocd "github.com/ediri/argocd-component/sdk/go/argocd"
    "github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
    pulumi.Run(func(ctx *pulumi.Context) error {
        // Deploy ArgoCD with app-of-apps pointing to your GitOps repository
        argocdComponent, err := argocd.NewArgoCDComponent(ctx, "my-argocd", &argocd.ArgoCDComponentArgs{
            RepoUrl: pulumi.String("https://github.com/myorg/my-gitops-repo"),
            Branch:  pulumi.String("main"),
            Path:    pulumi.String("kubernetes/apps"),
        })
        if err != nil {
            return err
        }

        // Export the ArgoCD server URL
        ctx.Export("argoCDUrl", argocdComponent.ServerUrl)
        return nil
    })
}
```

#### C# (.NET)

```csharp
using Pulumi;
using Ediri.ArgoCDComponent;

class MyStack : Stack
{
    public MyStack()
    {
        // Deploy ArgoCD with app-of-apps pointing to your GitOps repository
        var argocd = new ArgoCDComponent("my-argocd", new ArgoCDComponentArgs
        {
            RepoUrl = "https://github.com/myorg/my-gitops-repo",
            Branch = "main",
            Path = "kubernetes/apps"
        });

        // Export the ArgoCD server URL
        this.ArgoCDUrl = argocd.ServerUrl;
    }

    [Output]
    public Output<string> ArgoCDUrl { get; set; }
}
```

#### YAML

```yaml
name: my-argocd-project
runtime: yaml
description: Deploy ArgoCD with app-of-apps

resources:
  argocd:
    type: ediri:argocd:ArgoCDComponent
    properties:
      repoUrl: https://github.com/myorg/my-gitops-repo
      branch: main
      path: kubernetes/apps

outputs:
  argoCDUrl: ${argocd.serverUrl}
```

## App-of-Apps Configuration

The component automatically configures an app-of-apps pattern with the following settings:

- **Recursive Discovery**: Recursively discovers all Kubernetes manifests in the specified path
- **Exclusion Patterns**: Excludes the following file patterns:
  - `values*.yaml` - Helm values files
  - `**/dashboards/**` - Grafana dashboards
  - `**/policies/**` - Policy files
  - `**/provider-configs/**` - Provider configuration files
- **Automated Sync**: Automatically syncs changes from Git
- **Pruning**: Automatically removes resources deleted from Git
- **Self-Healing**: Automatically corrects drift from desired state
- **Server-Side Apply**: Uses Kubernetes server-side apply
- **Auto-Create Namespaces**: Automatically creates namespaces referenced in manifests

## Repository Structure

Your GitOps repository should contain Kubernetes manifests organized in directories. For example:

```
my-gitops-repo/
├── kubernetes/
│   └── apps/
│       ├── app1/
│       │   ├── deployment.yaml
│       │   └── service.yaml
│       ├── app2/
│       │   ├── deployment.yaml
│       │   └── service.yaml
│       └── app3/
│           └── application.yaml
```

## Accessing ArgoCD

After deployment, you can access the ArgoCD UI using the `serverUrl` output:

```bash
# Get the ArgoCD URL
pulumi stack output argoCDUrl

# Get the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

Default credentials:
- Username: `admin`
- Password: Retrieved from the `argocd-initial-admin-secret` secret

## Requirements

- Kubernetes cluster (1.24+)
- Pulumi CLI (3.0+)
- Node.js (14+) for TypeScript/JavaScript
- Appropriate cloud credentials configured

## Advanced Configuration

### Using a Custom Kubernetes Provider

```typescript
import * as k8s from "@pulumi/kubernetes";
import { ArgoCDComponent } from "@ediri/argocd-component";

// Create a custom Kubernetes provider
const k8sProvider = new k8s.Provider("k8s-provider", {
    kubeconfig: myKubeconfig,
});

// Deploy ArgoCD using the custom provider
const argocd = new ArgoCDComponent("my-argocd", {
    repoUrl: "https://github.com/myorg/my-gitops-repo",
    branch: "main",
    path: "kubernetes/apps",
    provider: k8sProvider,
});
```

### Using with Private Git Repositories

For private repositories, you'll need to configure ArgoCD with appropriate credentials after deployment:

```bash
# Add a private repository to ArgoCD
argocd repo add https://github.com/myorg/private-repo \
  --username myuser \
  --password mytoken
```

Or use SSH keys:

```bash
argocd repo add git@github.com:myorg/private-repo.git \
  --ssh-private-key-path ~/.ssh/id_rsa
```

## Troubleshooting

### ArgoCD Server Not Accessible

If the `serverUrl` shows "pending", the LoadBalancer may still be provisioning. Wait a few minutes and check again:

```bash
kubectl -n argocd get svc argocd-server
```

### Applications Not Syncing

Check the ArgoCD application status:

```bash
kubectl -n argocd get applications
argocd app list
argocd app get app-of-apps
```

### Sync Errors

View detailed sync errors in the ArgoCD UI or CLI:

```bash
argocd app sync app-of-apps --dry-run
```

## License

Apache-2.0

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Support

For issues and questions:
- Open an issue in the [GitHub repository](https://github.com/dirien/pulumi-ai-workshop-components)
- Consult the [Pulumi documentation](https://www.pulumi.com/docs/)
- Check the [ArgoCD documentation](https://argo-cd.readthedocs.io/)
