# Aaron Tharpe's Portfolio

A lightweight, dependency-free portfolio and résumé site published with GitHub Pages at [aaron.tharpefamily.com](https://aaron.tharpefamily.com/).

## Local development

From the repository root, start any static file server. Python is one convenient option:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`.

## Validation

Run the repository's dependency-free checks before opening a pull request:

```powershell
python tests/site_checks.py
```

The same checks run in GitHub Actions for pull requests and pushes to `main`.

## Deployment

GitHub Pages publishes the root of `main`. Cloudflare proxies `aaron.tharpefamily.com` to `trsturbo.github.io`, so a successful merge to `main` deploys automatically without a separate manual upload.
