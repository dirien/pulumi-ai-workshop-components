import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * Arguments for the ArgoCDComponent.
 */
export interface ArgoCDComponentArgs {
    // Currently no arguments are required, but this interface is needed for component schema generation
}

/**
 * ArgoCDComponent deploys ArgoCD to a Kubernetes cluster using the official Helm chart.
 * 
 * This component:
 * - Creates an 'argocd' namespace
 * - Deploys the ArgoCD Helm chart from oci://ghcr.io/argoproj/argo-helm/argo-cd
 * - Auto-creates namespaces as needed
 * - Uses the default Kubernetes provider
 * - Waits for all resources to be ready before completing
 * 
 * Note: Server-side apply is managed by the Kubernetes provider configuration.
 * To enable it globally, configure the provider with enableServerSideApply: true.
 */
export class ArgoCDComponent extends pulumi.ComponentResource {
    /**
     * Creates a new ArgoCD component.
     * 
     * @param name The unique name of the component resource.
     * @param args Component arguments (currently empty but required for schema generation).
     * @param opts Optional component resource options.
     */
    constructor(name: string, args: ArgoCDComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        // Register this component with the Pulumi engine
        super("ediri:kubernetes:ArgoCDComponent", name, args, opts);

        // Create the argocd namespace
        const namespace = new k8s.core.v1.Namespace(
            "argocd-namespace",
            {
                metadata: {
                    name: "argocd",
                },
            },
            {
                parent: this,
            }
        );

        // Deploy ArgoCD using the official Helm chart
        const argoCDChart = new k8s.helm.v3.Release(
            "argocd",
            {
                chart: "argo-cd",
                repositoryOpts: {
                    repo: "https://argoproj.github.io/argo-helm",
                },
                namespace: namespace.metadata.name,
                // Auto-create namespace if it doesn't exist
                createNamespace: true,
                // Wait for all resources to be ready
                skipAwait: false,
            },
            {
                parent: this,
                dependsOn: [namespace],
            }
        );

        // Register outputs for this component
        this.registerOutputs({
            namespaceName: namespace.metadata.name,
            chartName: argoCDChart.name,
        });
    }
}
