import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";

/**
 * Arguments for the ArgoCD component.
 */
export interface ArgoCDComponentArgs {
    /**
     * The Git repository URL to sync applications from.
     * Example: "https://github.com/myorg/myrepo"
     */
    repoUrl: pulumi.Input<string>;

    /**
     * The Git branch to sync from.
     * Default: "main"
     */
    branch?: pulumi.Input<string>;

    /**
     * The path within the repository to sync from.
     * Default: "."
     */
    path?: pulumi.Input<string>;

    /**
     * The Kubernetes provider to use for deploying ArgoCD.
     * If not specified, uses the default provider.
     */
    provider?: k8s.Provider;
}

/**
 * ArgoCD Component Resource
 * 
 * Deploys ArgoCD to a Kubernetes cluster with an app-of-apps pattern.
 * This component:
 * - Creates an 'argocd' namespace
 * - Deploys the ArgoCD Helm chart
 * - Deploys the argocd-apps Helm chart with app-of-apps configuration
 * - Configures automated sync with pruning and self-healing
 */
export class ArgoCDComponent extends pulumi.ComponentResource {
    /**
     * The ArgoCD namespace.
     */
    public readonly namespace: k8s.core.v1.Namespace;

    /**
     * The ArgoCD Helm release.
     */
    public readonly argoCDRelease: k8s.helm.v3.Release;

    /**
     * The ArgoCD apps Helm release.
     */
    public readonly argoAppsRelease: k8s.helm.v3.Release;

    /**
     * The server URL for accessing ArgoCD.
     */
    public readonly serverUrl: pulumi.Output<string>;

    constructor(name: string, args: ArgoCDComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("ediri:argocd:ArgoCDComponent", name, {}, opts);

        const defaultOpts = { parent: this, provider: args.provider };

        // Set default values
        const branch = args.branch || "main";
        const path = args.path || ".";

        // Create the argocd namespace
        this.namespace = new k8s.core.v1.Namespace("argocd-namespace", {
            metadata: {
                name: "argocd",
            },
        }, defaultOpts);

        // Deploy ArgoCD Helm chart
        this.argoCDRelease = new k8s.helm.v3.Release("argocd", {
            chart: "argo-cd",
            version: "7.7.11",
            namespace: this.namespace.metadata.name,
            repositoryOpts: {
                repo: "oci://ghcr.io/argoproj/argo-helm",
            },
            values: {
                // Enable server-side apply
                configs: {
                    params: {
                        "application.resourceTrackingMethod": "annotation+label",
                    },
                },
                // Configure server
                server: {
                    service: {
                        type: "LoadBalancer",
                    },
                },
            },
            skipAwait: false,
        }, defaultOpts);

        // Read the argocd-initial-objects.yaml file
        const valuesYaml = pulumi.all([args.repoUrl, branch, path]).apply(([repoUrl, branchVal, pathVal]) => {
            return {
                applications: [
                    {
                        name: "app-of-apps",
                        namespace: "argocd",
                        project: "default",
                        source: {
                            repoURL: repoUrl,
                            targetRevision: branchVal,
                            path: pathVal,
                            directory: {
                                recurse: true,
                                exclude: "{values*.yaml,**/dashboards/**,**/policies/**,**/provider-configs/**}",
                            },
                        },
                        destination: {
                            server: "https://kubernetes.default.svc",
                            namespace: "argocd",
                        },
                        syncPolicy: {
                            automated: {
                                prune: true,
                                selfHeal: true,
                            },
                            syncOptions: [
                                "ServerSideApply=true",
                                "CreateNamespace=true",
                            ],
                        },
                    },
                ],
            };
        });

        // Deploy argocd-apps Helm chart with app-of-apps configuration
        this.argoAppsRelease = new k8s.helm.v3.Release("argocd-apps", {
            chart: "argocd-apps",
            version: "2.0.2",
            namespace: this.namespace.metadata.name,
            repositoryOpts: {
                repo: "oci://ghcr.io/argoproj/argo-helm",
            },
            values: valuesYaml,
            skipAwait: false,
        }, {
            ...defaultOpts,
            dependsOn: [this.argoCDRelease],
        });

        // Get the ArgoCD server service
        const argocdService = k8s.core.v1.Service.get("argocd-server", 
            pulumi.interpolate`${this.namespace.metadata.name}/argocd-server`,
            { 
                ...defaultOpts,
                dependsOn: [this.argoCDRelease],
            }
        );

        // Get the ArgoCD server URL from the LoadBalancer
        this.serverUrl = argocdService.status.apply(status => {
            const ingress = status?.loadBalancer?.ingress?.[0];
            if (ingress?.hostname) {
                return `http://${ingress.hostname}`;
            } else if (ingress?.ip) {
                return `http://${ingress.ip}`;
            }
            return "pending";
        });

        this.registerOutputs({
            namespace: this.namespace,
            argoCDRelease: this.argoCDRelease,
            argoAppsRelease: this.argoAppsRelease,
            serverUrl: this.serverUrl,
        });
    }
}
