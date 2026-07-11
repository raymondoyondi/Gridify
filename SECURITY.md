# Security Policy

## Supported Versions

We actively monitor and fix security vulnerabilities in Gridify. Currently, only the latest release on the `main` branch receives active security updates and patches. 

If you are running an older clone or fork, we highly recommend pulling the latest changes from `main` to ensure you have the most secure version of the dashboard.

| Version | Supported          |
| ------- | ------------------ |
| Latest (`main`) | ✅ Supported |
| < Latest | ❌ Unsupported |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.** 

If you discover a security flaw, data exposure risk, or vulnerability in Gridify (especially concerning prompt injection vulnerabilities, local LLM isolation, or AWS S3 credential handling), please report it privately.

### How to Report
1. Email your report to: **your-email@example.com** *(Note to maintainer: Replace this with your actual security contact email)*.
2. Include a detailed description of the vulnerability.
3. Provide clear, step-by-step instructions or a proof-of-concept script to help us reproduce the issue.
4. Mention the environment details (e.g., Docker setup, OS, local Ollama vs. hosted API).

### Our Response Process
- **Acknowledgment:** We will acknowledge receipt of your vulnerability report within 48 hours.
- **Investigation:** We will investigate the issue and determine its validity and severity.
- **Resolution:** If validated, we will work on a fix. We aim to release a patch within 14 days of the initial report, depending on complexity.
- **Disclosure:** We will coordinate with you to publicly disclose the vulnerability once a patch is successfully merged into the `main` branch.

## Gridify Best Practices for Users

Since Gridify runs execution layouts and handles local LLMs, please ensure you follow these safety baselines:
- **Environment Variables:** Never commit your `.env` file or raw AWS/PostgreSQL credentials to public repositories.
- **Network Isolation:** If running Ollama or PostgreSQL via Docker natively, ensure these containers are not exposed to the public internet without proper authentication.
- **Input Sanitization:** Gridify uses Generative AI to map prompts to structures. While we implement validation layers, always review highly complex or untrusted inputs passed to dashboard generators.

Thank you for helping keep Gridify safe for the open-source community!
