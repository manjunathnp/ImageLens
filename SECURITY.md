# Security Policy

## Supported Version

Security fixes are applied to the latest version on the default branch.

## Reporting a Vulnerability

Please do not disclose a security issue in a public GitHub issue. Report it privately to the repository owner through GitHub or the contact options at [manjunathnp.in](https://manjunathnp.in).

Include the affected version, reproduction steps, expected impact, and any relevant logs with secrets removed. Do not include credentials, session cookies, private report exports, or customer data.

## Operational Guidance

ImageLens drives a real browser and makes requests to target websites. Run it only against systems you are authorized to test. Use a suitable test account for signed-in workflows and review exported reports before sharing them because they may include target URLs, DOM evidence, and captured previews.

The application server binds to the loopback interface. Do not expose it directly to a public network without a separate authentication, authorization, isolation, and deployment design.
